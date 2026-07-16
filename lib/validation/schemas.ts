import { z } from "zod";
import { isValidCPF, normalizeCPF } from "./cpf";

/** Regra de CPF compartilhada por todos os cadastros: 11 dígitos, dígito verificador válido. */
const cpfField = z
  .string()
  .transform(normalizeCPF)
  .refine((value) => value.length === 11, { message: "CPF deve ter 11 dígitos" })
  .refine(isValidCPF, { message: "CPF inválido" });

const rgField = z.string().min(1, { message: "RG é obrigatório" });

const telefoneField = z.string().optional().or(z.literal(""));

const emailField = z.string().email({ message: "E-mail inválido" }).optional().or(z.literal(""));

/** Tipos de chave PIX oferecidos no cadastro de Staff Operacional (interno e público). */
export const STAFF_CHAVE_PIX_TIPOS = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
] as const;

const chavePixTipoField = z.enum(["cpf", "cnpj", "email", "telefone"]).optional().or(z.literal(""));

/** Campos de endereço compartilhados entre o cadastro interno e o formulário público de Staff. */
const enderecoFields = {
  cep: z.string().optional().or(z.literal("")),
  logradouro: z.string().optional().or(z.literal("")),
  numero: z.string().optional().or(z.literal("")),
  complemento: z.string().optional().or(z.literal("")),
  bairro: z.string().optional().or(z.literal("")),
  cidade: z.string().optional().or(z.literal("")),
  uf: z.string().optional().or(z.literal("")),
};

export const atletaSchema = z.object({
  nomeCompleto: z.string().min(1, { message: "Nome completo é obrigatório" }),
  rg: rgField,
  cpf: cpfField,
  dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
  posicao: z.string().min(1, { message: "Posição é obrigatória" }),
  numeroCamisa: z.coerce.number().int().positive().optional().nullable(),
  peDominante: z.enum(["destro", "canhoto", "ambidestro"]).optional().nullable(),
  telefone: telefoneField,
  cidadeNatal: z.string().optional().or(z.literal("")),
  ufNatal: z.string().length(2).optional().or(z.literal("")),
  enderecoAtual: z.string().optional().or(z.literal("")),
  dataInicioClube: z.string().optional().or(z.literal("")),
  empresarioNome: z.string().optional().or(z.literal("")),
  status: z.enum(["liberado", "suspenso", "departamento_medico"]).default("liberado"),
  dataFimContrato: z.string().optional().or(z.literal("")),
});
export type AtletaInput = z.infer<typeof atletaSchema>;

export const comissaoTecnicaSchema = z.object({
  nomeCompleto: z.string().min(1, { message: "Nome completo é obrigatório" }),
  rg: rgField,
  cpf: cpfField,
  dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
  funcao: z.string().min(1, { message: "Função/cargo é obrigatório" }),
  telefone: telefoneField,
  email: z.string().email({ message: "E-mail inválido" }).optional().or(z.literal("")),
  tipoQuartoPreferido: z.enum(["single", "duplo"]).optional().nullable(),
});
export type ComissaoTecnicaInput = z.infer<typeof comissaoTecnicaSchema>;

const NOVA_FUNCAO_VALUE = "__nova__";

export const staffOperacionalSchema = z
  .object({
    nomeCompleto: z.string().min(1, { message: "Nome completo é obrigatório" }),
    rg: rgField,
    cpf: cpfField,
    dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
    funcaoId: z.string().min(1, { message: "Função/setor é obrigatório" }),
    novaFuncaoNome: z.string().optional().or(z.literal("")),
    telefone: telefoneField,
    email: emailField,
    ...enderecoFields,
    chavePix: z.string().optional().or(z.literal("")),
    chavePixTipo: chavePixTipoField,
    valorPadraoPagamento: z.coerce.number().nonnegative().optional().nullable(),
  })
  .refine((data) => data.funcaoId !== NOVA_FUNCAO_VALUE || Boolean(data.novaFuncaoNome?.trim()), {
    message: "Informe o nome da nova função",
    path: ["novaFuncaoNome"],
  });
export type StaffOperacionalInput = z.infer<typeof staffOperacionalSchema>;
export { NOVA_FUNCAO_VALUE };

/**
 * Cadastro público de Staff Operacional (link enviado pra pessoa preencher sozinha, sem login):
 * mesmo formulário, mas sem valor de pagamento (decisão interna) e sem opção de criar função nova
 * (só escolhe entre as já cadastradas) — ver docs/superpowers/specs para o design completo.
 */
export const cadastroPublicoStaffSchema = z.object({
  nomeCompleto: z.string().min(1, { message: "Nome completo é obrigatório" }),
  rg: rgField,
  cpf: cpfField,
  dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
  funcaoId: z.string().min(1, { message: "Função/setor é obrigatório" }),
  telefone: telefoneField,
  email: emailField,
  ...enderecoFields,
  chavePix: z.string().optional().or(z.literal("")),
  chavePixTipo: chavePixTipoField,
});
export type CadastroPublicoStaffInput = z.infer<typeof cadastroPublicoStaffSchema>;

export const jogoSchema = z.object({
  competicao: z.string().min(1, { message: "Competição é obrigatória" }),
  rodadaFase: z.string().optional().or(z.literal("")),
  adversarioNome: z.string().min(1, { message: "Nome do adversário é obrigatório" }),
  dataJogo: z.string().min(1, { message: "Data do jogo é obrigatória" }),
  horario: z.string().optional().or(z.literal("")),
  localEstadio: z.string().optional().or(z.literal("")),
  endereco: z.string().optional().or(z.literal("")),
  mandante: z.boolean(),
  golsPro: z.coerce.number().int().nonnegative().optional().nullable(),
  golsContra: z.coerce.number().int().nonnegative().optional().nullable(),
});
export type JogoInput = z.infer<typeof jogoSchema>;

