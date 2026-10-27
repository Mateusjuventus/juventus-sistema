/**
 * Ficha individual do atleta em PDF (Profissional e Base) — pedido do Mateus em 2026-10-22: "gerar
 * a ficha do atleta" com "a opção de eu selecionar quais dados que eu quero que apareça". Decisões
 * da conversa: seleção campo a campo (não por bloco inteiro), mas agrupada em 3 seções na hora de
 * marcar e de exibir (Dados Pessoais / Dados Esportivos / Dados do Contrato) — mesma organização já
 * usada nas telas "Ver atleta". Altura, Peso e Situação no BID ficaram de fora por enquanto (não
 * existem no cadastro hoje).
 *
 * Módulo puro (sem depender de React nem do Supabase), mesmo espírito de `lib/futebol/export-
 * colunas.ts` (escolha de campos da exportação em Excel) — mas aqui por CAMPO individual, não por
 * bloco, porque o pedido foi "campo por campo". As rotas de PDF (`app/atletas/[id]/ficha/pdf/
 * route.tsx` e `app/base/atletas/[categoria]/[id]/ficha/pdf/route.tsx`) e o modal
 * (`components/atletas/ficha-atleta-modal.tsx`) só chamam essas funções.
 *
 * Virou a Ficha "mestre" em 2026-10-27 (ver docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-
 * anotacoes-design.md): além dos campos de sempre, ganhou duas seções "ricas" opcionais — Dados de
 * Jogo (gráfico + números) e Anotações (histórico com autor/data) — ver `FichaAtletaExtras` mais
 * abaixo. Essas duas não entram no modelo campo a campo.
 */

export type FichaSecaoChave = "pessoais" | "esportivos" | "contrato";

export interface FichaSecaoDef {
  chave: FichaSecaoChave;
  label: string;
}

export const SECOES_FICHA_ATLETA: FichaSecaoDef[] = [
  { chave: "pessoais", label: "Dados Pessoais" },
  { chave: "esportivos", label: "Dados Esportivos" },
  { chave: "contrato", label: "Dados do Contrato" },
];

export interface CampoFichaAtleta {
  chave: string;
  label: string;
  secao: FichaSecaoChave;
}

export const CAMPOS_FICHA_ATLETA_PROFISSIONAL: CampoFichaAtleta[] = [
  { chave: "nome_completo", label: "Nome completo", secao: "pessoais" },
  { chave: "apelido", label: "Apelido", secao: "pessoais" },
  { chave: "rg", label: "RG", secao: "pessoais" },
  { chave: "cpf", label: "CPF", secao: "pessoais" },
  { chave: "data_nascimento", label: "Data de nascimento", secao: "pessoais" },
  { chave: "naturalidade", label: "Naturalidade", secao: "pessoais" },
  { chave: "telefone", label: "Telefone", secao: "pessoais" },
  { chave: "email", label: "Email", secao: "pessoais" },
  { chave: "alergia", label: "Alergia a medicamento", secao: "pessoais" },
  { chave: "endereco_atual", label: "Endereço atual", secao: "pessoais" },
  { chave: "endereco_origem", label: "Endereço de origem", secao: "pessoais" },
  { chave: "contato_emergencia", label: "Contato de emergência", secao: "pessoais" },

  { chave: "posicao", label: "Posição", secao: "esportivos" },
  { chave: "numero_camisa", label: "Número da camisa", secao: "esportivos" },
  { chave: "numero_cbf", label: "Número CBF", secao: "esportivos" },
  { chave: "pe_dominante", label: "Pé dominante", secao: "esportivos" },
  { chave: "status", label: "Status", secao: "esportivos" },
  { chave: "data_inicio_clube", label: "Data de início no clube", secao: "esportivos" },
  { chave: "empresario", label: "Empresário/representante", secao: "esportivos" },
  { chave: "tamanho_uniforme", label: "Tamanho do uniforme", secao: "esportivos" },

  { chave: "contrato_tipo", label: "Tipo de contrato", secao: "contrato" },
  { chave: "contrato_vigencia", label: "Vigência", secao: "contrato" },
  { chave: "contrato_salario_ctps", label: "Salário CTPS", secao: "contrato" },
  { chave: "contrato_direito_imagem", label: "Direito de imagem", secao: "contrato" },
  { chave: "contrato_bonificacao", label: "Bonificação", secao: "contrato" },
  { chave: "contrato_auxilio_moradia", label: "Auxílio moradia", secao: "contrato" },
  { chave: "contrato_outros", label: "Outros", secao: "contrato" },
  { chave: "contrato_valor_total", label: "Valor total", secao: "contrato" },
];

