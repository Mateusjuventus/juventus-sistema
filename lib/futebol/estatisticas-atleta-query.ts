import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calcularEstatisticasAtleta,
  type EstatisticasAtleta,
  type EventoParaEstatistica,
  type JogoParaEstatistica,
  type StatusConvocacaoJogo,
  type SumulaEventoTipoStats,
} from "./estatisticas-atleta";

/**
 * Monta os dados de `JogoParaEstatistica[]` a partir do banco e calcula as Estatísticas do Atleta
 * (ver docs/superpowers/specs/2026-08-04-estatisticas-atleta-design.md). Fica num arquivo separado
 * de `estatisticas-atleta.ts` de propósito: aquele é puro e 100% coberto por teste unitário; este
 * depende do Supabase (I/O), então é mais integração do que unidade.
 *
 * Diferente do resto do sistema (que duplica página/ação por departamento), esta função recebe os
 * nomes das tabelas como parâmetro e serve tanto o Profissional quanto o Base — a lógica de
 * consulta é idêntica nos dois, só muda qual tabela consultar, então parametrizar evita manter dois
 * arquivos quase-idênticos só pra trocar `_base` no nome da tabela.
 */

export interface TabelasEstatisticasAtleta {
  jogos: string;
  convocacoes: string;
  convocacaoAtletas: string;
  sumulas: string;
  sumulaEventos: string;
}

export interface FiltroEstatisticasAtleta {
  de?: string;
  ate?: string;
  competicao?: string;
}

export interface ResultadoEstatisticasAtleta {
  stats: EstatisticasAtleta;
  competicoesDisponiveis: string[];
  /** Jogos do universo considerado (com Convocação salva) já com o status deste atleta — útil pra
   * quem quiser listar jogo a jogo além do agregado (a spec não pede isso na tela, mas o PDF pode
   * reaproveitar). */
  jogos: JogoParaEstatistica[];
}

export async function buscarEstatisticasAtleta(
  supabase: SupabaseClient,
  atletaId: string,
  tabelas: TabelasEstatisticasAtleta,
  filtro: FiltroEstatisticasAtleta,
): Promise<ResultadoEstatisticasAtleta> {
  const { data: todosJogosData } = await supabase.from(tabelas.jogos).select("competicao");
  const competicoesDisponiveis = Array.from(
    new Set(((todosJogosData ?? []) as { competicao: string }[]).map((j) => j.competicao)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  let jogosQuery = supabase.from(tabelas.jogos).select("id, competicao, data_jogo");
  if (filtro.de) jogosQuery = jogosQuery.gte("data_jogo", filtro.de);
  if (filtro.ate) jogosQuery = jogosQuery.lte("data_jogo", filtro.ate);
  if (filtro.competicao) jogosQuery = jogosQuery.eq("competicao", filtro.competicao);

  const { data: jogosData } = await jogosQuery;
  const jogosFiltrados = (jogosData ?? []) as { id: string; competicao: string; data_jogo: string }[];
  const jogoIds = jogosFiltrados.map((j) => j.id);

  if (jogoIds.length === 0) {
    return { stats: calcularEstatisticasAtleta(atletaId, []), competicoesDisponiveis, jogos: [] };
  }

  const { data: convocacoesData } = await supabase
    .from(tabelas.convocacoes)
    .select("id, jogo_id")
    .in("jogo_id", jogoIds);
  const convocacoes = (convocacoesData ?? []) as { id: string; jogo_id: string }[];
  const convocacaoIdParaJogoId = new Map(convocacoes.map((c) => [c.id, c.jogo_id]));
  const convocacaoIds = convocacoes.map((c) => c.id);

  // Universo considerado: só jogos que já têm uma Convocação salva (ver a spec).
  const jogoIdsComConvocacao = new Set(convocacoes.map((c) => c.jogo_id));

  const statusPorJogoId = new Map<string, StatusConvocacaoJogo>();
  if (convocacaoIds.length > 0) {
    const { data: convocacaoAtletasData } = await supabase
      .from(tabelas.convocacaoAtletas)
      .select("convocacao_id, status")
      .eq("atleta_id", atletaId)
      .in("convocacao_id", convocacaoIds);
    ((convocacaoAtletasData ?? []) as { convocacao_id: string; status: "titular" | "reserva" }[]).forEach(
      (row) => {
        const jogoId = convocacaoIdParaJogoId.get(row.convocacao_id);
        if (jogoId) statusPorJogoId.set(jogoId, row.status);
      },
    );
  }

  const { data: sumulasData } = await supabase
    .from(tabelas.sumulas)
    .select("id, jogo_id, duracao_primeiro_tempo, duracao_segundo_tempo")
    .in("jogo_id", jogoIds);
  const sumulas = (sumulasData ?? []) as {
    id: string;
    jogo_id: string;
    duracao_primeiro_tempo: number;
    duracao_segundo_tempo: number;
  }[];
  const sumulaPorJogoId = new Map(sumulas.map((s) => [s.jogo_id, s]));
  const sumulaIds = sumulas.map((s) => s.id);

  const eventosPorSumulaId = new Map<string, EventoParaEstatistica[]>();
  if (sumulaIds.length > 0) {
    const { data: eventosData } = await supabase
      .from(tabelas.sumulaEventos)
      .select("*")
      .in("sumula_id", sumulaIds);
    ((eventosData ?? []) as {
      sumula_id: string;
      tipo: SumulaEventoTipoStats;
      tempo: "primeiro" | "segundo";
      minuto: number;
      atleta_id: string | null;
      atleta_entrou_id: string | null;
      atleta_assistencia_id: string | null;
      ordem: number;
    }[]).forEach((row) => {
      const lista = eventosPorSumulaId.get(row.sumula_id) ?? [];
      lista.push({
        tipo: row.tipo,
        tempo: row.tempo,
        minuto: row.minuto,
        atletaId: row.atleta_id,
        atletaEntrouId: row.atleta_entrou_id,
        atletaAssistenciaId: row.atleta_assistencia_id,
        ordem: row.ordem,
      });
      eventosPorSumulaId.set(row.sumula_id, lista);
    });
  }

  const jogos: JogoParaEstatistica[] = jogosFiltrados
    .filter((j) => jogoIdsComConvocacao.has(j.id))
    .map((j) => {
      const sumula = sumulaPorJogoId.get(j.id);
      return {
        jogoId: j.id,
        statusConvocacao: statusPorJogoId.get(j.id) ?? "nao_convocado",
        duracaoPrimeiroTempo: sumula?.duracao_primeiro_tempo ?? null,
        duracaoSegundoTempo: sumula?.duracao_segundo_tempo ?? null,
        eventos: sumula ? eventosPorSumulaId.get(sumula.id) ?? [] : [],
      };
    });

  return { stats: calcularEstatisticasAtleta(atletaId, jogos), competicoesDisponiveis, jogos };
}
