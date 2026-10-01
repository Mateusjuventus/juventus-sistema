import type { createClient } from "@/lib/supabase/server";
import { nomeDaContaAtual } from "@/lib/auth/perfis";
import type { AtletaStatus, AtletaStatusHistoricoRow } from "@/lib/supabase/types";

/**
 * Linha do tempo de status do atleta (Futebol Profissional) — ver docs/superpowers/specs/
 * 2026-10-01-departamento-medico-historico-status-design.md. `atletas.status` continua sendo o
 * campo lido pelo resto do sistema (convocação, cards, relatórios); `atletas_status_historico` é o
 * registro/auditoria por trás dele, alimentado automaticamente (abrir/fechar lesão na
 * Fisioterapia) e manualmente (tela "Histórico de Status").
 */

type LinhaOrdenavel = Pick<AtletaStatusHistoricoRow, "status" | "data" | "created_at">;

/** A linha "atual": maior `data`; empate resolvido pelo `created_at` mais recente (quem lançou por
 * último é quem vale). `null` numa lista vazia. */
export function linhaMaisRecente<T extends LinhaOrdenavel>(linhas: T[]): T | null {
  if (linhas.length === 0) return null;
  return linhas.reduce((atual, linha) => {
    if (linha.data > atual.data) return linha;
    if (linha.data < atual.data) return atual;
    return linha.created_at > atual.created_at ? linha : atual;
  });
}

export interface LinhaHistoricoComDias extends AtletaStatusHistoricoRow {
  /** Dias nesse status: diferença entre a `data` desta linha e a da próxima (ou hoje, se for a
   * mais recente) — sem +1 (diferente de `diasAfastados`): a data da próxima linha já pertence ao
   * status seguinte, não é um dia a mais do status atual. */
  dias: number;
}

/** Ordena mais recente primeiro e calcula `dias` de cada linha — o cálculo em si usa a ordem
 * cronológica (mais antiga primeiro), por isso ordena duas vezes em vez de tentar os dois sentidos
 * numa passada só. */
export function calcularLinhaDoTempo(linhas: AtletaStatusHistoricoRow[], hojeStr: string): LinhaHistoricoComDias[] {
  const cronologica = [...linhas].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? -1 : 1;
    return a.created_at < b.created_at ? -1 : 1;
  });

  const comDias: LinhaHistoricoComDias[] = cronologica.map((linha, i) => {
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
 * um campo escolhido) e, só se ela for a mais recente depois de gravada, atualiza `atletas.status`
 * pra combinar. Usada tanto pelo lançamento automático (`sincronizarStatusAtleta`, ao abrir/fechar
 * uma lesão) quanto pelos manuais (`lancarStatusManual`/`editarLancamentoStatus`).
 */
export async function registrarStatusAtleta(
  supabase: ReturnType<typeof createClient>,
  atletaId: string,
  status: AtletaStatus,
  data: string,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nome = await nomeDaContaAtual(supabase);

  const { error } = await supabase.from("atletas_status_historico").insert({
    atleta_id: atletaId,
    status,
    data,
    criado_por_perfil_id: user?.id ?? null,
    criado_por_nome: nome,
  });
  if (error) return { error: `Não foi possível registrar o status. Tente novamente. (${error.message})` };

  await recomputarStatusAtual(supabase, atletaId);
  return {};
}

/** Relê todo o histórico do atleta e atualiza `atletas.status` pra combinar com a linha mais
 * recente — chamada depois de gravar OU editar uma linha (editar uma linha antiga, que não é mais
 * recente que outra, não deve mudar o status atual do atleta). */
export async function recomputarStatusAtual(
  supabase: ReturnType<typeof createClient>,
  atletaId: string,
): Promise<void> {
  const { data } = await supabase
    .from("atletas_status_historico")
    .select("status, data, created_at")
    .eq("atleta_id", atletaId);

  const atual = linhaMaisRecente((data ?? []) as LinhaOrdenavel[]);
  if (!atual) return;

  await supabase.from("atletas").update({ status: atual.status }).eq("id", atletaId);
}
