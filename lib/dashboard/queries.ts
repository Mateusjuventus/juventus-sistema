import type { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { somarDias } from "@/lib/programacao/semana";
import { buscarDia, type AtividadeComDetalhes } from "@/lib/programacao/queries";
import { categoriaProgramacaoLabel, type CategoriaProgramacao } from "@/lib/programacao/categoria-programacao";
import { categoriaAtletaLabel } from "@/lib/auth/categorias-base";
import { diasEntre, itensMural, montarItensCalendario, type Urgencia } from "@/lib/futebol/calendario";
import type {
  AtletaContratoRow,
  AtletaRow,
  ComissaoTecnicaRow,
  CompeticaoBaseRow,
  CompeticaoPrazoBaseRow,
  CompeticaoPrazoRow,
  CompeticaoRow,
  EventoCalendarioRow,
  JogoRow,
  SolicitacaoBaseRow,
  SolicitacaoRow,
  TermoRetiradaRow,
} from "@/lib/supabase/types";
import { clube } from "@/lib/clube";

/**
 * Consultas do Dashboard novo (ver docs/superpowers/specs/2026-11-14-dashboard-principal-design.md
 * — item 1 do pedido do Mateus em 14/11/2026, substituindo a Programação Semanal como tela
 * inicial de `/profissional` e `/base`). Cada função recebe a lista de `categorias` que o usuário
 * logado já pode ver (`["profissional"]` pro Profissional; `getCategoriasBasePermitidas()` pra
 * Base) — a MESMA lista que as telas de Atletas/Jogos/Comissão Técnica já usam pra filtrar, nunca
 * uma checagem nova. Isoladas aqui (em vez de dentro de `app/profissional/page.tsx`/`app/base/
 * page.tsx`) só pra não duplicar a mesma query duas vezes (uma por departamento).
 *
 * Nenhuma função abaixo mudou de assinatura na revisão de unificação de 14/11/2026 (ver
 * `lib/dashboard/montar-dashboard.ts`) — continuam recebendo UMA lista de categorias de UM
 * departamento por chamada; quem passou a chamá-las duas vezes (uma por departamento, quando a
 * conta tem os dois) e mesclar o resultado foi `montarDashboard`, não elas.
 */

/** Departamento de origem de um item do Dashboard combinado — ver `lib/dashboard/montar-
 * dashboard.ts`. Só vem preenchido (`item.departamento`) quando a conta tem os dois departamentos
 * liberados; com um só, nenhum item dos tipos abaixo ganha este campo (comportamento inalterado,
 * sem selo, sem ambiguidade). Fica aqui (não em `montar-dashboard.ts`) só pra evitar import
 * circular, já que `components/dashboard/dashboard-view.tsx` também precisa do tipo. */
export type DepartamentoDashboard = "profissional" | "base";

export interface ProximoJogo
  extends Pick<
    JogoRow,
    "id" | "categoria" | "adversario_nome" | "data_jogo" | "horario" | "local_estadio" | "mandante" | "competicao"
  > {}

export async function buscarProximosJogos(
  supabase: ReturnType<typeof createClient>,
  categorias: string[],
  hojeStr: string,
  limite = 3,
): Promise<ProximoJogo[]> {
  const { data } = await supabase
    .from("jogos")
    .select("id, categoria, adversario_nome, data_jogo, horario, local_estadio, mandante, competicao")
    .in("categoria", categorias)
    .gte("data_jogo", hojeStr)
    .order("data_jogo", { ascending: true })
    .order("horario", { ascending: true })
    .limit(limite);
  return (data ?? []) as ProximoJogo[];
}

export interface ContratoAVencer {
  atletaId: string;
  nomeCompleto: string;
  categoria: string;
  vigenciaFim: string;
}

/** Contratos VIGENTES cuja `vigencia_fim` cai nos próximos `dias` dias (padrão 90) — em dois passos
 * (contratos na janela, depois atletas filtrados por categoria) em vez de um join filtrado, pra não
 * depender de sintaxe de filtro em recurso aninhado do PostgREST que não é usada em mais nenhum
 * lugar do projeto. */
export async function buscarContratosAVencer(
  supabase: ReturnType<typeof createClient>,
  categorias: string[],
  hojeStr: string,
  dias = 90,
): Promise<ContratoAVencer[]> {
  const limite = somarDias(hojeStr, dias);
  const { data: contratosData } = await supabase
    .from("atleta_contratos")
    .select("atleta_id, vigencia_fim")
    .eq("vigente", true)
    .not("vigencia_fim", "is", null)
    .gte("vigencia_fim", hojeStr)
    .lte("vigencia_fim", limite);
  const contratos = (contratosData ?? []) as Pick<AtletaContratoRow, "atleta_id" | "vigencia_fim">[];
  if (contratos.length === 0) return [];

  const atletaIds = contratos.map((c) => c.atleta_id);
  const { data: atletasData } = await supabase
    .from("atletas")
    .select("id, nome_completo, categoria")
    .in("id", atletaIds)
    .in("categoria", categorias)
    .eq("ativo", true);
  const atletasPorId = new Map(
    ((atletasData ?? []) as Pick<AtletaRow, "id" | "nome_completo" | "categoria">[]).map((a) => [a.id, a]),
  );

  return contratos
    .map((c): ContratoAVencer | null => {
      const atleta = atletasPorId.get(c.atleta_id);
      if (!atleta) return null;
      return {
        atletaId: atleta.id,
        nomeCompleto: atleta.nome_completo,
        categoria: atleta.categoria,
        vigenciaFim: c.vigencia_fim as string,
      };
    })
    .filter((c): c is ContratoAVencer => c !== null)
    .sort((a, b) => (a.vigenciaFim < b.vigenciaFim ? -1 : 1));
}

export interface Aniversariante {
  id: string;
  nomeCompleto: string;
  dataNascimento: string;
  categoriaLabel: string;
  origem: "atleta" | "comissao_tecnica";
}

/** Aniversariantes do MÊS CALENDÁRIO atual (qualquer dia do mês, passado ou futuro dentro dele) —
 * atleta + comissão técnica juntos, ordenados pelo dia. `mesAtual` no formato "MM" (ex. "11"). */
export async function buscarAniversariantesDoMes(
  supabase: ReturnType<typeof createClient>,
  categorias: string[],
  hojeStr: string,
): Promise<Aniversariante[]> {
  const mesAtual = hojeStr.slice(5, 7);

  const [{ data: atletasData }, { data: comissaoData }] = await Promise.all([
    supabase.from("atletas").select("id, nome_completo, data_nascimento, categoria").in("categoria", categorias).eq("ativo", true),
    supabase
      .from("comissao_tecnica")
      .select("id, nome_completo, data_nascimento, categorias")
      .overlaps("categorias", categorias)
      .eq("ativo", true),
  ]);

  const atletas = ((atletasData ?? []) as Pick<AtletaRow, "id" | "nome_completo" | "data_nascimento" | "categoria">[])
    .filter((a) => a.data_nascimento?.slice(5, 7) === mesAtual)
    .map(
      (a): Aniversariante => ({
        id: a.id,
        nomeCompleto: a.nome_completo,
        dataNascimento: a.data_nascimento,
        categoriaLabel: categoriaAtletaLabel(a.categoria),
        origem: "atleta",
      }),
    );

  const comissao = (
    (comissaoData ?? []) as Pick<ComissaoTecnicaRow, "id" | "nome_completo" | "data_nascimento" | "categorias">[]
  )
    .filter((c) => c.data_nascimento?.slice(5, 7) === mesAtual)
    .map(
      (c): Aniversariante => ({
        id: c.id,
        nomeCompleto: c.nome_completo,
        dataNascimento: c.data_nascimento,
        categoriaLabel: c.categorias.map((cat) => categoriaAtletaLabel(cat)).join(" · "),
        origem: "comissao_tecnica",
      }),
    );

  return [...atletas, ...comissao].sort((a, b) =>
    a.dataNascimento.slice(8, 10) < b.dataNascimento.slice(8, 10) ? -1 : 1,
  );
}

export interface AlertaPrazo {
  origem: "calendario" | "competicao" | "documento";
  titulo: string;
  subtitulo: string | null;
  diasRestantes: number;
  urgencia: Urgencia;
  href: string | null;
}

function urgenciaPorDias(diasRestantes: number): Urgencia {
  return diasRestantes <= 2 ? "urgente" : diasRestantes <= 5 ? "atencao" : "ok";
}

/**
 * "Alertas de prazo" (calendário + competição + documentos) — o mais vago dos 7 blocos pedidos.
 * Implementado com 3 fontes de dado REAIS, reaproveitando o MESMO motor que já existe pra cada uma
 * (nenhuma inventada, nenhuma recalculada do zero) — em 3 funções SEPARADAS (em vez de uma só) de
 * propósito: cada sub-parte é gated por um módulo diferente (ver chamador em `app/profissional/
 * page.tsx`/`app/base/page.tsx`), então a página só paga a consulta de quem o usuário já pode ver.
 */

/** Calendário: eventos de `eventos_calendario` nos próximos `janelaDias` dias, passados por
 * `montarItensCalendario`/`itensMural` (`lib/futebol/calendario.ts`) — a mesma dupla de funções
 * que já monta o widget "Calendário"/"Mural" (ver doc comment delas), nunca recalculado do zero.
 * Sem distinção de departamento (a própria tela de Calendário já trata esses eventos como
 * globais) nem gate de módulo (o item "Calendário" da sidebar também não tem um — ver
 * `components/app-shell.tsx`). `href` sempre aponta pro Calendário do Profissional: é a única tela
 * de calendário do sistema hoje, a Base não tem uma própria (ver `app/profissional/calendario/
 * page.tsx`, "Fora de escopo" original). */
export async function buscarAlertasCalendario(
  supabase: ReturnType<typeof createClient>,
  hojeStr: string,
  janelaDias = 15,
): Promise<AlertaPrazo[]> {
  const limite = somarDias(hojeStr, janelaDias);
  const { data: eventosData } = await supabase.from("eventos_calendario").select("*").gte("data", hojeStr).lte("data", limite);
  const eventos = (eventosData ?? []) as EventoCalendarioRow[];
  const itensCalendario = montarItensCalendario([], eventos);
  return itensMural(itensCalendario, hojeStr, janelaDias).map(
    (item): AlertaPrazo => ({
      origem: "calendario",
      titulo: item.titulo,
      subtitulo: item.subtitulo,
      diasRestantes: item.diasRestantes,
      urgencia: item.urgencia,
      href: "/profissional/calendario",
    }),
  );
}

/** Competição: `competicao_prazos`/`competicao_prazos_base` (ver `CompeticaoPrazoRow`/
 * `CompeticaoPrazoBaseRow` em `lib/supabase/types.ts`, e a aba "Prazos" de cada competição) —
 * prazo real (`data_fim`), não concluído, dentro da janela, de competição ainda não encerrada.
 * Consulta direta (não via `carregarAvisosCompeticao(Base)`/`avisosDaCompeticao(Base)`) de
 * propósito: aquele motor também recalcula suspensão/pendurado/classificação pra CADA competição
 * em andamento, custo alto pra um widget de Dashboard que só precisa dos prazos. */
export async function buscarAlertasCompeticao(
  supabase: ReturnType<typeof createClient>,
  departamento: "profissional" | "base",
  categorias: string[],
  hojeStr: string,
  janelaDias = 15,
): Promise<AlertaPrazo[]> {
  const limite = somarDias(hojeStr, janelaDias);
  const tabelaPrazos = departamento === "base" ? "competicao_prazos_base" : "competicao_prazos";
  const tabelaCompeticoes = departamento === "base" ? "competicoes_base" : "competicoes";
  const prefixoHref = departamento === "base" ? "/base/competicoes" : "/competicoes";

  const { data: prazosData } = await supabase
    .from(tabelaPrazos)
    .select("id, competicao_id, titulo, data_fim, concluido")
    .eq("concluido", false)
    .gte("data_fim", hojeStr)
    .lte("data_fim", limite);
  const prazos = (prazosData ?? []) as Pick<
    CompeticaoPrazoRow | CompeticaoPrazoBaseRow,
    "id" | "competicao_id" | "titulo" | "data_fim"
  >[];
  if (prazos.length === 0) return [];

  const competicaoIds = [...new Set(prazos.map((p) => p.competicao_id))];
  const { data: competicoesData } = await supabase
    .from(tabelaCompeticoes)
    .select("id, nome, categoria, status")
    .in("id", competicaoIds)
    .neq("status", "encerrada");
  const competicoesPorId = new Map(
    ((competicoesData ?? []) as Pick<CompeticaoRow | CompeticaoBaseRow, "id" | "nome" | "categoria">[])
      .filter((c) => departamento === "profissional" || categorias.includes(c.categoria))
      .map((c) => [c.id, c]),
  );
  return prazos
    .map((p): AlertaPrazo | null => {
      const competicao = competicoesPorId.get(p.competicao_id);
      if (!competicao) return null;
      const diasRestantes = Math.max(0, diasEntre(hojeStr, p.data_fim));
      return {
        origem: "competicao",
        titulo: p.titulo,
        subtitulo: `${competicao.nome} · prazo`,
        diasRestantes,
        urgencia: urgenciaPorDias(diasRestantes),
        href: `${prefixoHref}/${p.competicao_id}/prazos`,
      };
    })
    .filter((a): a is AlertaPrazo => a !== null);
}

/** Documentos: Termos de Retirada tipo "emprestimo" ainda não devolvidos (`devolvido_em is null`)
 * cuja `previsao_devolucao` cai dentro da janela — campo genuíno de `TermoRetiradaRow`. Sem
 * distinção de departamento: `TermoRetiradaRow.departamento` é texto livre (setor interno de quem
 * retirou, ex. "Logística"), não um catálogo ligado a Profissional/Base. */
export async function buscarAlertasDocumentos(
  supabase: ReturnType<typeof createClient>,
  hojeStr: string,
  janelaDias = 15,
): Promise<AlertaPrazo[]> {
  const limite = somarDias(hojeStr, janelaDias);
  const { data: termosData } = await supabase
    .from("termos_retirada")
    .select("id, responsavel_nome, tipo, previsao_devolucao, devolvido_em")
    .eq("tipo", "emprestimo")
    .is("devolvido_em", null)
    .not("previsao_devolucao", "is", null)
    .gte("previsao_devolucao", hojeStr)
    .lte("previsao_devolucao", limite);
  return ((termosData ?? []) as Pick<TermoRetiradaRow, "id" | "responsavel_nome" | "previsao_devolucao">[]).map(
    (t): AlertaPrazo => {
      const diasRestantes = Math.max(0, diasEntre(hojeStr, t.previsao_devolucao as string));
      return {
        origem: "documento",
        titulo: `Devolução pendente — ${t.responsavel_nome}`,
        subtitulo: "Termo de retirada",
        diasRestantes,
        urgencia: urgenciaPorDias(diasRestantes),
        href: null,
      };
    },
  );
}

export interface AtletaDm {
  id: string;
  nomeCompleto: string;
  categoriaLabel: string;
  /** Signed URL (1h) da foto do atleta, ou `null` sem foto cadastrada — pedido do Mateus em
   * 16/11/2026, pra identificar mais rápido quem é quem na lista do Dashboard (mesmo avatar
   * pequeno/com iniciais de fallback que já existe em `AtletaAvatarCirculo`). */
  fotoUrl: string | null;
}

export async function buscarAtletasEmDm(
  supabase: ReturnType<typeof createClient>,
  categorias: string[],
): Promise<AtletaDm[]> {
  const { data } = await supabase
    .from("atletas")
    .select("id, nome_completo, categoria, foto_path")
    .in("categoria", categorias)
    .eq("ativo", true)
    .eq("status", "departamento_medico")
    .order("nome_completo", { ascending: true });
  const atletas = (data ?? []) as Pick<AtletaRow, "id" | "nome_completo" | "categoria" | "foto_path">[];
  return Promise.all(
    atletas.map(async (a): Promise<AtletaDm> => ({
      id: a.id,
      nomeCompleto: a.nome_completo,
      categoriaLabel: categoriaAtletaLabel(a.categoria),
      fotoUrl: await getSignedPhotoUrl(supabase, a.foto_path),
    })),
  );
}

export interface SolicitacaoPendente {
  id: string;
  numero: number;
  solicitante: string;
  tipo: string;
  prazoSugerido: string | null;
}

/**
 * Solicitações com status "pendente" — Profissional e Base NÃO compartilham tabela: `/solicitacoes`
 * (`app/solicitacoes/page.tsx`) lê de `solicitacoes`, `/base/solicitacoes`
 * (`app/base/solicitacoes/page.tsx`) lê de `solicitacoes_base` — cada rota com seu próprio
 * `actions.ts`, nunca unificadas como `atletas`/`comissao_tecnica` foram em 28/10/2026. Por isso
 * esta função recebe `tabela` explicitamente, pra buscar da tabela certa pro departamento certo, em
 * vez de uma função genérica que só acertaria por acaso um dos dois lados. Espelha a MESMA regra de
 * autoria das duas páginas (ver docs/superpowers/specs/2026-09-13-solicitacoes-autoria-
 * visibilidade-design.md): quem não é master só vê as próprias solicitações (`created_by =
 * user.id`). Só é chamada quando o módulo "solicitacoes" está liberado pro usuário
 * (`getModulosPermitidos`/`getModulosBasePermitidos` em `lib/auth/role.ts`, checado por quem chama
 * esta função). */
export async function buscarSolicitacoesPendentes(
  supabase: ReturnType<typeof createClient>,
  tabela: "solicitacoes" | "solicitacoes_base",
  master: boolean,
  userId: string | null,
  limite = 5,
): Promise<SolicitacaoPendente[]> {
  let query = supabase
    .from(tabela)
    .select("id, numero, solicitante, tipo, prazo_sugerido")
    .eq("status", "pendente")
    .order("prazo_sugerido", { ascending: true, nullsFirst: false })
    .limit(limite);
  if (!master && userId) query = query.eq("created_by", userId);

  const { data } = await query;
  return (
    (data ?? []) as Pick<
      SolicitacaoRow | SolicitacaoBaseRow,
      "id" | "numero" | "solicitante" | "tipo" | "prazo_sugerido"
    >[]
  ).map((s) => ({ id: s.id, numero: s.numero, solicitante: s.solicitante, tipo: s.tipo, prazoSugerido: s.prazo_sugerido }));
}

export interface ProgramacaoHojeItem {
  id: string;
  horarioInicio: string | null;
  nome: string;
  categoriaLabel: string;
}

/** Atividades de HOJE da Programação Semanal, de uma ou mais categorias (pro Profissional é só
 * `["profissional"]`, uma chamada; pra Base são as categorias permitidas, uma chamada por
 * categoria — `buscarDia` já existe e filtra por categoria escalar, então não dava pra pedir várias
 * de uma vez sem mudar a assinatura dela, e não valia a pena mudar um módulo compartilhado só por
 * isso). */
export async function buscarProgramacaoDeHoje(
  supabase: ReturnType<typeof createClient>,
  categorias: CategoriaProgramacao[],
  hojeStr: string,
): Promise<ProgramacaoHojeItem[]> {
  const porCategoria = await Promise.all(
    categorias.map(async (categoria) => {
      const atividades: AtividadeComDetalhes[] = await buscarDia(supabase, categoria, hojeStr);
      return atividades.map(
        (a): ProgramacaoHojeItem => ({
          id: a.id,
          horarioInicio: a.horario_inicio,
          nome: a.jogo ? `${a.jogo.mandante ? `${clube.nomeCurto} x ` : ""}${a.jogo.adversario_nome}${a.jogo.mandante ? "" : ` x ${clube.nomeCurto}`}` : a.nome,
          categoriaLabel: categoriaProgramacaoLabel(categoria),
        }),
      );
    }),
  );
  return porCategoria.flat().sort((a, b) => (a.horarioInicio ?? "99:99").localeCompare(b.horarioInicio ?? "99:99"));
}
