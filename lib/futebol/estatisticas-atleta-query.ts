import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calcularDetalhePorJogo,
  calcularEstatisticasAtleta,
  duracaoReferenciaEstatisticas,
  type DetalheJogoAtleta,
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
 *
 * Atualização 2026-10-27 (pedido do Mateus): o filtro por período livre (`de`/`ate`) e por texto
 * solto de `jogos.competicao` foi substituído por um filtro baseado na Competição FORMAL (tabela
 * `competicoes`/`competicoes_base`, vinculada a uma Temporada) — a razão é que o texto livre de
 * `jogos.competicao` não tem nenhum vínculo com ano/temporada, enquanto o módulo de Competições já
 * tem essa estrutura ("pegar por temporada, pois as competições são cadastradas na temporada").
 * Também foi acrescentada uma lista jogo a jogo (`detalhePorCompeticao`) com a minutagem, gols,
 * assistências, cartões e placar individualizados de cada jogo em que o atleta foi convocado,
 * agrupada por Competição/Temporada (ver docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-
 * anotacoes-design.md, adendo "Lista jogo a jogo").
 */

export interface TabelasEstatisticasAtleta {
  jogos: string;
  convocacoes: string;
  convocacaoAtletas: string;
  sumulas: string;
  sumulaEventos: string;
  /** Tabela de vínculo Competição<->Jogo (ex: `competicao_jogos`/`competicao_jogos_base`) — usada
   * pro filtro por Competição/Temporada e pra montar a lista jogo a jogo agrupada (ver
   * `buscarCompeticaoTemporadaPorJogoId`). */
  competicaoJogos: string;
  /** Tabela de Competições formais (ex: `competicoes`/`competicoes_base`). */
  competicoes: string;
  /** Tabela de Temporadas — `temporadas` no Profissional, `temporadas_base` na Base (são duas
   * tabelas distintas; ver `lib/futebol/competicao-query.ts`/`competicao-query-base.ts`). */
  temporadas: string;
}

export interface FiltroEstatisticasAtleta {
  /** @deprecated Substituído por `competicaoIds`/`incluirSemCompeticao` em 2026-10-27 — o Mateus
   * pediu pra filtrar pela Competição formal (temporada-aware), não por período livre. Mantido só
   * pra não quebrar quem ainda não migrou pro novo filtro. Ignorado quando `competicaoIds` está
   * definido. */
  de?: string;
  /** @deprecated ver `de`. */
  ate?: string;
  /** @deprecated ver `de`. */
  competicao?: string;
  /** IDs das Competições formais (tabela `competicoes`/`competicoes_base`) selecionadas no filtro.
   * Quando este campo está definido — mesmo que `[]` — o filtro passa a usar o modo novo (por
   * Competição/Temporada) e ignora `de`/`ate`/`competicao` por completo. Use
   * `buscarCompeticoesDisponiveisAtleta` pra listar as opções disponíveis. */
  competicaoIds?: string[];
  /** Quando `true` (e `competicaoIds` está definido), inclui também os jogos que não estão
   * vinculados a nenhuma Competição formal (ex: amistosos lançados sem Competição cadastrada — ver
   * `ROTULO_SEM_COMPETICAO`). */
  incluirSemCompeticao?: boolean;
}

/** Rótulo do grupo "guarda-chuva" da lista jogo a jogo pros jogos sem vínculo com nenhuma
 * Competição formal — tanto no filtro (`incluirSemCompeticao`) quanto no agrupamento de
 * `detalhePorCompeticao`. */
export const ROTULO_SEM_COMPETICAO = "Sem competição vinculada";

/** Um jogo (do universo considerado, só os em que o atleta foi convocado — titular ou reserva) já
 * com a minutagem/gols/assistências/cartões individuais dele (`DetalheJogoAtleta`) e os dados de
 * exibição do jogo em si (adversário, mandante, placar, data/horário) — usado pra montar a lista
 * "jogo a jogo" (ex: "Juventus x Ibrachina 27/10/2026 às 15h00 - 59min e 2 Gols"). */
export interface JogoDetalheComContexto extends DetalheJogoAtleta {
  dataJogo: string;
  horario: string | null;
  adversarioNome: string;
  mandante: boolean;
  golsPro: number | null;
  golsContra: number | null;
}

