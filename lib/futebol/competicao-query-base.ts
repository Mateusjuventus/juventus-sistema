import type { createClient } from "@/lib/supabase/server";
import { hojeBrasilia } from "@/lib/data-brasil";
import type {
  CompeticaoBaseComTemporadaRow,
  CompeticaoDocumentoBaseRow,
  CompeticaoFaseBaseRow,
  CompeticaoGrupoEquipeBaseRow,
  CompeticaoGrupoResultadoBaseRow,
  CompeticaoGrupoBaseRow,
  CompeticaoInscricaoBaseRow,
  CompeticaoJogoBaseRow,
  CompeticaoPrazoBaseRow,
  CompeticaoSuspensaoManualBaseRow,
  JogoBaseRow,
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
 * Espelha lib/futebol/competicao-query.ts (Profissional) para o Futebol de Base — ver
 * docs/superpowers/specs/2026-10-03-competicoes-base-design.md. Mesma lógica, só trocando as
 * tabelas-fonte pelas `_base` (jogos_base, atletas_base, sumulas_base, sumula_eventos_base,
 * competicao_*_base).
 */

/** Só o que as telas do módulo precisam de cada atleta. */
export type AtletaResumoBase = { id: string; nome_completo: string; posicao: string | null };

export interface CompeticaoBaseCarregada {
  competicao: CompeticaoBaseComTemporadaRow;
  fases: CompeticaoFaseBaseRow[];
  gruposPorFase: Map<string, CompeticaoGrupoBaseRow[]>;
  gruposById: Map<string, CompeticaoGrupoBaseRow>;
  equipesPorGrupo: Map<string, CompeticaoGrupoEquipeBaseRow[]>;
  resultadosPorGrupo: Map<string, CompeticaoGrupoResultadoBaseRow[]>;
  vinculos: CompeticaoJogoBaseRow[];
  jogosById: Map<string, JogoBaseRow>;
  jogosOrdenados: JogoDisciplina[];
  disciplina: DisciplinaCompeticao;
  eventosCartao: CartaoEvento[];
  fasesQueZeramAmarelos: Set<string>;
  manuais: CompeticaoSuspensaoManualBaseRow[];
  inscricoes: CompeticaoInscricaoBaseRow[];
  atletasById: Map<string, AtletaResumoBase>;
  prazos: CompeticaoPrazoBaseRow[];
  documentos: CompeticaoDocumentoBaseRow[];
  classificacoesPorGrupo: Map<string, LinhaClassificacao[]>;
  criteriosPorGrupo: Map<string, CriterioDesempate[]>;
  indefinidasPorGrupo: Map<string, Set<string>>;
  nomesGrupos: Map<string, string>;
}

export function confrontoResumoBase(jogo: Pick<JogoBaseRow, "mandante" | "adversario_nome">): string {
  return jogo.mandante ? `${JUVENTUS_NOME} x ${jogo.adversario_nome}` : `${jogo.adversario_nome} x ${JUVENTUS_NOME}`;
}

export function confrontoComDataBase(
  jogo: Pick<JogoBaseRow, "mandante" | "adversario_nome" | "data_jogo">,
): string {
  const [, mes, dia] = jogo.data_jogo.split("-");
  return `${confrontoResumoBase(jogo)} (${dia}/${mes})`;
}

export async function carregarCompeticaoBase(
  supabase: ReturnType<typeof createClient>,
  competicaoId: string,
): Promise<CompeticaoBaseCarregada | null> {
  const { data: competicaoData } = await supabase
    .from("competicoes_base")
    .select("*, temporada:temporadas_base(id, nome)")
    .eq("id", competicaoId)
    .maybeSingle();
  if (!competicaoData) return null;
  const competicao = competicaoData as unknown as CompeticaoBaseComTemporadaRow;

  const [
    { data: fasesData },
    { data: vinculosData },
    { data: manuaisData },
    { data: inscricoesData },
    { data: prazosData },
    { data: documentosData },
  ] = await Promise.all([
    supabase
      .from("competicao_fases_base")
      .select("*")
      .eq("competicao_id", competicaoId)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("competicao_jogos_base").select("*").eq("competicao_id", competicaoId),
    supabase.from("competicao_suspensoes_manuais_base").select("*").eq("competicao_id", competicaoId),
    supabase.from("competicao_inscricoes_base").select("*").eq("competicao_id", competicaoId),
    supabase
      .from("competicao_prazos_base")
      .select("*")
      .eq("competicao_id", competicaoId)
      .order("data_fim", { ascending: true }),
    supabase
      .from("competicao_documentos_base")
      .select("*")
      .eq("competicao_id", competicaoId)
      .order("created_at", { ascending: false }),
  ]);

  const fases = (fasesData ?? []) as CompeticaoFaseBaseRow[];
  const vinculos = (vinculosData ?? []) as CompeticaoJogoBaseRow[];
  const manuais = (manuaisData ?? []) as CompeticaoSuspensaoManualBaseRow[];
  const inscricoes = (inscricoesData ?? []) as CompeticaoInscricaoBaseRow[];
  const prazos = (prazosData ?? []) as CompeticaoPrazoBaseRow[];
  const documentos = (documentosData ?? []) as CompeticaoDocumentoBaseRow[];

  const faseIds = fases.map((f) => f.id);
  const { data: gruposData } = faseIds.length
    ? await supabase
        .from("competicao_grupos_base")
        .select("*")
        .in("fase_id", faseIds)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };
  const grupos = (gruposData ?? []) as CompeticaoGrupoBaseRow[];
  const grupoIds = grupos.map((g) => g.id);

  const jogoIds = vinculos.map((v) => v.jogo_id);

  const [{ data: equipesData }, { data: resultadosData }, { data: jogosData }] = await Promise.all([
    grupoIds.length
      ? supabase
          .from("competicao_grupo_equipes_base")
          .select("*")
          .in("grupo_id", grupoIds)
          .order("ordem", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    grupoIds.length
      ? supabase
          .from("competicao_grupo_resultados_base")
          .select("*")
          .in("grupo_id", grupoIds)
          .order("data_jogo", { ascending: true, nullsFirst: true })
      : Promise.resolve({ data: [] }),
    jogoIds.length
      ? supabase.from("jogos_base").select("*").in("id", jogoIds)
      : Promise.resolve({ data: [] }),
  ]);

  const equipes = (equipesData ?? []) as CompeticaoGrupoEquipeBaseRow[];
  const resultados = (resultadosData ?? []) as CompeticaoGrupoResultadoBaseRow[];
  const jogos = (jogosData ?? []) as JogoBaseRow[];
  const jogosById = new Map(jogos.map((j) => [j.id, j]));

  // Eventos de cartão das súmulas dos jogos vinculados — a ÚNICA origem de cartões do módulo.
  let eventosCartao: CartaoEvento[] = [];
  if (jogoIds.length) {
    const { data: sumulasData } = await supabase.from("sumulas_base").select("id, jogo_id").in("jogo_id", jogoIds);
    const sumulas = (sumulasData ?? []) as { id: string; jogo_id: string }[];
    if (sumulas.length) {
      const jogoPorSumula = new Map(sumulas.map((s) => [s.id, s.jogo_id]));
      const { data: eventosData } = await supabase
        .from("sumula_eventos_base")
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
    .filter((j): j is JogoBaseRow => Boolean(j))
    .sort((a, b) => (a.data_jogo === b.data_jogo ? a.id.localeCompare(b.id) : a.data_jogo.localeCompare(b.data_jogo)))
    .map((j) => ({
      jogoId: j.id,
      data: j.data_jogo,
      confronto: confrontoComDataBase(j),
      faseId: fasePorJogo.get(j.id) ?? null,
    }));

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

  const atletaIds = new Set<string>([
    ...inscricoes.map((i) => i.atleta_id),
    ...disciplina.cartoes.map((c) => c.atletaId),
    ...disciplina.suspensoes.map((s) => s.atletaId),
  ]);
  let atletasById = new Map<string, AtletaResumoBase>();
  if (atletaIds.size) {
    const { data: atletasData } = await supabase
      .from("atletas_base")
      .select("id, nome_completo, posicao")
      .in("id", Array.from(atletaIds));
    atletasById = new Map(((atletasData ?? []) as AtletaResumoBase[]).map((a) => [a.id, a]));
  }

  const gruposPorFase = new Map<string, CompeticaoGrupoBaseRow[]>();
  for (const g of grupos) {
    const lista = gruposPorFase.get(g.fase_id) ?? [];
    lista.push(g);
    gruposPorFase.set(g.fase_id, lista);
  }
  const gruposById = new Map(grupos.map((g) => [g.id, g]));
  const nomesGrupos = new Map(grupos.map((g) => [g.id, g.nome]));

  const equipesPorGrupo = new Map<string, CompeticaoGrupoEquipeBaseRow[]>();
  for (const e of equipes) {
    const lista = equipesPorGrupo.get(e.grupo_id) ?? [];
    lista.push(e);
    equipesPorGrupo.set(e.grupo_id, lista);
  }

  const resultadosPorGrupo = new Map<string, CompeticaoGrupoResultadoBaseRow[]>();
  for (const r of resultados) {
    const lista = resultadosPorGrupo.get(r.grupo_id) ?? [];
    lista.push(r);
    resultadosPorGrupo.set(r.grupo_id, lista);
  }

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
