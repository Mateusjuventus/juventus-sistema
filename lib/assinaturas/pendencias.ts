import { createClient } from "@/lib/supabase/server";
import { podeAssinarPapel } from "./config";
import type {
  AtletaBaseRow,
  CaptacaoBaseRow,
  ConfiguracaoDispensaBaseRow,
  ConfiguracaoFinanceiroBaseRow,
  ConfiguracaoFinanceiroRow,
  ConfiguracaoParecerCaptacaoBaseRow,
  ConfiguracaoSolicitacoesBaseRow,
  ConfiguracaoSolicitacoesRow,
  GastoJogoBaseRow,
  GastoJogoRow,
  JogoBaseRow,
  JogoRow,
  SolicitacaoBaseRow,
  SolicitacaoRow,
} from "@/lib/supabase/types";

type Supabase = ReturnType<typeof createClient>;

/**
 * Central "Documentos Pendentes de Assinatura" (Fase 3 — ver docs/superpowers/specs/
 * 2026-08-28-assinatura-digital-notificacoes-design.md): cruza os 5 tipos de documento e devolve
 * só os papéis que ESSA pessoa logada pode assinar agora e ainda estão pendentes — a mesma
 * pergunta que cada tela individual (`papeisQuePossoAssinar`) já responde, só que juntando tudo
 * num lugar só. Existe pra quem não recebeu (ou perdeu) o aviso do sino/push ainda ter como achar
 * o que falta.
 */
export interface PendenciaAssinatura {
  titulo: string;
  papelRotulo: string;
  link: string;
}

/** Uma consulta só pra descobrir quais papéis já foram assinados em vários documentos do mesmo
 * tipo de uma vez — evita uma consulta por documento (N+1). */
async function assinaturasPorDocumento(
  supabase: Supabase,
  tipoDocumento: string,
  documentoIds: string[],
): Promise<Map<string, Set<string>>> {
  const mapa = new Map<string, Set<string>>();
  if (documentoIds.length === 0) return mapa;
  const { data } = await supabase
    .from("assinaturas_documento")
    .select("documento_id, papel")
    .eq("tipo_documento", tipoDocumento)
    .in("documento_id", documentoIds);
  for (const row of data ?? []) {
    if (!mapa.has(row.documento_id)) mapa.set(row.documento_id, new Set());
    mapa.get(row.documento_id)!.add(row.papel);
  }
  return mapa;
}

/** Relatório de Dispensa — só o papel "Departamento" (o "treinador" é resolvido na área própria
 * dele, fora do sistema padrão, e não aparece aqui). */
async function pendenciasDispensa(supabase: Supabase, userId: string, master: boolean): Promise<PendenciaAssinatura[]> {
  const { data: configData } = await supabase.from("configuracoes_dispensa_base").select("*").limit(1).maybeSingle();
  const config = configData as ConfiguracaoDispensaBaseRow | null;
  if (!podeAssinarPapel(config?.departamento_usuario_id, userId, master)) return [];

  const { data } = await supabase
    .from("atletas_base")
    .select("id, categoria, nome_completo")
    .not("dispensa_data", "is", null);
  const atletas = (data ?? []) as Pick<AtletaBaseRow, "id" | "categoria" | "nome_completo">[];
  if (atletas.length === 0) return [];

  const assinado = await assinaturasPorDocumento(
    supabase,
    "dispensa_base",
    atletas.map((a) => a.id),
  );

  return atletas
    .filter((a) => !assinado.get(a.id)?.has("departamento"))
    .map((a) => ({
      titulo: `Relatório de Dispensa — ${a.nome_completo}`,
      papelRotulo: "Departamento de Futebol de Base",
      link: `/base/atletas/${a.categoria}/${a.id}/dispensa`,
    }));
}

