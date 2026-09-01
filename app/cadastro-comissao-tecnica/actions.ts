"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  cadastroPublicoComissaoTecnicaSchema,
  completarCadastroComissaoCpfSchema,
  completarCadastroComissaoIdentidadeSchema,
  completarCadastroComissaoDadosSchema,
} from "@/lib/validation/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadFotoRedimensionada } from "@/lib/supabase/storage";
import { normalizeCPF } from "@/lib/validation/cpf";
import { normalizeTelefone } from "@/lib/validation/telefone";

const CADASTRO_FECHADO_MSG =
  "O cadastro público está fechado no momento. Fale com o responsável do Futebol Profissional.";

async function cadastroPublicoAtivo(admin: ReturnType<typeof createAdminClient>): Promise<boolean> {
  const { data } = await admin
    .from("configuracoes_cadastro_comissao_tecnica")
    .select("cadastro_publico_ativo")
    .limit(1)
    .maybeSingle();
  return data?.cadastro_publico_ativo ?? false;
}

/** Espelha `app/cadastro-staff-base/actions.ts`, mas grava em `comissao_tecnica` e confere
 * `configuracoes_cadastro_comissao_tecnica` — totalmente independente do fluxo de Staff Operacional.
 * Diferente de lá, TODOS os campos são obrigatórios aqui (ver
 * docs/superpowers/specs/2026-08-25-comissao-tecnica-cadastro-publico-design.md). */
export interface CadastroPublicoComissaoTecnicaFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
  success?: boolean;
}

function parseForm(formData: FormData) {
  const raw = {
    nomeCompleto: String(formData.get("nomeCompleto") ?? ""),
    apelido: String(formData.get("apelido") ?? ""),
    rg: String(formData.get("rg") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    dataNascimento: String(formData.get("dataNascimento") ?? ""),
    funcao: String(formData.get("funcao") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    email: String(formData.get("email") ?? ""),
    tipoContrato: String(formData.get("tipoContrato") ?? ""),
    valorSalario: String(formData.get("valorSalario") ?? ""),
    dataInicio: String(formData.get("dataInicio") ?? ""),
  };

  const result = cadastroPublicoComissaoTecnicaSchema.safeParse(raw);
  return { raw, result };
}

function friendlyDbError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("cpf")) return "Já existe uma pessoa cadastrada com este CPF.";
    if (error.message.includes("rg")) return "Já existe uma pessoa cadastrada com este RG.";
    return "Já existe um cadastro com esses dados.";
  }
  return "Não foi possível enviar o cadastro. Tente novamente.";
}

async function uploadFoto(
  admin: ReturnType<typeof createAdminClient>,
  formData: FormData,
  id: string,
): Promise<{ path?: string; error?: string }> {
  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) return {};

  const { path, error } = await uploadFotoRedimensionada(admin, file, "comissao", id);

  if (error) return { error: "Não foi possível enviar a foto. O restante do cadastro não foi salvo." };
  return { path };
}

/**
 * Cadastro público da Comissão Técnica/Diretoria — Futebol Profissional (link sem login, ver
 * app/cadastro-comissao-tecnica/page.tsx). Roda inteiro com o cliente admin (service_role) —
 * revalida a checagem de "cadastro ativo" de novo, mesmo que a página já tenha checado antes (a
 * pessoa pode ter deixado a aba aberta depois que o cadastro foi desativado). Sempre CRIA um
 * cadastro novo, nunca atualiza um existente — chamada só depois que `verificarCpfComissaoTecnicaPublico`
 * (abaixo) confirma que o CPF ainda não existe. Quem já está cadastrado e só falta completar
 * tipo de contrato/data de início/salário usa `completarCadastroComissaoTecnicaPublico`, também
 * abaixo (ver docs/superpowers/specs/2026-08-26-comissao-tecnica-completar-cadastro-design.md).
 */