/** Um grupo da lista jogo a jogo — `titulo` é o título principal da seção (ex: "Campeonato Paulista
 * Sub 17 - 2026", ou `ROTULO_SEM_COMPETICAO`), `jogos` já vem ordenado por data/horário crescente.
 * Os grupos em si (no array `detalhePorCompeticao`) vêm ordenados por Temporada mais recente
 * primeiro, e dentro da mesma Temporada por título da Competição. */
export interface GrupoCompeticaoDetalhe {
  titulo: string;
  jogos: JogoDetalheComContexto[];
}

export interface ResultadoEstatisticasAtleta {
  stats: EstatisticasAtleta;
  /** @deprecated Lista de valores distintos do texto livre `jogos.competicao` — era a origem das
   * opções do filtro antigo. Mantida só pra não quebrar quem ainda não migrou; prefira
   * `buscarCompeticoesDisponiveisAtleta` pra listar as Competições formais disponíveis. */
  competicoesDisponiveis: string[];
  /** Jogos do universo considerado (com Convocação salva) já com o status deste atleta — útil pra
   * quem quiser listar jogo a jogo além do agregado (a spec não pede isso na tela, mas o PDF pode
   * reaproveitar). */
  jogos: JogoParaEstatistica[];
  /** Duração "de referência" (ver `duracaoReferenciaEstatisticas`) pra montar os rótulos dinâmicos
   * "+Xmin"/"jogo completo" na tela e no PDF — varia por categoria (ex: 45/90 no padrão, 40/80 no
   * Sub-17). Ver 0147_sumula_acrescimo.sql e docs/superpowers/specs/2026-10-21-competicoes-
   * formato-partida-design.md. */
  duracaoReferencia: { primeiroTempo: number; total: number };
  /** Lista jogo a jogo (só os jogos em que o atleta foi convocado — titular ou reserva), agrupada
   * por Competição/Temporada — ver `GrupoCompeticaoDetalhe`. Pedido do Mateus em 2026-10-27. */
  detalhePorCompeticao: GrupoCompeticaoDetalhe[];
}

interface JogoRowParaEstatistica {
  id: string;
  competicao: string;
  data_jogo: string;
  horario: string | null;
  adversario_nome: string;
  mandante: boolean;
  gols_pro: number | null;
  gols_contra: number | null;
}

interface CompeticaoTemporadaDoJogo {
  competicaoId: string;
  competicaoNome: string;
  temporadaId: string;
  temporadaNome: string;
  /** `created_at` da Temporada, usado só como chave de ordenação (mais recente primeiro) — nunca
   * exibido. */
  temporadaCreatedAt: string;
}

/** Busca, pra um conjunto de jogos, a Competição formal e a Temporada a que cada um está vinculado
 * (via a tabela de vínculo `competicaoJogos`) — jogos sem nenhum vínculo simplesmente não aparecem
 * no Map retornado (trate a ausência como "sem competição"). Faz os joins manualmente (Map), igual
 * ao padrão já usado no resto deste arquivo, em vez de um embedded select, porque os 3 nomes de
 * tabela vêm parametrizados em `tabelas` (não dá pra escrever `competicoes(...)` direto no
 * `.select()` de outra tabela parametrizada). */
