import type { createClient } from "@/lib/supabase/server";
import { nomeDaContaAtual } from "@/lib/auth/perfis";
import type { AtletaBaseStatus, AtletaBaseStatusHistoricoRow } from "@/lib/supabase/types";

/**
 * Linha do tempo de status do atleta (Futebol de Base) — espelha `lib/futebol/status-historico.ts`
 * (Profissional), mas gravando em `atletas_base_status_historico`/`atletas_base` e tipada em
 * `AtletaBaseStatus`. Ver docs/superpowers/specs/2026-10-06-fisioterapia-base-design.md.
 *
 * As funções do arquivo do Profissional são tipadas direto em `AtletaStatusHistoricoRow`/
 * `AtletaStatus` (3 valores), e `AtletaBaseStatus` tem 4 (inclui "suspenso"/"dispensado") — não dá
 * pra reaproveitar sem generalizar o arquivo já em produção, o que esta spec evita de propósito.
 * Por isso todo o arquivo é uma cópia pequena e independente, igual já faz `fisioterapia-base.ts`
 * com `statusFisioterapiaAtletaBase`.
 */

type LinhaOrdenavelBase = Pick<AtletaBaseStatusHistoricoRow, "status" | "data" | "created_at">;

/** Mesma lógica de `linhaMaisRecente` (Profissional): maior `data`; empate resolvido pelo
 * `created_at` mais recente. `null` numa lista vazia. */
export function linhaMaisRecenteBase<T extends LinhaOrdenavelBase>(linhas: T[]): T | null {
  if (linhas.length === 0) return null;
  return linhas.reduce((atual, linha) => {
    if (linha.data > atual.data) return linha;
    if (linha.data < atual.data) return atual;
    return linha.created_at > atual.created_at ? linha : atual;
  });
}

export interface LinhaHistoricoComDiasBase extends AtletaBaseStatusHistoricoRow {
  /** Dias nesse status — mesmo cálculo de `LinhaHistoricoComDias` (Profissional). */
  dias: number;
}

/** Mesma lógica de `calcularLinhaDoTempo` (Profissional): ordena mais recente primeiro e calcula
 * `dias` de cada linha a partir da ordem cronológica. */
export function calcularLinhaDoTempoBase(
  linhas: AtletaBaseStatusHistoricoRow[],
  hojeStr: string,
): LinhaHistoricoComDiasBase[] {
  const cronologica = [...linhas].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? -1 : 1;
    return a.created_at < b.created_at ? -1 : 1;
  });

  const comDias: LinhaHistoricoComDiasBase[] = cronologica.map((linha, i) => {
    const proxima = cronologica[i + 1];
    const fimStr = proxima ? proxima.data : hojeStr;
    const inicio = new Date(`${linha.data}T00:00:00Z`).getTime();
    const fim = new Date(`${fimStr}T00:00:00Z`).getTime();
    const dias = Math.max(0, Math.round((fim - inicio) / (1000 * 60 * 60 * 24)));
    return { ...linha, dias };
  });

  return comDias.reverse();
}

/** Grava uma linha nova no histórico da Base (resolvendo quem lançou a partir de quem está
 * logado) e, só se ela for a mais recente depois de gravada, atualiza `atletas_base.status` pra
 * combinar. Usada tanto pelo lançamento automático (ao abrir/fechar uma lesão) quanto pelos
 * manuais (tela "Histórico de Status"). */
export async function registrarStatusAtletaBase(
  supabase: ReturnType<typeof createClient>,
  atletaId: string,
  status: AtletaBaseStatus,
  data: string,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nome = await nomeDaContaAtual(supabase);

  const { error } = await supabase.from("atletas_base_status_historico").insert({
    atleta_id: atletaId,
    status,
    data,
    criado_por_perfil_id: user?.id ?? null,
    criado_por_nome: nome,
  });
  if (error) return { error: `Não foi possível registrar o status. Tente novamente. (${error.message})` };

  await recomputarStatusAtualBase(supabase, atletaId);
  return {};
}

/** Relê todo o histórico do atleta da Base e atualiza `atletas_base.status` pra combinar com a
 * linha mais recente — chamada depois de gravar OU editar uma linha. */
export async function recomputarStatusAtualBase(
  supabase: ReturnType<typeof createClient>,
  atletaId: string,
): Promise<void> {
  const { data } = await supabase
    .from("atletas_base_status_historico")
    .select("status, data, created_at")
    .eq("atleta_id", atletaId);

  const atual = linhaMaisRecenteBase((data ?? []) as LinhaOrdenavelBase[]);
  if (!atual) return;

  await supabase.from("atletas_base").update({ status: atual.status }).eq("id", atletaId);
}
