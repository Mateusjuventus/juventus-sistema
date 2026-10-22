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