/** Espelha `CAMPOS_FICHA_ATLETA_PROFISSIONAL`, acrescentando os campos que só existem no cadastro da
 * Base (Responsáveis, Categoria, Classificação G1/G2/G3, Agência, Alojamento, Escola). */
export const CAMPOS_FICHA_ATLETA_BASE: CampoFichaAtleta[] = [
  { chave: "nome_completo", label: "Nome completo", secao: "pessoais" },
  { chave: "apelido", label: "Apelido", secao: "pessoais" },
  { chave: "rg", label: "RG", secao: "pessoais" },
  { chave: "cpf", label: "CPF", secao: "pessoais" },
  { chave: "data_nascimento", label: "Data de nascimento", secao: "pessoais" },
  { chave: "naturalidade", label: "Naturalidade", secao: "pessoais" },
  { chave: "telefone", label: "Telefone", secao: "pessoais" },
  { chave: "email", label: "Email", secao: "pessoais" },
  { chave: "alergia", label: "Alergia a medicamento", secao: "pessoais" },
  { chave: "endereco_atual", label: "Endereço atual", secao: "pessoais" },
  { chave: "endereco_origem", label: "Endereço de origem", secao: "pessoais" },
  { chave: "responsaveis", label: "Responsáveis (mãe/pai)", secao: "pessoais" },
  { chave: "contato_emergencia", label: "Contato de emergência", secao: "pessoais" },

  { chave: "categoria", label: "Categoria", secao: "esportivos" },
  { chave: "posicao", label: "Posição", secao: "esportivos" },
  { chave: "numero_camisa", label: "Número da camisa", secao: "esportivos" },
  { chave: "numero_cbf", label: "Número CBF", secao: "esportivos" },
  { chave: "pe_dominante", label: "Pé dominante", secao: "esportivos" },
  { chave: "status", label: "Status", secao: "esportivos" },
  { chave: "classificacao", label: "Classificação (G1/G2/G3)", secao: "esportivos" },
  { chave: "data_inicio_clube", label: "Data de início no clube", secao: "esportivos" },
  { chave: "empresario", label: "Empresário/representante", secao: "esportivos" },
  { chave: "agencia", label: "Agência", secao: "esportivos" },
  { chave: "tamanho_uniforme", label: "Tamanho do uniforme", secao: "esportivos" },
  { chave: "alojamento", label: "Alojamento e ajuda de custo", secao: "esportivos" },
  { chave: "escola", label: "Escola", secao: "esportivos" },

  { chave: "contrato_tipo", label: "Tipo de contrato", secao: "contrato" },
  { chave: "contrato_vigencia", label: "Vigência", secao: "contrato" },
  { chave: "contrato_salario_ctps", label: "Salário CTPS", secao: "contrato" },
  { chave: "contrato_direito_imagem", label: "Direito de imagem", secao: "contrato" },
  { chave: "contrato_bonificacao", label: "Bonificação", secao: "contrato" },
  { chave: "contrato_auxilio_moradia", label: "Auxílio moradia", secao: "contrato" },
  { chave: "contrato_outros", label: "Outros", secao: "contrato" },
  { chave: "contrato_valor_total", label: "Valor total", secao: "contrato" },
];

/** Estado inicial do modal — todos os campos marcados, pra quem só clica "Gerar PDF" direto continuar
 * recebendo a ficha completa. */
export function todosCamposFichaAtleta(campos: CampoFichaAtleta[]): Set<string> {
  return new Set(campos.map((c) => c.chave));
}

/** Serializa a seleção de campos na query string do PDF (`campos=nome_completo,telefone,...`). Com
 * todos os campos marcados (== ficha completa, igual a sempre) omite o parâmetro inteiro, pra não
 * mudar o link de quem nunca abriu o modal. */
