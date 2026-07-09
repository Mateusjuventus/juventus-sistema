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
});
export type ComissaoTecnicaInput = z.infer<typeof comissaoTecnicaSchema>;

export const staffOperacionalSchema = z.object({
  nomeCompleto: z.string().min(1, { message: "Nome completo é obrigatório" }),
  rg: rgField,
  cpf: cpfField,
  dataNascimento: z.string().min(1, { message: "Data de nascimento é obrigatória" }),
  funcaoSetor: z.string().min(1, { message: "Função/setor é obrigatório" }),
  telefone: telefoneField,
  chavePix: z.string().optional().or(z.literal("")),
  valorPadraoPagamento: z.coerce.number().nonnegative().optional().nullable(),
});
export type StaffOperacionalInput = z.infer<typeof staffOperacionalSchema>;

export const jogoSchema = z.object({
  competicao: z.string().min(1, { message: "Competição é obrigatória" }),
  rodadaFase: z.string().optional().or(z.literal("")),
  adversarioNome: z.string().min(1, { message: "Nome do adversário é obrigatório" }),
  dataJogo: z.string().min(1, { message: "Data do jogo é obrigatória" }),
  horario: z.string().optional().or(z.literal("")),
  localEstadio: z.string().optional().or(z.literal("")),
  endereco: z.string().optional().or(z.literal("")),
  mandante: z.boolean(),
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

/** Sugestões de função/setor para o Staff Operacional (campo aceita texto livre além destas). */
export const SUGESTOES_FUNCAO_STAFF = [
  "Segurança",
  "Controlador de Acesso",
  "Gandula",
  "Maqueiro",
  "Orientador",
  "Bombeiro Civil",
  "Limpeza",
] as const;
