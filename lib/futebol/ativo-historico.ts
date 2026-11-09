// Import relativo (não o alias "@/...") pro `nomeDaContaAtual` — mesmo motivo de
// `lib/futebol/financeiro.ts`/`contrato.ts`: o alias não resolve no vitest pra um import de valor
// (em runtime), só pra `import type`.
import type { createClient } from "@/lib/supabase/server";
import { nomeDaContaAtual } from "../auth/perfis";
import type { AtletaAtivoHistoricoRow } from "@/lib/supabase/types";

/**
 * Linha do tempo de ativo/inativo do atleta (Profissional e Base) — ver docs/superpowers/specs/
 * 2026-11-04-atletas-desativacao-transicao-pagamento-design.md. Espelha a estrutura de
 * `lib/futebol/status-historico.ts`, mas é um eixo independente: `atletas.ativo` é
 * ativo/inativo (fica de fora de listas/convocação por padrão), diferente de `atletas.status`
 * (liberado/departamento médico/transição/dispensado) — os dois históricos não se cruzam.
 */

export const MOTIVO_DESATIVACAO_ATLETA_OPTIONS = [
  { value: "rescisao_contrato", label: "Rescisão de contrato" },
  { value: "fim_contrato", label: "Fim de contrato (não renovado)" },
  { value: "transferencia_venda", label: "Transferência/venda para outro clube" },
  { value: "emprestimo", label: "Empréstimo para outro clube" },
  { value: "outro", label: "Outro" },
] as const;

export type MotivoDesativacaoAtleta = (typeof MOTIVO_DESATIVACAO_ATLETA_OPTIONS)[number]["value"];

type LinhaOrdenavelAtivo = Pick<AtletaAtivoHistoricoRow, "ativo" | "data" | "created_at">;

/** A linha "atual": maior `data`; empate resolvido pelo `created_at` mais recente — mesmo critério
 * de `linhaMaisRecente` em `status-historico.ts`. `null` numa lista vazia. */
export function linhaMaisRecenteAtivo<T extends LinhaOrdenavelAtivo>(linhas: T[]): T | null {
  if (linhas.length === 0) return null;
  return linhas.reduce((atual, linha) => {
    if (linha.data > atual.data) return linha;
    if (linha.data < atual.data) return atual;
    return linha.created_at > atual.created_at ? linha : atual;
  });
}

export interface LinhaAtivoHistoricoComDias extends AtletaAtivoHistoricoRow {
  /** Dias nesse estado (ativo ou inativo): diferença entre a `data` desta linha e a da próxima (ou
   * hoje, se for a mais recente) — mesmo cálculo de `calcularLinhaDoTempo`. */
  dias: number;
}

/** Ordena mais recente primeiro e calcula `dias` de cada linha — mesma lógica de
 * `calcularLinhaDoTempo` em `status-historico.ts`. */
export function calcularLinhaDoTempoAtivo(
  linhas: AtletaAtivoHistoricoRow[],
  hojeStr: string,
): LinhaAtivoHistoricoComDias[] {
  const cronologica = [...linhas].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? -1 : 1;
    return a.created_at < b.created_at ? -1 : 1;
  });

  const comDias: LinhaAtivoHistoricoComDias[] = cronologica.map((linha, i) => {
    const proxima = cronologica[i + 1];
    const fimStr = proxima ? proxima.data : hojeStr;
    const inicio = new Date(`${linha.data}T00:00:00Z`).getTime();
    const fim = new Date(`${fimStr}T00:00:00Z`).getTime();
    const dias = Math.max(0, Math.round((fim - inicio) / (1000 * 60 * 60 * 24)));
    return { ...linha, dias };
  });

  return comDias.reverse();
}

/**
 * Grava uma linha nova no histórico (resolvendo quem lançou a partir de quem está logado — nunca
 * um campo escolhido) e, só se ela for a mais recente depois de gravada, atualiza `atletas.ativo`
 * pra combinar — mesmo padrão de `registrarStatusAtleta`/`recomputarStatusAtual`.
 */
export async function registrarAtivoAtleta(
  supabase: ReturnType<typeof createClient>,
  atletaId: string,
  ativo: boolean,
  motivo: string | null,
  observacao: string | null,
  data: string,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nome = await nomeDaContaAtual(supabase);

  const { error } = await supabase.from("atletas_ativo_historico").insert({
    atleta_id: atletaId,
    ativo,
    motivo,
    observacao,
    data,
    criado_por_perfil_id: user?.id ?? null,
    criado_por_nome: nome,
  });
  if (error) return { error: `Não foi possível registrar. Tente novamente. (${error.message})` };

  await recomputarAtivoAtual(supabase, atletaId);
  return {};
}

/** Relê todo o histórico do atleta e atualiza `atletas.ativo` pra combinar com a linha mais
 * recente — chamada depois de gravar uma linha nova. */
export async function recomputarAtivoAtual(
  supabase: ReturnType<typeof createClient>,
  atletaId: string,
): Promise<void> {
  const { data } = await supabase
    .from("atletas_ativo_historico")
    .select("ativo, data, created_at")
    .eq("atleta_id", atletaId);

  const atual = linhaMaisRecenteAtivo((data ?? []) as LinhaOrdenavelAtivo[]);
  if (!atual) return;

  await supabase.from("atletas").update({ ativo: atual.ativo }).eq("id", atletaId);
}
