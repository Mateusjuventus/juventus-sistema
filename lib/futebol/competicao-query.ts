import type { createClient } from "@/lib/supabase/server";
import { hojeBrasilia } from "@/lib/data-brasil";
import type {
  CompeticaoComTemporadaRow,
  CompeticaoDocumentoRow,
  CompeticaoFaseRow,
  CompeticaoGrupoEquipeRow,
  CompeticaoGrupoResultadoRow,
  CompeticaoGrupoRow,
  CompeticaoInscricaoRow,
  CompeticaoJogoRow,
  CompeticaoPrazoRow,
  CompeticaoSuspensaoManualRow,
  JogoRow,
} from "@/lib/supabase/types";
import {
  calcularDisciplina,
  type CartaoEvento,
  type DisciplinaCompeticao,
  type JogoDisciplina,
} from "@/lib/futebol/competicao-disciplina";
import {
  calcularClassificacao,
  jogoJuventusParaResultado,
  JUVENTUS_NOME,
  type LinhaClassificacao,
  type ResultadoSimples,
} from "@/lib/futebol/competicao-classificacao";
import {
  equipesIndefinidas,
  normalizarCriterios,
  ordenarClassificacao,
  type CriterioDesempate,
} from "@/lib/futebol/competicao-desempate";

/**
 * Carrega TUDO de uma competição de uma vez (estrutura, jogos vinculados, disciplina derivada das
 * súmulas, classificação por grupo, inscrições, prazos, documentos) — as abas de
 * `/competicoes/[id]` destructuram só o que usam. É a única porta de entrada de dados do módulo:
 * garante que toda tela deriva das MESMAS fontes (jogos/súmulas existentes), sem cache nem
 * duplicação (ver docs/superpowers/specs/2026-08-10-competicoes-design.md).
 */

/** Só o que as telas do módulo precisam de cada atleta. */
export type AtletaResumo = { id: string; nome_completo: string; posicao: string | null };

export interface CompeticaoCarregada {
  competicao: CompeticaoComTemporadaRow;
  fases: CompeticaoFaseRow[];
  gruposPorFase: Map<string, CompeticaoGrupoRow[]>;
  /** Todos os grupos da competição, indexados por id (pra achar nome/fase de um grupo solto). */
  gruposById: Map<string, CompeticaoGrupoRow>;
  equipesPorGrupo: Map<string, CompeticaoGrupoEquipeRow[]>;
  resultadosPorGrupo: Map<string, CompeticaoGrupoResultadoRow[]>;
  vinculos: CompeticaoJogoRow[];
  jogosById: Map<string, JogoRow>;
  /** Jogos vinculados já achatados e em ordem cronológica — a linha do tempo da competição. */
  jogosOrdenados: JogoDisciplina[];
  disciplina: DisciplinaCompeticao;
  /** Eventos de cartão crus (já filtrados pros jogos vinculados) — expostos pra telas que
   * recalculam a disciplina num subconjunto de jogos (filtro por fase/grupo em /cartoes). */
  eventosCartao: CartaoEvento[];
  /** Fases com "zerar cartões ao encerrar" — pra quem recalcula a disciplina manter a regra. */
  fasesQueZeramAmarelos: Set<string>;
  manuais: CompeticaoSuspensaoManualRow[];
  inscricoes: CompeticaoInscricaoRow[];
  atletasById: Map<string, AtletaResumo>;
  prazos: CompeticaoPrazoRow[];
  documentos: CompeticaoDocumentoRow[];
  classificacoesPorGrupo: Map<string, LinhaClassificacao[]>;
  /** Critérios de desempate efetivamente aplicados em cada grupo (da fase, se ela tiver os seus,
   * senão os da competição) — a tela mostra a ordem usada. */
  criteriosPorGrupo: Map<string, CriterioDesempate[]>;
  /** Equipes cuja posição os critérios não conseguem decidir (empate total → sorteio). */
  indefinidasPorGrupo: Map<string, Set<string>>;
  nomesGrupos: Map<string, string>;
}