async function buscarCompeticaoTemporadaPorJogoId(
  supabase: SupabaseClient,
  tabelas: TabelasEstatisticasAtleta,
  jogoIds: string[],
): Promise<Map<string, CompeticaoTemporadaDoJogo>> {
  const resultado = new Map<string, CompeticaoTemporadaDoJogo>();
  if (jogoIds.length === 0) return resultado;

  const { data: vinculosData } = await supabase
    .from(tabelas.competicaoJogos)
    .select("jogo_id, competicao_id")
    .in("jogo_id", jogoIds);
  const vinculos = (vinculosData ?? []) as { jogo_id: string; competicao_id: string }[];
  if (vinculos.length === 0) return resultado;

  const competicaoIds = Array.from(new Set(vinculos.map((v) => v.competicao_id)));
  const { data: competicoesData } = await supabase
    .from(tabelas.competicoes)
    .select("id, nome, temporada_id")
    .in("id", competicaoIds);
  const competicoes = (competicoesData ?? []) as { id: string; nome: string; temporada_id: string }[];
  const competicaoPorId = new Map(competicoes.map((c) => [c.id, c]));

  const temporadaIds = Array.from(new Set(competicoes.map((c) => c.temporada_id)));
  const { data: temporadasData } =
    temporadaIds.length > 0
      ? await supabase.from(tabelas.temporadas).select("id, nome, created_at").in("id", temporadaIds)
      : { data: [] as { id: string; nome: string; created_at: string }[] };
  const temporadas = (temporadasData ?? []) as { id: string; nome: string; created_at: string }[];
  const temporadaPorId = new Map(temporadas.map((t) => [t.id, t]));

  for (const vinculo of vinculos) {
    const competicao = competicaoPorId.get(vinculo.competicao_id);
    if (!competicao) continue;
    const temporada = temporadaPorId.get(competicao.temporada_id);
    if (!temporada) continue;
    // Um jogo não deveria estar vinculado a mais de uma Competição, mas se a tabela de vínculo
    // tiver mais de uma linha pro mesmo jogo (ex: fases/grupos diferentes da mesma Competição),
    // a primeira encontrada é suficiente — todas apontam pra mesma Competição/Temporada de qualquer
    // forma.
    if (!resultado.has(vinculo.jogo_id)) {
      resultado.set(vinculo.jogo_id, {
        competicaoId: competicao.id,
        competicaoNome: competicao.nome,
        temporadaId: temporada.id,
        temporadaNome: temporada.nome,
        temporadaCreatedAt: temporada.created_at,
      });
    }
  }
  return resultado;
}

/** Ordena grupos da lista jogo a jogo por Temporada mais recente primeiro e, dentro da mesma
 * Temporada (ou entre dois grupos sem Temporada — só pode haver um, o de `ROTULO_SEM_COMPETICAO`),
 * por título. Jogos sem Competição vinculada usam `ordemTemporada: ""`, que sempre perde pra
 * qualquer `created_at` real (string não-vazia), então o grupo cai pro final. */
