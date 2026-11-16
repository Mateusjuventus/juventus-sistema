/**
 * Ficha individual da Comissão Técnica/Diretoria em PDF — ganhou o seletor de campos ("quais dados
 * eu quero que apareça") em 14/11/2026, mesmo dia da Vigência PJ: o comentário original de
 * `app/comissao-tecnica/[id]/ficha/pdf/route.tsx` dizia "aqui a ficha é sempre completa... sem nada
 * pra filtrar", mas o Mateus pediu a mesma escolha que o atleta já tem.
 *
 * Mesmo modelo campo a campo de `lib/futebol/ficha-atleta.ts` (módulo puro, sem React/Supabase),
 * só que bem mais simples: 4 seções (Dados pessoais / Endereço / Função / Dados de pagamento), sem
 * as seções "ricas" (Dados de Jogo/Anotações) que só existem pro atleta. A lista de campos
 * disponíveis muda com o Tipo de contrato da pessoa — "Vigência: Término" e os campos de pagamento
 * PJ só aparecem pra quem é PJ; Chave PIX/Banco/Agência/Conta só pra quem é CLT.
 */

export type FichaComissaoSecaoChave = "pessoais" | "endereco" | "funcao" | "pagamento";

export interface FichaComissaoSecaoDef {
  chave: FichaComissaoSecaoChave;
  label: string;
}

export const SECOES_FICHA_COMISSAO: FichaComissaoSecaoDef[] = [
  { chave: "pessoais", label: "Dados pessoais" },
  { chave: "endereco", label: "Endereço" },
  { chave: "funcao", label: "Função" },
  { chave: "pagamento", label: "Dados de pagamento" },
];

export interface CampoFichaComissao {
  chave: string;
  label: string;
  secao: FichaComissaoSecaoChave;
}

/** Campos sempre disponíveis, independente do Tipo de contrato. "endereco" é um campo único (CEP +
 * Endereço juntos) porque a seção trata os dois como um par inseparável, com aviso próprio quando a
 * pessoa não tem nenhum dos dois cadastrados — ver a rota de PDF. */
const CAMPOS_FICHA_COMISSAO_BASE: CampoFichaComissao[] = [
  { chave: "nome_completo", label: "Nome completo", secao: "pessoais" },
  { chave: "apelido", label: "Apelido", secao: "pessoais" },
  { chave: "rg", label: "RG", secao: "pessoais" },
  { chave: "cpf", label: "CPF", secao: "pessoais" },
  { chave: "data_nascimento", label: "Data de nascimento", secao: "pessoais" },
  { chave: "telefone", label: "Telefone", secao: "pessoais" },
  { chave: "email", label: "E-mail", secao: "pessoais" },

  { chave: "endereco", label: "CEP e Endereço", secao: "endereco" },

  { chave: "categorias", label: "Categoria(s)", secao: "funcao" },
  { chave: "funcao", label: "Função/cargo", secao: "funcao" },
  { chave: "tipo_contrato", label: "Tipo de contrato", secao: "funcao" },
  { chave: "setor", label: "Setor", secao: "funcao" },
  { chave: "data_inicio", label: "Quando iniciou", secao: "funcao" },
  { chave: "valor_salario", label: "Salário mensal", secao: "funcao" },
  { chave: "status", label: "Status (Ativo/Inativo)", secao: "funcao" },
];

const CAMPOS_FICHA_COMISSAO_CLT_EXTRA: CampoFichaComissao[] = [
  { chave: "pagamento_chave_pix", label: "Chave PIX", secao: "pagamento" },
  { chave: "pagamento_banco", label: "Banco", secao: "pagamento" },
  { chave: "pagamento_agencia", label: "Agência", secao: "pagamento" },
  { chave: "pagamento_conta", label: "Conta", secao: "pagamento" },
];

const CAMPOS_FICHA_COMISSAO_PJ_EXTRA: CampoFichaComissao[] = [
  { chave: "data_fim", label: "Vigência: Término", secao: "funcao" },
  { chave: "pagamento_empresa_nome", label: "Nome da Empresa", secao: "pagamento" },
  { chave: "pagamento_empresa_cnpj", label: "CNPJ", secao: "pagamento" },
  { chave: "pagamento_empresa_chave_pix", label: "Chave PIX da empresa", secao: "pagamento" },
];

/** Lista de campos disponíveis pro modal/PDF desta pessoa — muda com o Tipo de contrato (ver
 * doc-comment do arquivo). "Quando iniciou" vira "Vigência: Início" pra PJ, mesmo rótulo já usado
 * no resto do cadastro (cadastro/tela "Ver"/Excel). */
export function camposFichaComissao(tipoContrato: string | null): CampoFichaComissao[] {
  const base = CAMPOS_FICHA_COMISSAO_BASE.map((c) =>
    c.chave === "data_inicio" && tipoContrato === "pj" ? { ...c, label: "Vigência: Início" } : c,
  );
  if (tipoContrato === "pj") return [...base, ...CAMPOS_FICHA_COMISSAO_PJ_EXTRA];
  if (tipoContrato === "clt") return [...base, ...CAMPOS_FICHA_COMISSAO_CLT_EXTRA];
  return base;
}

/** Estado inicial do modal — todos os campos marcados, pra quem só clica "Gerar PDF" direto
 * continuar recebendo a ficha completa (mesmo comportamento de sempre). */
export function todosCamposFichaComissao(campos: CampoFichaComissao[]): Set<string> {
  return new Set(campos.map((c) => c.chave));
}

/** Serializa a seleção de campos na query string do PDF (`campos=nome_completo,telefone,...`). Com
 * todos os campos marcados (== ficha completa) omite o parâmetro inteiro, pra não mudar o link de
 * quem nunca abriu o modal. */
export function camposFichaComissaoParaQueryString(selecionados: Set<string>, campos: CampoFichaComissao[]): string {
  if (selecionados.size >= campos.length) return "";
  return `campos=${[...selecionados].join(",")}`;
}

/** Caminho inverso — usado pela rota de PDF. Sem o parâmetro `campos` (link antigo, ou quem gerou
 * sem passar pelo modal), assume todos os campos marcados (ficha completa). */
export function camposFichaComissaoDaQueryString(
  searchParams: URLSearchParams,
  campos: CampoFichaComissao[],
): Set<string> {
  const valor = searchParams.get("campos");
  if (valor === null) return todosCamposFichaComissao(campos);
  return new Set(valor.split(",").filter(Boolean));
}
