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
    chavePix: z.string().optional().or(z.literal("")),
    valorPadraoPagamento: z.coerce.number().nonnegative().optional().nullable(),
  })
  .refine((data) => data.funcaoId !== NOVA_FUNCAO_VALUE || Boolean(data.novaFuncaoNome?.trim()), {
    message: "Informe o nome da nova função",
    path: ["novaFuncaoNome"],
  });
export type StaffOperacionalInput = z.infer<typeof staffOperacionalSchema>;
export { NOVA_FUNCAO_VALUE };

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