export function camposFichaAtletaParaQueryString(selecionados: Set<string>, campos: CampoFichaAtleta[]): string {
  if (selecionados.size >= campos.length) return "";
  return `campos=${[...selecionados].join(",")}`;
}

/** Caminho inverso — usado pelas rotas de PDF. Sem o parâmetro `campos` (link antigo, ou quem gerou
 * sem passar pelo modal), assume todos os campos marcados (ficha completa). */
export function camposFichaAtletaDaQueryString(
  searchParams: URLSearchParams,
  campos: CampoFichaAtleta[],
): Set<string> {
  const valor = searchParams.get("campos");
  if (valor === null) return todosCamposFichaAtleta(campos);
  return new Set(valor.split(",").filter(Boolean));
}

/** Monta as 3 seções prontas pro documento (`FichaAtletaDocument`) a partir da lista de campos
 * disponíveis, do conjunto de campos marcados no modal e do mapa de valores já formatados pela rota
 * (uma por chave de campo). O bloco de Contrato é tratado à parte: se o atleta não tem contrato
 * vigente, mostra um aviso no lugar da grade de campos em vez de uma lista cheia de "—" (mais claro
 * pra quem olha o PDF). Compartilhado pelas duas rotas de PDF (Profissional e Base) — só o `campos`/
 * `valores` muda entre elas. */
export function construirSecoesFichaAtleta(
  campos: CampoFichaAtleta[],
  selecionados: Set<string>,
  valores: Record<string, string | null>,
  temContratoVigente: boolean,
): { titulo: string; dados: { label: string; valor: string | null }[] | null; avisoVazio?: string }[] {
  return SECOES_FICHA_ATLETA.map((secao) => {
    const camposSelecionadosDaSecao = campos.filter((c) => c.secao === secao.chave && selecionados.has(c.chave));
    if (camposSelecionadosDaSecao.length === 0) {
      return { titulo: secao.label, dados: [] };
    }
    if (secao.chave === "contrato" && !temContratoVigente) {
      return { titulo: secao.label, dados: null, avisoVazio: "Nenhum contrato vigente cadastrado." };
    }
    return {
      titulo: secao.label,
      dados: camposSelecionadosDaSecao.map((c) => ({ label: c.label, valor: valores[c.chave] ?? null })),
    };
  });
}

/**
 * As duas seções "ricas" da Ficha mestre — Dados de Jogo e Anotações (ver docs/superpowers/specs/
 * 2026-10-27-ficha-atleta-dossie-anotacoes-design.md). Ficam fora do modelo campo a campo
 * (`CampoFichaAtleta`) de propósito: não são pares label/valor simples, são um bloco com
 * gráfico+números (Dados de Jogo) ou uma lista com autor/data (Anotações) — por isso o modal marca
 * cada uma com um único checkbox (a seção inteira), nunca campo a campo. Vale pros dois
 * departamentos (Base e Profissional); só a Base mistura o Relatório de Dispensa na timeline de
 * Anotações (ver `montarHistoricoAtletaBase`) — isso é decidido na rota, não aqui.
 */
export interface FichaAtletaExtras {
  dadosDeJogo: boolean;
  anotacoes: boolean;
}

/** Estado inicial do modal pras duas seções extras — também começam marcadas, mesmo espírito de
 * `todosCamposFichaAtleta` (quem só clica "Gerar PDF" direto continua recebendo a ficha completa). */
export function todosExtrasFichaAtleta(): FichaAtletaExtras {
  return { dadosDeJogo: true, anotacoes: true };
}

/** Seleção de Competições pro filtro de "Dados de Jogo" — substituiu o filtro por período (`de`/
 * `ate`) em 2026-10-27 (pedido do Mateus: "quero selecionar as competições que captam a
 * participação dele e eu seleciono. e não por período"). `competicaoIds === undefined` significa
 * "sem filtro" (histórico completo, modo antigo) — mesma semântica de
 * `FiltroEstatisticasAtleta.competicaoIds` em `estatisticas-atleta-query.ts`. */
export interface FiltroCompeticaoFichaAtleta {
  competicaoIds?: string[];
  incluirSemCompeticao?: boolean;
}