export async function cadastrarComissaoTecnicaPublico(
  _prevState: CadastroPublicoComissaoTecnicaFormState,
  formData: FormData,
): Promise<CadastroPublicoComissaoTecnicaFormState> {
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const admin = createAdminClient();

  if (!(await cadastroPublicoAtivo(admin))) {
    return { error: CADASTRO_FECHADO_MSG };
  }

  const fotoFile = formData.get("foto");
  const temFotoNova = fotoFile instanceof File && fotoFile.size > 0;
  if (!temFotoNova) {
    return { fieldErrors: { foto: "A foto é obrigatória." }, values: raw };
  }

  const data = result.data;
  const id = randomUUID();
  const { error: uploadError, path: fotoPath } = await uploadFoto(admin, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const { error } = await admin.from("comissao_tecnica").insert({
    id,
    nome_completo: data.nomeCompleto,
    apelido: data.apelido,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    funcao: data.funcao,
    telefone: normalizeTelefone(data.telefone),
    email: data.email,
    foto_path: fotoPath ?? null,
    tipo_contrato: data.tipoContrato,
    valor_salario: data.valorSalario,
    data_inicio: data.dataInicio,
  });

  if (error) return { error: friendlyDbError(error), values: raw };

  revalidatePath("/comissao-tecnica");
  return { success: true };
}

/** Passo 1 do fluxo de "completar cadastro" (ver spec de 26/08 citada acima): dado um CPF, diz se é
 * alguém se cadastrando pela primeira vez (`resultado: "novo"`, segue pro formulário completo de
 * sempre) ou alguém que já está cadastrado (`resultado: "existente"`, segue pra confirmação de
 * identidade). Não revela nenhum outro dado do cadastro encontrado, só que ele existe. */
export interface VerificarCpfComissaoTecnicaState {
  cpf?: string;
  error?: string;
  fieldErrors?: { cpf?: string };
  resultado?: "novo" | "existente";
}

export async function verificarCpfComissaoTecnicaPublico(
  _prevState: VerificarCpfComissaoTecnicaState,
  formData: FormData,
): Promise<VerificarCpfComissaoTecnicaState> {
  const raw = String(formData.get("cpf") ?? "");
  const result = completarCadastroComissaoCpfSchema.safeParse({ cpf: raw });
  if (!result.success) {
    return { cpf: raw, fieldErrors: { cpf: result.error.issues[0]?.message ?? "CPF inválido" } };
  }

  const admin = createAdminClient();
  if (!(await cadastroPublicoAtivo(admin))) {
    return { error: CADASTRO_FECHADO_MSG };
  }

  const { data: existente } = await admin
    .from("comissao_tecnica")
    .select("id")
    .eq("cpf", result.data.cpf)
    .maybeSingle();

  return { cpf: result.data.cpf, resultado: existente ? "existente" : "novo" };
}

/** Os 7 campos que um cadastro antigo pode ter ficado sem — não só os 3 de contrato da migration
 * 0084 (ver `completarCadastroComissaoDadosSchema`). */
export interface CamposFaltandoComissaoTecnica {
  apelido: boolean;
  telefone: boolean;
  email: boolean;
  foto: boolean;
  tipoContrato: boolean;
  dataInicio: boolean;
  valorSalario: boolean;
}

/** Passo 2 do mesmo fluxo: confirma identidade de quem já está cadastrado via CPF + data de
 * nascimento, e diz quais dos 7 campos estão faltando nesse cadastro específico. Erro de "não
 * confere" é sempre o mesmo texto genérico, sem dizer qual dos dois dados está errado (ver seção de
 * segurança da spec). */
export interface ConfirmarIdentidadeComissaoTecnicaState {
  cpf?: string;
  dataNascimento?: string;
  error?: string;
  confirmado?: boolean;
  faltando?: CamposFaltandoComissaoTecnica;
}

export async function confirmarIdentidadeComissaoTecnicaPublico(
  _prevState: ConfirmarIdentidadeComissaoTecnicaState,
  formData: FormData,
): Promise<ConfirmarIdentidadeComissaoTecnicaState> {
  const cpfRaw = String(formData.get("cpf") ?? "");
  const raw = { cpf: cpfRaw, dataNascimento: String(formData.get("dataNascimento") ?? "") };
  const result = completarCadastroComissaoIdentidadeSchema.safeParse(raw);
  if (!result.success) {
    return { cpf: cpfRaw, error: "Data de nascimento é obrigatória." };
  }

  const admin = createAdminClient();
  if (!(await cadastroPublicoAtivo(admin))) {
    return { error: CADASTRO_FECHADO_MSG };
  }

  const { data: pessoa } = await admin
    .from("comissao_tecnica")
    .select("apelido, telefone, email, foto_path, tipo_contrato, data_inicio, valor_salario, data_nascimento")
    .eq("cpf", result.data.cpf)
    .maybeSingle();

  if (!pessoa || pessoa.data_nascimento !== result.data.dataNascimento) {
    return { cpf: result.data.cpf, error: "CPF ou data de nascimento não conferem." };
  }

  return {
    cpf: result.data.cpf,
    dataNascimento: result.data.dataNascimento,
    confirmado: true,
    faltando: {
      apelido: !pessoa.apelido,
      telefone: !pessoa.telefone,
      email: !pessoa.email,
      foto: !pessoa.foto_path,
      tipoContrato: pessoa.tipo_contrato == null,
      dataInicio: pessoa.data_inicio == null,
      valorSalario: pessoa.valor_salario == null,
    },
  };
}

/** Passo 3 do mesmo fluxo: salva só os campos que realmente estão faltando. Reconfere CPF + data de
 * nascimento de novo aqui (não recebe nem confia em nenhum "id de cadastro" vindo do formulário) e
 * decide o que é obrigatório olhando o próprio banco — não o que o formulário decidiu mostrar. */
export interface CompletarCadastroComissaoTecnicaState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

export async function completarCadastroComissaoTecnicaPublico(
  _prevState: CompletarCadastroComissaoTecnicaState,
  formData: FormData,
): Promise<CompletarCadastroComissaoTecnicaState> {
  const raw = {
    cpf: String(formData.get("cpf") ?? ""),
    dataNascimento: String(formData.get("dataNascimento") ?? ""),
    apelido: String(formData.get("apelido") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    email: String(formData.get("email") ?? ""),
    tipoContrato: String(formData.get("tipoContrato") ?? ""),
    dataInicio: String(formData.get("dataInicio") ?? ""),
    valorSalario: String(formData.get("valorSalario") ?? ""),
  };
  const result = completarCadastroComissaoDadosSchema.safeParse(raw);
  if (!result.success) {
    return { error: "Não foi possível salvar. Recarregue a página e tente de novo." };
  }

  const admin = createAdminClient();
  if (!(await cadastroPublicoAtivo(admin))) {
    return { error: CADASTRO_FECHADO_MSG };
  }

  const { data: pessoa } = await admin
    .from("comissao_tecnica")
    .select("id, apelido, telefone, email, foto_path, tipo_contrato, data_inicio, valor_salario, data_nascimento")
    .eq("cpf", result.data.cpf)
    .maybeSingle();

  if (!pessoa || pessoa.data_nascimento !== result.data.dataNascimento) {
    return { error: "Não foi possível confirmar sua identidade. Recarregue a página e tente de novo." };
  }

  const update: Record<string, unknown> = {};
  const fieldErrors: Record<string, string> = {};

  if (!pessoa.apelido) {
    if (!result.data.apelido) fieldErrors.apelido = "Apelido é obrigatório.";
    else update.apelido = result.data.apelido;
  }
  if (!pessoa.telefone) {
    if (!result.data.telefone) fieldErrors.telefone = "Telefone é obrigatório.";
    else update.telefone = normalizeTelefone(result.data.telefone);
  }
  if (!pessoa.email) {
    if (!result.data.email) fieldErrors.email = "E-mail é obrigatório.";
    else update.email = result.data.email;
  }
  if (pessoa.tipo_contrato == null) {
    if (!result.data.tipoContrato) fieldErrors.tipoContrato = "Tipo de contrato é obrigatório.";
    else update.tipo_contrato = result.data.tipoContrato;
  }
  if (pessoa.data_inicio == null) {
    if (!result.data.dataInicio) fieldErrors.dataInicio = "Data de início é obrigatória.";
    else update.data_inicio = result.data.dataInicio;
  }
  if (pessoa.valor_salario == null) {
    if (result.data.valorSalario === undefined) fieldErrors.valorSalario = "Salário é obrigatório.";
    else update.valor_salario = result.data.valorSalario;
  }

  let fotoPath: string | undefined;
  if (!pessoa.foto_path) {
    const fotoFile = formData.get("foto");
    const temFotoNova = fotoFile instanceof File && fotoFile.size > 0;
    if (!temFotoNova) {
      fieldErrors.foto = "A foto é obrigatória.";
    } else {
      const { error: uploadError, path } = await uploadFoto(admin, formData, pessoa.id);
      if (uploadError) return { error: uploadError };
      fotoPath = path;
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  if (fotoPath) update.foto_path = fotoPath;

  if (Object.keys(update).length > 0) {
    const { error } = await admin.from("comissao_tecnica").update(update).eq("id", pessoa.id);
    if (error) return { error: "Não foi possível salvar. Tente novamente." };
    revalidatePath("/comissao-tecnica");
  }

  return { success: true };
}