/** Parecer Final de Avaliação (candidatos da Captação/Base). */
async function pendenciasParecer(supabase: Supabase, userId: string, master: boolean): Promise<PendenciaAssinatura[]> {
  const { data: configData } = await supabase
    .from("configuracoes_parecer_captacao_base")
    .select("assinaturas")
    .limit(1)
    .maybeSingle();
  const config = configData as Pick<ConfiguracaoParecerCaptacaoBaseRow, "assinaturas"> | null;
  const assinaturasConfig = config?.assinaturas ?? [];
  // Linha "ehTreinador" nunca aparece aqui: assina sozinha quando o Treinador envia o parecer
  // (app/treinador/actions.ts), não é algo que apareça pra alguém assinar manualmente.
  const papeisElegiveis = assinaturasConfig.filter(
    (a) => a.nome.trim() && !a.ehTreinador && podeAssinarPapel(a.usuarioId, userId, master),
  );
  if (papeisElegiveis.length === 0) return [];

  const { data } = await supabase
    .from("captacao_base")
    .select("id, nome_completo, numero")
    .neq("status", "inscricao");
  const candidatos = (data ?? []) as Pick<CaptacaoBaseRow, "id" | "nome_completo" | "numero">[];
  if (candidatos.length === 0) return [];

  const assinado = await assinaturasPorDocumento(
    supabase,
    "parecer_captacao_base",
    candidatos.map((c) => c.id),
  );

  const pendencias: PendenciaAssinatura[] = [];
  for (const candidato of candidatos) {
    const jaAssinados = assinado.get(candidato.id) ?? new Set();
    for (const papel of papeisElegiveis) {
      if (jaAssinados.has(papel.id)) continue;
      pendencias.push({
        titulo: `Parecer Final — ${candidato.nome_completo} (Nº ${candidato.numero})`,
        papelRotulo: papel.cargo || papel.nome,
        link: `/base/captacao/${candidato.id}`,
      });
    }
  }
  return pendencias;
}

/** Financeiro de jogo (Orçamento/Despesas), Profissional e Base — só entra na lista se o jogo já
 * tiver gastos lançados (mesma condição que já gate o bloco de assinatura na tela do jogo). */
async function pendenciasFinanceiro(supabase: Supabase, userId: string, master: boolean): Promise<PendenciaAssinatura[]> {
  async function paraDepartamento(
    tabelaJogos: "jogos" | "jogos_base",
    tabelaGastos: "gastos_jogo" | "gastos_jogo_base",
    tabelaConfig: "configuracoes_financeiro" | "configuracoes_financeiro_base",
    linkBase: (jogoId: string) => string,
  ): Promise<PendenciaAssinatura[]> {
    const { data: configData } = await supabase.from(tabelaConfig).select("*").limit(1).maybeSingle();
    const config = configData as (ConfiguracaoFinanceiroRow | ConfiguracaoFinanceiroBaseRow) | null;
    const papeisElegiveis = (["assinatura1", "assinatura2"] as const).filter((papel) =>
      podeAssinarPapel(
        papel === "assinatura1" ? config?.assinatura1_usuario_id : config?.assinatura2_usuario_id,
        userId,
        master,
      ),
    );
    if (papeisElegiveis.length === 0) return [];

    const { data: jogosData } = await supabase.from(tabelaJogos).select("id, adversario_nome, data_jogo");
    const jogos = (jogosData ?? []) as Pick<JogoRow | JogoBaseRow, "id" | "adversario_nome" | "data_jogo">[];
    if (jogos.length === 0) return [];

    const { data: gastosData } = await supabase
      .from(tabelaGastos)
      .select("jogo_id, valor_efetuado")
      .in(
        "jogo_id",
        jogos.map((j) => j.id),
      );
    const gastos = (gastosData ?? []) as Pick<GastoJogoRow | GastoJogoBaseRow, "jogo_id" | "valor_efetuado">[];
    const gastosPorJogo = new Map<string, { total: number; temEfetuado: boolean }>();
    for (const g of gastos) {
      const atual = gastosPorJogo.get(g.jogo_id) ?? { total: 0, temEfetuado: false };
      atual.total += 1;
      if (g.valor_efetuado !== null) atual.temEfetuado = true;
      gastosPorJogo.set(g.jogo_id, atual);
    }

    const jogoIdsComGastos = jogos.filter((j) => (gastosPorJogo.get(j.id)?.total ?? 0) > 0).map((j) => j.id);
    const assinadoOrcamento = await assinaturasPorDocumento(supabase, "orcamento_jogo", jogoIdsComGastos);
    const assinadoDespesas = await assinaturasPorDocumento(supabase, "despesas_jogo", jogoIdsComGastos);

    const pendencias: PendenciaAssinatura[] = [];
    for (const jogo of jogos) {
      const info = gastosPorJogo.get(jogo.id);
      if (!info || info.total === 0) continue;
      const titulo = `Financeiro — vs. ${jogo.adversario_nome}, ${formatDataBr(jogo.data_jogo)}`;
      const jaOrcamento = assinadoOrcamento.get(jogo.id) ?? new Set();
      const jaDespesas = assinadoDespesas.get(jogo.id) ?? new Set();
      for (const papel of papeisElegiveis) {
        const rotulo = (papel === "assinatura1" ? config?.assinatura1_cargo : config?.assinatura2_cargo) || papel;
        if (!jaOrcamento.has(papel)) {
          pendencias.push({ titulo: `${titulo} (Orçamento)`, papelRotulo: rotulo, link: linkBase(jogo.id) });
        }
        if (info.temEfetuado && !jaDespesas.has(papel)) {
          pendencias.push({ titulo: `${titulo} (Despesas)`, papelRotulo: rotulo, link: linkBase(jogo.id) });
        }
      }
    }
    return pendencias;
  }

  const [profissional, base] = await Promise.all([
    paraDepartamento("jogos", "gastos_jogo", "configuracoes_financeiro", (id) => `/jogos/${id}/financeiro`),
    paraDepartamento("jogos_base", "gastos_jogo_base", "configuracoes_financeiro_base", (id) => `/base/jogos/${id}/financeiro`),
  ]);
  return [...profissional, ...base];
}