export function confrontoResumo(jogo: Pick<JogoRow, "mandante" | "adversario_nome">): string {
  return jogo.mandante ? `${JUVENTUS_NOME} x ${jogo.adversario_nome}` : `${jogo.adversario_nome} x ${JUVENTUS_NOME}`;
}

export function confrontoComData(jogo: Pick<JogoRow, "mandante" | "adversario_nome" | "data_jogo">): string {
  const [, mes, dia] = jogo.data_jogo.split("-");
  return `${confrontoResumo(jogo)} (${dia}/${mes})`;
}

export async function carregarCompeticao(
  supabase: ReturnType<typeof createClient>,
  competicaoId: string,
): Promise<CompeticaoCarregada | null> {
  const { data: competicaoData } = await supabase
    .from("competicoes")
    .select("*, temporada:temporadas(id, nome)")
    .eq("id", competicaoId)
    .maybeSingle();
  if (!competicaoData) return null;
  const competicao = competicaoData as unknown as CompeticaoComTemporadaRow;

  const [
    { data: fasesData },
    { data: vinculosData },
    { data: manuaisData },
    { data: inscricoesData },
    { data: prazosData },
    { data: documentosData },
  ] = await Promise.all([
    supabase
      .from("competicao_fases")
      .select("*")
      .eq("competicao_id", competicaoId)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("competicao_jogos").select("*").eq("competicao_id", competicaoId),
    supabase.from("competicao_suspensoes_manuais").select("*").eq("competicao_id", competicaoId),
    supabase.from("competicao_inscricoes").select("*").eq("competicao_id", competicaoId),
    supabase
      .from("competicao_prazos")
      .select("*")
      .eq("competicao_id", competicaoId)
      .order("data_fim", { ascending: true }),
    supabase
      .from("competicao_documentos")
      .select("*")
      .eq("competicao_id", competicaoId)
      .order("created_at", { ascending: false }),
  ]);

  const fases = (fasesData ?? []) as CompeticaoFaseRow[];
  const vinculos = (vinculosData ?? []) as CompeticaoJogoRow[];
  const manuais = (manuaisData ?? []) as CompeticaoSuspensaoManualRow[];
  const inscricoes = (inscricoesData ?? []) as CompeticaoInscricaoRow[];
  const prazos = (prazosData ?? []) as CompeticaoPrazoRow[];
  const documentos = (documentosData ?? []) as CompeticaoDocumentoRow[];

  const faseIds = fases.map((f) => f.id);
  const { data: gruposData } = faseIds.length
    ? await supabase
        .from("competicao_grupos")
        .select("*")
        .in("fase_id", faseIds)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };
  const grupos = (gruposData ?? []) as CompeticaoGrupoRow[];
  const grupoIds = grupos.map((g) => g.id);

  const jogoIds = vinculos.map((v) => v.jogo_id);

  const [{ data: equipesData }, { data: resultadosData }, { data: jogosData }] = await Promise.all([
    grupoIds.length
      ? supabase
          .from("competicao_grupo_equipes")
          .select("*")
          .in("grupo_id", grupoIds)
          .order("ordem", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    grupoIds.length
      ? supabase
          .from("competicao_grupo_resultados")
          .select("*")
          .in("grupo_id", grupoIds)
          .order("data_jogo", { ascending: true, nullsFirst: true })
      : Promise.resolve({ data: [] }),
    jogoIds.length
      ? supabase.from("jogos").select("*").in("id", jogoIds)
      : Promise.resolve({ data: [] }),
  ]);

  const equipes = (equipesData ?? []) as CompeticaoGrupoEquipeRow[];
  const resultados = (resultadosData ?? []) as CompeticaoGrupoResultadoRow[];
  const jogos = (jogosData ?? []) as JogoRow[];
  const jogosById = new Map(jogos.map((j) => [j.id, j]));

  // Eventos de cartão das súmulas dos jogos vinculados — a ÚNICA origem de cartões do módulo.
  let eventosCartao: CartaoEvento[] = [];
  if (jogoIds.length) {
    const { data: sumulasData } = await supabase.from("sumulas").select("id, jogo_id").in("jogo_id", jogoIds);
    const sumulas = (sumulasData ?? []) as { id: string; jogo_id: string }[];
    if (sumulas.length) {
      const jogoPorSumula = new Map(sumulas.map((s) => [s.id, s.jogo_id]));
      const { data: eventosData } = await supabase
        .from("sumula_eventos")
        .select("sumula_id, tipo, atleta_id")
        .in("sumula_id", sumulas.map((s) => s.id))
        .in("tipo", ["cartao_amarelo", "cartao_vermelho"]);
      eventosCartao = ((eventosData ?? []) as { sumula_id: string; tipo: string; atleta_id: string | null }[])
        .filter((e) => e.atleta_id !== null)
        .map((e) => ({
          jogoId: jogoPorSumula.get(e.sumula_id) as string,
          atletaId: e.atleta_id as string,
          tipo: e.tipo as "cartao_amarelo" | "cartao_vermelho",
        }));
    }
  }

  const fasePorJogo = new Map(vinculos.map((v) => [v.jogo_id, v.fase_id]));
  const jogosOrdenados: JogoDisciplina[] = vinculos
    .map((v) => jogosById.get(v.jogo_id))
    .filter((j): j is JogoRow => Boolean(j))
    .sort((a, b) => (a.data_jogo === b.data_jogo ? a.id.localeCompare(b.id) : a.data_jogo.localeCompare(b.data_jogo)))
    .map((j) => ({
      jogoId: j.id,
      data: j.data_jogo,
      confronto: confrontoComData(j),
      faseId: fasePorJogo.get(j.id) ?? null,
    }));

  // Fases com "zerar cartões ao encerrar" (Art. 60 da Copa Paulista) — o motor zera o acúmulo de
  // amarelos ao cruzar do último jogo dessas fases pro primeiro da fase seguinte.
  const fasesQueZeramAmarelos = new Set(fases.filter((f) => f.zerar_cartoes_ao_encerrar).map((f) => f.id));

  const disciplina = calcularDisciplina(
    {
      amarelosParaSuspensao: competicao.regra_amarelos_suspensao,
      jogosSuspensaoAmarelos: competicao.regra_jogos_suspensao_amarelos,
      jogosSuspensaoVermelho: competicao.regra_jogos_suspensao_vermelho,
    },
    jogosOrdenados,
    eventosCartao,
    manuais.map((m) => ({
      id: m.id,
      atletaId: m.atleta_id,
      origem: m.origem,
      motivo: m.motivo,
      jogosSuspensao: m.jogos_suspensao,
      dataDecisao: m.data_decisao,
    })),
    hojeBrasilia(),
    fasesQueZeramAmarelos,
  );

  // Nomes dos atletas que aparecem em qualquer tela do módulo (inscritos + quem tem cartão ou
  // suspensão mesmo sem inscrição — pra tela apontar a irregularidade em vez de esconder).
  const atletaIds = new Set<string>([
    ...inscricoes.map((i) => i.atleta_id),
    ...disciplina.cartoes.map((c) => c.atletaId),
    ...disciplina.suspensoes.map((s) => s.atletaId),
  ]);
  let atletasById = new Map<string, AtletaResumo>();
  if (atletaIds.size) {
    const { data: atletasData } = await supabase
      .from("atletas")
      .select("id, nome_completo, posicao")
      .in("id", Array.from(atletaIds));
    atletasById = new Map(((atletasData ?? []) as AtletaResumo[]).map((a) => [a.id, a]));
  }

  const gruposPorFase = new Map<string, CompeticaoGrupoRow[]>();
  for (const g of grupos) {
    const lista = gruposPorFase.get(g.fase_id) ?? [];
    lista.push(g);
    gruposPorFase.set(g.fase_id, lista);
  }
  const gruposById = new Map(grupos.map((g) => [g.id, g]));
  const nomesGrupos = new Map(grupos.map((g) => [g.id, g.nome]));

  const equipesPorGrupo = new Map<string, CompeticaoGrupoEquipeRow[]>();
  for (const e of equipes) {
    const lista = equipesPorGrupo.get(e.grupo_id) ?? [];
    lista.push(e);
    equipesPorGrupo.set(e.grupo_id, lista);
  }

  const resultadosPorGrupo = new Map<string, CompeticaoGrupoResultadoRow[]>();
  for (const r of resultados) {
    const lista = resultadosPorGrupo.get(r.grupo_id) ?? [];
    lista.push(r);
    resultadosPorGrupo.set(r.grupo_id, lista);
  }

  // Classificação por grupo: equipes fixas do grupo (+ Juventus, se tem jogo vinculado no grupo e
  // ninguém o listou) × resultados externos + jogos do Juventus com placar.
  const classificacoesPorGrupo = new Map<string, LinhaClassificacao[]>();
  const criteriosPorGrupo = new Map<string, CriterioDesempate[]>();
  const indefinidasPorGrupo = new Map<string, Set<string>>();
  for (const g of grupos) {
    const nomesEquipes = (equipesPorGrupo.get(g.id) ?? [])
      .map((e) => e.nome)
      .filter((n): n is string => n !== null);
    const vinculosDoGrupo = vinculos.filter((v) => v.grupo_id === g.id);
    const temJuventus = nomesEquipes.some((n) => n.trim().toLocaleLowerCase("pt-BR") === "juventus");
    if (!temJuventus && vinculosDoGrupo.length > 0) nomesEquipes.push(JUVENTUS_NOME);

    const resultadosDoGrupo: ResultadoSimples[] = (resultadosPorGrupo.get(g.id) ?? []).map((r) => ({
      casa: r.equipe_casa,
      fora: r.equipe_fora,
      golsCasa: r.gols_casa,
      golsFora: r.gols_fora,
      cartoesAmarelosCasa: r.cartoes_amarelos_casa,
      cartoesAmarelosFora: r.cartoes_amarelos_fora,
      cartoesVermelhosCasa: r.cartoes_vermelhos_casa,
      cartoesVermelhosFora: r.cartoes_vermelhos_fora,
    }));
    for (const v of vinculosDoGrupo) {
      const jogo = jogosById.get(v.jogo_id);
      if (!jogo) continue;
      // Cartões do NOSSO lado vêm direto da súmula do jogo; os do adversário são os
      // complementados à mão no vínculo (a súmula do sistema não registra cartão de adversário).
      const nossos = eventosCartao.filter((e) => e.jogoId === v.jogo_id);
      const resultado = jogoJuventusParaResultado(
        jogo,
        {
          amarelos: nossos.filter((e) => e.tipo === "cartao_amarelo").length,
          vermelhos: nossos.filter((e) => e.tipo === "cartao_vermelho").length,
        },
        { amarelos: v.cartoes_amarelos_adversario, vermelhos: v.cartoes_vermelhos_adversario },
      );
      if (resultado) resultadosDoGrupo.push(resultado);
    }

    // Ordenação pelos critérios de desempate configurados: os da FASE (quando ela tem os seus —
    // §1º do Art. 17: no play in/mata-mata valem só os critérios até a alínea "b") ou os da
    // competição.
    const fase = fases.find((f) => f.id === g.fase_id);
    const criterios = normalizarCriterios(fase?.criterios_desempate ?? competicao.criterios_desempate);
    const tabela = calcularClassificacao(nomesEquipes, resultadosDoGrupo);
    classificacoesPorGrupo.set(g.id, ordenarClassificacao(tabela, criterios, resultadosDoGrupo));
    criteriosPorGrupo.set(g.id, criterios);
    indefinidasPorGrupo.set(g.id, equipesIndefinidas(tabela, criterios, resultadosDoGrupo));
  }

  return {
    competicao,
    fases,
    gruposPorFase,
    gruposById,
    equipesPorGrupo,
    resultadosPorGrupo,
    vinculos,
    jogosById,
    jogosOrdenados,
    disciplina,
    eventosCartao,
    fasesQueZeramAmarelos,
    manuais,
    inscricoes,
    atletasById,
    prazos,
    documentos,
    classificacoesPorGrupo,
    criteriosPorGrupo,
    indefinidasPorGrupo,
    nomesGrupos,
  };
}