function compararGruposPorTemporada(
  a: { ordemTemporada: string; titulo: string },
  b: { ordemTemporada: string; titulo: string },
): number {
  if (a.ordemTemporada !== b.ordemTemporada) return b.ordemTemporada.localeCompare(a.ordemTemporada);
  return a.titulo.localeCompare(b.titulo, "pt-BR");
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

  let jogosQuery = supabase
    .from(tabelas.jogos)
    .select("id, competicao, data_jogo, horario, adversario_nome, mandante, gols_pro, gols_contra");

  const usandoFiltroCompeticao = filtro.competicaoIds !== undefined;
  if (!usandoFiltroCompeticao) {
    if (filtro.de) jogosQuery = jogosQuery.gte("data_jogo", filtro.de);
    if (filtro.ate) jogosQuery = jogosQuery.lte("data_jogo", filtro.ate);
    if (filtro.competicao) jogosQuery = jogosQuery.eq("competicao", filtro.competicao);
  }

  const { data: jogosData } = await jogosQuery;
  let jogosFiltrados = (jogosData ?? []) as JogoRowParaEstatistica[];

  // Mapa jogoId -> Competição/Temporada; já calculado aqui quando o filtro novo está ativo (preciso
  // dele pra filtrar), e reaproveitado mais abaixo pra montar `detalhePorCompeticao` sem repetir a
  // consulta. Quando o filtro novo NÃO está ativo, fica vazio aqui e é buscado de novo mais abaixo
  // (só pros jogos convocados, que é tudo que a lista jogo a jogo precisa).
  let mapaCompeticaoTemporada = new Map<string, CompeticaoTemporadaDoJogo>();

  if (usandoFiltroCompeticao) {
    const todosOsIds = jogosFiltrados.map((j) => j.id);
    mapaCompeticaoTemporada = await buscarCompeticaoTemporadaPorJogoId(supabase, tabelas, todosOsIds);
    const competicaoIdsSelecionados = new Set(filtro.competicaoIds ?? []);
    const incluirSemCompeticao = filtro.incluirSemCompeticao ?? false;
    jogosFiltrados = jogosFiltrados.filter((j) => {
      const vinculo = mapaCompeticaoTemporada.get(j.id);
      if (vinculo) return competicaoIdsSelecionados.has(vinculo.competicaoId);
      return incluirSemCompeticao;
    });
  }

  const jogoIds = jogosFiltrados.map((j) => j.id);

  if (jogoIds.length === 0) {
    return {
      stats: calcularEstatisticasAtleta(atletaId, []),
      competicoesDisponiveis,
      jogos: [],
      duracaoReferencia: duracaoReferenciaEstatisticas([]),
      detalhePorCompeticao: [],
    };
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
    .select(
      "id, jogo_id, duracao_primeiro_tempo, duracao_segundo_tempo, duracao_terceiro_tempo, acrescimo_primeiro_tempo, acrescimo_segundo_tempo, acrescimo_terceiro_tempo",
    )
    .in("jogo_id", jogoIds);
  const sumulas = (sumulasData ?? []) as {
    id: string;
    jogo_id: string;
    duracao_primeiro_tempo: number;
    duracao_segundo_tempo: number;
    duracao_terceiro_tempo: number | null;
    acrescimo_primeiro_tempo: number | null;
    acrescimo_segundo_tempo: number | null;
    acrescimo_terceiro_tempo: number | null;
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
      tempo: "primeiro" | "segundo" | "terceiro";
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
        duracaoTerceiroTempo: sumula?.duracao_terceiro_tempo ?? null,
        acrescimoPrimeiroTempo: sumula?.acrescimo_primeiro_tempo ?? 0,
        acrescimoSegundoTempo: sumula?.acrescimo_segundo_tempo ?? 0,
        acrescimoTerceiroTempo: sumula?.acrescimo_terceiro_tempo ?? 0,
        eventos: sumula ? eventosPorSumulaId.get(sumula.id) ?? [] : [],
      };
    });

  // Lista jogo a jogo: só os jogos em que o atleta foi efetivamente convocado (titular ou reserva)
  // — "quais jogos ele foi convocado" (pedido do Mateus), não-convocados não entram na lista.
  const jogosConvocados = jogos.filter((j) => j.statusConvocacao !== "nao_convocado");
  const jogoIdsConvocados = jogosConvocados.map((j) => j.jogoId);

  // Quando o filtro novo (por Competição) não estava ativo, o mapa de Competição/Temporada ainda
  // não foi buscado — busca agora, só pros jogos convocados (é tudo que a lista jogo a jogo usa).
  if (!usandoFiltroCompeticao) {
    mapaCompeticaoTemporada = await buscarCompeticaoTemporadaPorJogoId(supabase, tabelas, jogoIdsConvocados);
  }

  const detalhes = calcularDetalhePorJogo(atletaId, jogosConvocados);
  const detalhePorJogoId = new Map(detalhes.map((d) => [d.jogoId, d]));
  const jogoRowPorId = new Map(jogosFiltrados.map((j) => [j.id, j]));

  const gruposMap = new Map<string, GrupoCompeticaoDetalhe & { ordemTemporada: string }>();
  for (const jogoId of jogoIdsConvocados) {
    const detalhe = detalhePorJogoId.get(jogoId);
    const jogoRow = jogoRowPorId.get(jogoId);
    if (!detalhe || !jogoRow) continue;

    const vinculo = mapaCompeticaoTemporada.get(jogoId);
    const chaveGrupo = vinculo ? vinculo.competicaoId : "__sem_competicao__";
    const titulo = vinculo ? `${vinculo.competicaoNome} - ${vinculo.temporadaNome}` : ROTULO_SEM_COMPETICAO;
    const ordemTemporada = vinculo ? vinculo.temporadaCreatedAt : "";

    if (!gruposMap.has(chaveGrupo)) {
      gruposMap.set(chaveGrupo, { titulo, jogos: [], ordemTemporada });
    }
    gruposMap.get(chaveGrupo)!.jogos.push({
      jogoId: detalhe.jogoId,
      minutos: detalhe.minutos,
      gols: detalhe.gols,
      assistencias: detalhe.assistencias,
      cartoesAmarelos: detalhe.cartoesAmarelos,
      cartoesVermelhos: detalhe.cartoesVermelhos,
      dataJogo: jogoRow.data_jogo,
      horario: jogoRow.horario ?? null,
      adversarioNome: jogoRow.adversario_nome,
      mandante: jogoRow.mandante,
      golsPro: jogoRow.gols_pro,
      golsContra: jogoRow.gols_contra,
    });
  }

  const detalhePorCompeticao: GrupoCompeticaoDetalhe[] = Array.from(gruposMap.values())
    .sort(compararGruposPorTemporada)
    .map((grupo) => ({
      titulo: grupo.titulo,
      jogos: [...grupo.jogos].sort((a, b) => `${a.dataJogo} ${a.horario ?? ""}`.localeCompare(`${b.dataJogo} ${b.horario ?? ""}`)),
    }));

  return {
    stats: calcularEstatisticasAtleta(atletaId, jogos),
    competicoesDisponiveis,
    jogos,
    duracaoReferencia: duracaoReferenciaEstatisticas(jogos),
    detalhePorCompeticao,
  };
}