/** Solicitações, Profissional e Base. */
async function pendenciasSolicitacao(supabase: Supabase, userId: string, master: boolean): Promise<PendenciaAssinatura[]> {
  async function paraDepartamento(
    tabelaSolicitacoes: "solicitacoes" | "solicitacoes_base",
    tabelaConfig: "configuracoes_solicitacoes" | "configuracoes_solicitacoes_base",
    linkBase: (id: string) => string,
  ): Promise<PendenciaAssinatura[]> {
    const { data: configData } = await supabase.from(tabelaConfig).select("*").limit(1).maybeSingle();
    const config = configData as (ConfiguracaoSolicitacoesRow | ConfiguracaoSolicitacoesBaseRow) | null;

    const { data } = await supabase
      .from(tabelaSolicitacoes)
      .select("id, numero, tipo, created_by")
      .eq("status", "pendente");
    const solicitacoes = (data ?? []) as Pick<SolicitacaoRow | SolicitacaoBaseRow, "id" | "numero" | "tipo" | "created_by">[];
    if (solicitacoes.length === 0) return [];

    const assinado = await assinaturasPorDocumento(
      supabase,
      "solicitacao",
      solicitacoes.map((s) => s.id),
    );

    const pendencias: PendenciaAssinatura[] = [];
    for (const s of solicitacoes) {
      const jaAssinados = assinado.get(s.id) ?? new Set();
      const titulo = `Solicitação Nº ${String(s.numero).padStart(3, "0")} (${rotuloTipoSolicitacao(s.tipo)})`;
      const podeSolicitante = s.created_by ? s.created_by === userId : master;
      if (podeSolicitante && !jaAssinados.has("solicitante")) {
        pendencias.push({ titulo, papelRotulo: "Solicitante", link: linkBase(s.id) });
      }
      if (podeAssinarPapel(config?.encarregado_usuario_id, userId, master) && !jaAssinados.has("encarregado")) {
        pendencias.push({
          titulo,
          papelRotulo: config?.encarregado_cargo || "Encarregado do Departamento",
          link: linkBase(s.id),
        });
      }
    }
    return pendencias;
  }

  const [profissional, base] = await Promise.all([
    paraDepartamento("solicitacoes", "configuracoes_solicitacoes", (id) => `/solicitacoes/${id}`),
    paraDepartamento("solicitacoes_base", "configuracoes_solicitacoes_base", (id) => `/base/solicitacoes/${id}`),
  ]);
  return [...profissional, ...base];
}

function rotuloTipoSolicitacao(tipo: string): string {
  const rotulos: Record<string, string> = {
    compra: "Compra",
    pagamento: "Pagamento",
    exame_medico: "Exame Médico",
    reembolso: "Reembolso",
    passagem_aerea: "Passagem Aérea",
    transporte: "Transporte",
    hospedagem: "Hospedagem",
  };
  return rotulos[tipo] ?? tipo;
}

function formatDataBr(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export async function buscarPendenciasDoUsuario(userId: string, master: boolean): Promise<PendenciaAssinatura[]> {
  const supabase = createClient();
  const [dispensa, parecer, financeiro, solicitacao] = await Promise.all([
    pendenciasDispensa(supabase, userId, master),
    pendenciasParecer(supabase, userId, master),
    pendenciasFinanceiro(supabase, userId, master),
    pendenciasSolicitacao(supabase, userId, master),
  ]);
  return [...dispensa, ...parecer, ...financeiro, ...solicitacao];
}