/** Sugestões de função/cargo para a Comissão Técnica/Diretoria (campo aceita texto livre além destas). */
export const SUGESTOES_FUNCAO_COMISSAO = [
  "Técnico",
  "Auxiliar Técnico",
  "Preparador Físico",
  "Preparador de Goleiros",
  "Fisioterapeuta",
  "Médico",
  "Analista de Desempenho",
  "Mordomo",
  "Presidente",
  "Diretor",
  "Diretor Adjunto",
  "Assessor Jurídico",
  "Coordenador",
  "Gerente Geral",
  "Supervisor",
] as const;

/**
 * Funções de Staff Operacional agora vêm da tabela staff_funcoes_catalogo (editável pelo próprio
 * usuário no sistema) em vez de uma lista fixa aqui. Ver supabase/migrations/0003_convocacao.sql.
 */

export const TAREFA_CATEGORIAS = [
  { value: "logistica", label: "Logística" },
  { value: "registro", label: "Registro" },
  { value: "financeiro", label: "Financeiro" },
  { value: "solicitacoes", label: "Solicitações" },
  { value: "gerais", label: "Gerais" },
] as const;

export const TAREFA_STATUS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "solicitado", label: "Solicitado" },
  { value: "concluido", label: "Concluído" },
] as const;

export const tarefaSchema = z.object({
  titulo: z.string().min(1, { message: "Título é obrigatório" }),
  descricao: z.string().optional().or(z.literal("")),
  categoria: z.enum(["logistica", "registro", "financeiro", "solicitacoes", "gerais"], {
    errorMap: () => ({ message: "Categoria é obrigatória" }),
  }),
  status: z.enum(["pendente", "em_andamento", "solicitado", "concluido"]).default("pendente"),
  prazo: z.string().optional().or(z.literal("")),
});
export type TarefaInput = z.infer<typeof tarefaSchema>;

export const tarefaStatusSchema = z.object({
  status: z.enum(["pendente", "em_andamento", "solicitado", "concluido"]),
});

const NOVA_CATEGORIA_GASTO_VALUE = "__nova__";

export const gastoJogoSchema = z
  .object({
    categoriaId: z.string().min(1, { message: "Categoria é obrigatória" }),
    novaCategoriaNome: z.string().optional().or(z.literal("")),
    descricao: z.string().optional().or(z.literal("")),
    valorPrevisto: z.coerce.number().nonnegative({ message: "Valor previsto não pode ser negativo" }),
    valorEfetuado: z.coerce.number().nonnegative().optional().nullable(),
  })
  .refine((data) => data.categoriaId !== NOVA_CATEGORIA_GASTO_VALUE || Boolean(data.novaCategoriaNome?.trim()), {
    message: "Informe o nome da nova categoria",
    path: ["novaCategoriaNome"],
  });
export type GastoJogoInput = z.infer<typeof gastoJogoSchema>;
export { NOVA_CATEGORIA_GASTO_VALUE };

export const SOLICITACAO_TIPOS = [
  { value: "compra", label: "Compra" },
  { value: "pagamento", label: "Pagamento" },
  { value: "exame_medico", label: "Exame Médico" },
  { value: "reembolso", label: "Reembolso" },
] as const;

export const SOLICITACAO_STATUS = [
  { value: "pendente", label: "Pendente" },
  { value: "aprovada", label: "Aprovada" },
  { value: "recusada", label: "Recusada" },
  { value: "concluida", label: "Concluída" },
] as const;

export const solicitacaoSchema = z
  .object({
    tipo: z.enum(["compra", "pagamento", "exame_medico", "reembolso"], {
      errorMap: () => ({ message: "Tipo é obrigatório" }),
    }),
    dataSolicitacao: z.string().min(1, { message: "Data é obrigatória" }),
    solicitante: z.string().min(1, { message: "Solicitante é obrigatório" }),
    setor: z.string().min(1, { message: "Setor é obrigatório" }),
    descricaoNecessidade: z.string().min(1, { message: "Descrição da necessidade é obrigatória" }),
    prazoSugerido: z.string().optional().or(z.literal("")),
    valor: z.coerce.number().nonnegative().optional().nullable(),
    chavePix: z.string().optional().or(z.literal("")),
    chavePixTipo: z.enum(["cpf", "cnpj", "email", "telefone"]).optional().or(z.literal("")),
  })
  .refine((data) => data.tipo !== "reembolso" || Boolean(data.chavePix?.trim()), {
    message: "Chave PIX é obrigatória em Reembolso",
    path: ["chavePix"],
  });
export type SolicitacaoInput = z.infer<typeof solicitacaoSchema>;

export const solicitacaoStatusSchema = z.object({
  status: z.enum(["pendente", "aprovada", "recusada", "concluida"]),
});

export const solicitacaoItemSchema = z.object({
  quantidade: z.string().min(1, { message: "Quantidade é obrigatória" }),
  item: z.string().min(1, { message: "Item é obrigatório" }),
});
export type SolicitacaoItemInput = z.infer<typeof solicitacaoItemSchema>;

export const configuracaoFinanceiroSchema = z.object({
  assinatura1Nome: z.string().min(1, { message: "Nome é obrigatório" }),
  assinatura1Cargo: z.string().min(1, { message: "Cargo é obrigatório" }),
  assinatura2Nome: z.string().min(1, { message: "Nome é obrigatório" }),
  assinatura2Cargo: z.string().min(1, { message: "Cargo é obrigatório" }),
});
export type ConfiguracaoFinanceiroInput = z.infer<typeof configuracaoFinanceiroSchema>;
