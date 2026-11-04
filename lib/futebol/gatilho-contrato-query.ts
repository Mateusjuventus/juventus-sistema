import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarEstatisticasAtleta, type TabelasEstatisticasAtleta } from "./estatisticas-atleta-query";
import { calcularProgressoGatilho, type ProgressoGatilho } from "./gatilho-contrato";
import type { AtletaContratoGatilhoRow, AtletaContratoGatilhoCompeticaoRow } from "../supabase/types";

/**
 * Calcula o progresso (ver `calcularProgressoGatilho`) de cada Gatilho ainda não confirmado de um
 * atleta — usado nas telas Ver/Editar atleta pra mostrar o progresso ao vivo ao lado de cada
 * gatilho do contrato vigente (ver docs/superpowers/specs/2026-11-04-contrato-atleta-gatilhos-
 * design.md). Fica num arquivo separado de `gatilho-contrato.ts` pelo mesmo motivo de
 * `estatisticas-atleta-query.ts` x `estatisticas-atleta.ts`: aquele é puro e testado por unidade,
 * este depende do Supabase (I/O).
 *
 * Gatilhos já confirmados (`cumprida_em` preenchido) não entram no resultado — o valor já foi
 * fixado na confirmação, recalcular não mudaria nada e só custaria uma consulta extra por gatilho.
 */
export async function calcularProgressoPorGatilho(
  supabase: SupabaseClient,
  atletaId: string,
  tabelas: TabelasEstatisticasAtleta,
  gatilhos: AtletaContratoGatilhoRow[],
): Promise<Record<string, ProgressoGatilho>> {
  const pendentes = gatilhos.filter((g) => !g.cumprida_em);
  if (pendentes.length === 0) return {};

  const { data: competicoesData } = await supabase
    .from("atleta_contrato_gatilho_competicoes")
    .select("*")
    .in(
      "gatilho_id",
      pendentes.map((g) => g.id),
    );
  const competicoesPorGatilho = new Map<string, string[]>();
  for (const row of (competicoesData ?? []) as AtletaContratoGatilhoCompeticaoRow[]) {
    const atual = competicoesPorGatilho.get(row.gatilho_id) ?? [];
    atual.push(row.competicao_id);
    competicoesPorGatilho.set(row.gatilho_id, atual);
  }

  const progresso: Record<string, ProgressoGatilho> = {};
  for (const g of pendentes) {
    const resultado = await buscarEstatisticasAtleta(supabase, atletaId, tabelas, {
      competicaoIds: competicoesPorGatilho.get(g.id) ?? [],
      incluirSemCompeticao: g.incluir_sem_competicao,
    });
    progresso[g.id] = calcularProgressoGatilho(resultado.stats, g.metrica, g.limiar);
  }
  return progresso;
}

export interface GatilhoCumpridoBruto {
  contratoId: string;
  atletaId: string;
  metrica: AtletaContratoGatilhoRow["metrica"];
  valorBonus: number;
  /** Nunca vazia aqui — a consulta já filtra só os confirmados. */
  cumpridaEm: string;
}

/**
 * Busca TODOS os Gatilhos já confirmados (`cumprida_em` preenchido), de qualquer atleta/mês, com o
 * `atleta_id` já resolvido (via `contrato_id` — o gatilho não guarda o atleta direto). Usado pelo
 * Financeiro (Profissional e Base) junto de `bonusGatilhosDoMes` (lib/futebol/gatilho-contrato.ts)
 * pra montar a linha "Bônus de gatilhos este mês" — ver docs/superpowers/specs/2026-11-04-contrato-
 * atleta-gatilhos-design.md, seção Financeiro. Não filtra por `vigente` do contrato: um bônus já
 * confirmado continua valendo mesmo que o contrato tenha sido substituído depois. Cada view
 * (Profissional/Base) é responsável por filtrar pelo próprio conjunto de atletas (por escopo) e
 * resolver o nome — esta função só entrega o bruto.
 */
export async function buscarGatilhosCumpridos(supabase: SupabaseClient): Promise<GatilhoCumpridoBruto[]> {
  const { data: gatilhosData } = await supabase
    .from("atleta_contrato_gatilhos")
    .select("id, contrato_id, metrica, valor_bonus, cumprida_em")
    .not("cumprida_em", "is", null);
  const gatilhos = (gatilhosData ?? []) as Pick<
    AtletaContratoGatilhoRow,
    "contrato_id" | "metrica" | "valor_bonus" | "cumprida_em"
  >[];
  if (gatilhos.length === 0) return [];

  const { data: contratosData } = await supabase
    .from("atleta_contratos")
    .select("id, atleta_id")
    .in(
      "id",
      Array.from(new Set(gatilhos.map((g) => g.contrato_id))),
    );
  const atletaIdPorContrato = new Map(
    ((contratosData ?? []) as { id: string; atleta_id: string }[]).map((c) => [c.id, c.atleta_id]),
  );

  return gatilhos
    .map((g) => ({
      contratoId: g.contrato_id,
      atletaId: atletaIdPorContrato.get(g.contrato_id) ?? "",
      metrica: g.metrica,
      valorBonus: g.valor_bonus,
      cumpridaEm: g.cumprida_em as string,
    }))
    .filter((g) => g.atletaId !== "");
}