/** Uma Competição formal disponível pra seleção no filtro — já com o nome da Temporada a que
 * pertence, pra agrupar/rotular o checklist (ex: "2026" como cabeçalho, "Campeonato Paulista Sub
 * 17" como item). */
export interface CompeticaoDisponivelAtleta {
  competicaoId: string;
  competicaoNome: string;
  temporadaId: string;
  temporadaNome: string;
}

export interface CompeticoesDisponiveisAtleta {
  /** Já ordenado por Temporada mais recente primeiro e, dentro da mesma Temporada, por nome da
   * Competição — pronto pra agrupar visualmente (itens consecutivos com o mesmo `temporadaId`
   * pertencem ao mesmo grupo). */
  competicoes: CompeticaoDisponivelAtleta[];
  /** `true` quando existe pelo menos um jogo do universo considerado (com Convocação salva, time
   * inteiro) sem vínculo com nenhuma Competição formal — controla se a opção "sem competição"
   * (`ROTULO_SEM_COMPETICAO`) deve aparecer no checklist do filtro. */
  temJogosSemCompeticao: boolean;
}

/** Lista as Competições formais disponíveis pra seleção no filtro de Dados de Jogo/Ficha mestre —
 * o universo é o mesmo "universo considerado" de `buscarEstatisticasAtleta` (jogos com Convocação
 * salva, TIME INTEIRO, não filtrado por este atleta específico ou por categoria — mesma lógica de
 * sempre, que permite agregação automática entre categorias quando o atleta muda de categoria). */
export async function buscarCompeticoesDisponiveisAtleta(
  supabase: SupabaseClient,
  tabelas: TabelasEstatisticasAtleta,
): Promise<CompeticoesDisponiveisAtleta> {
  const { data: convocacoesData } = await supabase.from(tabelas.convocacoes).select("jogo_id");
  const jogoIdsComConvocacao = Array.from(
    new Set(((convocacoesData ?? []) as { jogo_id: string }[]).map((c) => c.jogo_id)),
  );

  if (jogoIdsComConvocacao.length === 0) {
    return { competicoes: [], temJogosSemCompeticao: false };
  }

  const mapa = await buscarCompeticaoTemporadaPorJogoId(supabase, tabelas, jogoIdsComConvocacao);
  const temJogosSemCompeticao = jogoIdsComConvocacao.some((id) => !mapa.has(id));

  const competicaoPorId = new Map<string, CompeticaoDisponivelAtleta>();
  const ordemPorCompeticaoId = new Map<string, string>();
  for (const vinculo of mapa.values()) {
    if (!competicaoPorId.has(vinculo.competicaoId)) {
      competicaoPorId.set(vinculo.competicaoId, {
        competicaoId: vinculo.competicaoId,
        competicaoNome: vinculo.competicaoNome,
        temporadaId: vinculo.temporadaId,
        temporadaNome: vinculo.temporadaNome,
      });
      ordemPorCompeticaoId.set(vinculo.competicaoId, vinculo.temporadaCreatedAt);
    }
  }

  const competicoes = Array.from(competicaoPorId.values()).sort((a, b) => {
    const ordemA = ordemPorCompeticaoId.get(a.competicaoId) ?? "";
    const ordemB = ordemPorCompeticaoId.get(b.competicaoId) ?? "";
    if (ordemA !== ordemB) return ordemB.localeCompare(ordemA);
    return a.competicaoNome.localeCompare(b.competicaoNome, "pt-BR");
  });

  return { competicoes, temJogosSemCompeticao };
}