/** Serializa os dois checkboxes extras + o filtro de Competição (só relevante quando Dados de Jogo
 * estiver marcado) na query string do PDF. Os checkboxes de seção têm seu próprio parâmetro
 * (ausente = marcado, `"nao"` = desmarcado) — note a inversão em relação a
 * `camposFichaAtletaParaQueryString`: aqui o padrão "tudo marcado" precisa continuar dando uma
 * query vazia pra link antigo nenhum mudar. Já o filtro de Competição funciona ao contrário:
 * `competicaoIds` ausente (undefined) = sem filtro algum (link antigo, ou modal com tudo marcado —
 * o modal só passa `competicaoIds` quando o usuário desmarcou pelo menos uma opção do checklist). */
export function extrasFichaAtletaParaQueryString(
  extras: FichaAtletaExtras,
  filtroCompeticao: FiltroCompeticaoFichaAtleta,
): string {
  const partes: string[] = [];
  if (!extras.dadosDeJogo) partes.push("incluirDadosDeJogo=nao");
  if (!extras.anotacoes) partes.push("incluirAnotacoes=nao");
  if (extras.dadosDeJogo && filtroCompeticao.competicaoIds !== undefined) {
    partes.push(`competicaoIds=${filtroCompeticao.competicaoIds.map(encodeURIComponent).join(",")}`);
    if (filtroCompeticao.incluirSemCompeticao) partes.push("semCompeticao=sim");
  }
  return partes.join("&");
}

/** Caminho inverso — usado pelas rotas de PDF. Sem os parâmetros (link antigo, ou quem gerou sem
 * passar pelo modal, ou modal com todas as Competições marcadas), assume as duas seções marcadas e
 * sem filtro de Competição (histórico completo). */
export function extrasFichaAtletaDaQueryString(
  searchParams: URLSearchParams,
): FichaAtletaExtras & FiltroCompeticaoFichaAtleta {
  const competicaoIdsRaw = searchParams.get("competicaoIds");
  return {
    dadosDeJogo: searchParams.get("incluirDadosDeJogo") !== "nao",
    anotacoes: searchParams.get("incluirAnotacoes") !== "nao",
    competicaoIds: competicaoIdsRaw !== null ? competicaoIdsRaw.split(",").filter(Boolean) : undefined,
    incluirSemCompeticao: searchParams.get("semCompeticao") === "sim",
  };
}

interface EnderecoLinha {
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cepFormatado: string | null;
}

/** Endereço em uma linha, no formato que se escreve em documento — mesmo padrão de
 * `lib/futebol/hotel.ts` (`enderecoCompleto`), mas tomando o CEP já formatado (a ficha formata CEP e
 * telefone antes de montar a linha, pra não duplicar `formatCEP`/`formatTelefone` aqui). */
export function enderecoFichaAtleta(endereco: EnderecoLinha): string | null {
  const limpo = (v: string | null) => (v ?? "").trim();
  const rua = [limpo(endereco.logradouro), limpo(endereco.numero)].filter(Boolean).join(", ");
  const ruaComComplemento = [rua, limpo(endereco.complemento)].filter(Boolean).join(" — ");
  const cidade = limpo(endereco.cidade);
  const uf = limpo(endereco.uf).toUpperCase();
  const cidadeUf = cidade && uf ? `${cidade}/${uf}` : cidade || uf;
  const cep = limpo(endereco.cepFormatado) ? `CEP ${limpo(endereco.cepFormatado)}` : "";

  const linha = [ruaComComplemento, limpo(endereco.bairro), cidadeUf, cep].filter(Boolean).join(", ");
  return linha || null;
}

/**
 * Formatação da lista "jogo a jogo" (ver `GrupoCompeticaoDetalhe`/`JogoDetalheComContexto` em
 * `estatisticas-atleta-query.ts`) — pedido do Mateus em 2026-10-27: "quais jogos ele foi convocado,
 * a minutagem individualizada de cada jogo e quais foram os jogos que ele fez os gols [...] Juventus
 * x Ibrachina 27/10/2026 ás 15h00 - 59min e 2 Gols [...] e coloque o placar do jogo". Compartilhada
 * pelos 3 lugares que mostram essa lista (aba Dados de Jogo, seu PDF, e a Ficha mestre — Profissional
 * e Base). Funções puras de propósito, sem depender de `lib/pdf/logistica-shared` (que importa
 * `@react-pdf/renderer`) pra este módulo continuar livre de dependências — ver docstring no topo.
 */

function formatDataSimples(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Horário do jogo no formato "15h00" (aceita "HH:MM" ou "HH:MM:SS", formato do campo `horario` no
 * banco) — `null` quando não há horário lançado. */
export function formatHorarioExtenso(horario: string | null): string | null {
  if (!horario) return null;
  const [hora, minuto] = horario.split(":");
  if (!hora || !minuto) return null;
  return `${hora}h${minuto}`;
}

/** "27/10/2026 às 15h00" (ou só "27/10/2026" quando o jogo não tem horário lançado). */
export function dataHorarioJogo(dataJogo: string, horario: string | null): string {
  const dataFormatada = formatDataSimples(dataJogo);
  const horarioFormatado = formatHorarioExtenso(horario);
  return horarioFormatado ? `${dataFormatada} às ${horarioFormatado}` : dataFormatada;
}

/** Nome dos dois times na ordem mandante-aware ("Juventus x Adversário" ou "Adversário x Juventus")
 * já com o placar quando os dois gols estiverem lançados — sem placar lançado (jogo futuro, ou
 * resultado ainda não preenchido em `jogos.gols_pro`/`gols_contra`), mostra só "Time x Time" sem
 * números. */
export function confrontoComPlacar(
  adversarioNome: string,
  mandante: boolean,
  golsPro: number | null,
  golsContra: number | null,
): string {
  const nossoNome = "Juventus";
  const timeA = mandante ? nossoNome : adversarioNome;
  const timeB = mandante ? adversarioNome : nossoNome;
  if (golsPro == null || golsContra == null) return `${timeA} x ${timeB}`;
  const golsA = mandante ? golsPro : golsContra;
  const golsB = mandante ? golsContra : golsPro;
  return `${timeA} ${golsA} x ${golsB} ${timeB}`;
}

/** "59min · 2 gols · 1 assistência" — só lista os contadores maiores que zero, sempre com a
 * minutagem primeiro. */
export function resumoDetalheJogo(detalhe: {
  minutos: number;
  gols: number;
  assistencias: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
}): string {
  const partes: string[] = [`${detalhe.minutos}min`];
  if (detalhe.gols > 0) partes.push(detalhe.gols === 1 ? "1 gol" : `${detalhe.gols} gols`);
  if (detalhe.assistencias > 0) {
    partes.push(detalhe.assistencias === 1 ? "1 assistência" : `${detalhe.assistencias} assistências`);
  }
  if (detalhe.cartoesAmarelos > 0) {
    partes.push(detalhe.cartoesAmarelos === 1 ? "1 cartão amarelo" : `${detalhe.cartoesAmarelos} cartões amarelos`);
  }
  if (detalhe.cartoesVermelhos > 0) {
    partes.push(
      detalhe.cartoesVermelhos === 1 ? "1 cartão vermelho" : `${detalhe.cartoesVermelhos} cartões vermelhos`,
    );
  }
  return partes.join(" · ");
}

/** Descrição curta do filtro de Competição ativo, pro subtítulo da lista jogo a jogo/gráfico —
 * "Histórico completo" sem filtro (`competicaoIds === undefined`), ou a lista dos títulos dos
 * grupos encontrados (ver `GrupoCompeticaoDetalhe.titulo`) quando filtrado. Compartilhada pelas 3
 * rotas que montam esse texto (Ficha mestre Profissional/Base + relatório de Dados de Jogo). */
export function textoFiltroCompeticaoAtleta(
  competicaoIds: string[] | undefined,
  titulosGruposEncontrados: string[],
): string {
  if (competicaoIds === undefined) return "Histórico completo";
  if (titulosGruposEncontrados.length === 0) return "Nenhum jogo encontrado nas competições selecionadas";
  return `Competições selecionadas: ${titulosGruposEncontrados.join(", ")}`;
}
