"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  cadastroPublicoComissaoTecnicaBaseSchema,
  completarCadastroComissaoCpfSchema,
  completarCadastroComissaoIdentidadeSchema,
  completarCadastroComissaoContratoSchema,
} from "@/lib/validation/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPhotoPath, ENTITY_PHOTOS_BUCKET } from "@/lib/supabase/storage";
import { normalizeCPF } from "@/lib/validation/cpf";
import { normalizeTelefone } from "@/lib/validation/telefone";

const CADASTRO_FECHADO_MSG =
  "O cadastro público está fechado no momento. Fale com o responsável do Futebol de Base.";

async function cadastroPublicoAtivo(admin: ReturnType<typeof createAdminClient>): Promise<boolean> {
  const { data } = await admin
    .from("configuracoes_cadastro_comissao_tecnica_base")
    .select("cadastro_publico_ativo")
    .limit(1)
    .maybeSingle();
  return data?.cadastro_publico_ativo ?? false;
}

/** Espelha `app/cadastro-comissao-tecnica/actions.ts` (Profissional), mas grava em
 * `comissao_tecnica_base`, confere `configuracoes_cadastro_comissao_tecnica_base` e inclui
 * `categorias` (lista — uma pessoa pode atuar em mais de uma, ver docs/superpowers/specs/
 * 2026-08-19-comissao-tecnica-multi-categoria-design.md). TODOS os campos são obrigatórios aqui. */
export interface CadastroPublicoComissaoTecnicaBaseFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
  categoriasSelecionadas?: string[];
  success?: boolean;
}

function parseForm(formData: FormData) {
  const categorias = formData.getAll("categorias").map(String);
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

  const result = cadastroPublicoComissaoTecnicaBaseSchema.safeParse({ ...raw, categorias });
  return { raw, categorias, result };
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

  const path = buildPhotoPath("comissao-base", id, file.name);
  const { error } = await admin.storage.from(ENTITY_PHOTOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) return { error: "Não foi possível enviar a foto. O restante do cadastro não foi salvo." };
  return { path };
}

/**
 * Cadastro público da Comissão Técnica/Diretoria — Futebol de Base (link sem login, ver
 * app/cadastro-comissao-tecnica-base/page.tsx). Roda inteiro com o cliente admin (service_role) —
 * revalida a checagem de "cadastro ativo" de novo, mesmo que a página já tenha checado antes.
 * Sempre CRIA um cadastro novo, nunca atualiza um existente — chamada só depois que
 * `verificarCpfComissaoTecnicaBasePublico` (abaixo) confirma que o CPF ainda não existe. Quem já
 * está cadastrado usa `completarCadastroComissaoTecnicaBasePublico`, também abaixo (ver
 * docs/superpowers/specs/2026-08-26-comissao-tecnica-completar-cadastro-design.md).
 */
export async function cadastrarComissaoTecnicaBasePublico(
  _prevState: CadastroPublicoComissaoTecnicaBaseFormState,
  formData: FormData,
): Promise<CadastroPublicoComissaoTecnicaBaseFormState> {
  const { raw, categorias, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw, categoriasSelecionadas: categorias };
  }

  const admin = createAdminClient();

  if (!(await cadastroPublicoAtivo(admin))) {
    return { error: CADASTRO_FECHADO_MSG };
  }

  const fotoFile = formData.get("foto");
  const temFotoNova = fotoFile instanceof File && fotoFile.size > 0;
  if (!temFotoNova) {
    return { fieldErrors: { foto: "A foto é obrigatória." }, values: raw, categoriasSelecionadas: categorias };
  }

  const data = result.data;
  const id = randomUUID();
  const { error: uploadError, path: fotoPath } = await uploadFoto(admin, formData, id);
  if (uploadError) return { error: uploadError, values: raw, categoriasSelecionadas: categorias };

  const { error } = await admin.from("comissao_tecnica_base").insert({
    id,
    categorias: data.categorias,
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

  if (error) return { error: friendlyDbError(error), values: raw, categoriasSelecionadas: categorias };

  revalidatePath("/base/comissao-tecnica");
  return { success: true };
}

/** Espelha `verificarCpfComissaoTecnicaPublico` de `app/cadastro-comissao-tecnica/actions.ts`
 * (Profissional), olhando `comissao_tecnica_base`. */
export interface VerificarCpfComissaoTecnicaBaseState {
  cpf?: string;
  error?: string;
  fieldErrors?: { cpf?: string };
  resultado?: "novo" | "existente";
}

export async function verificarCpfComissaoTecnicaBasePublico(
  _prevState: VerificarCpfComissaoTecnicaBaseState,
  formData: FormData,
): Promise<VerificarCpfComissaoTecnicaBaseState> {
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
    .from("comissao_tecnica_base")
    .select("id")
    .eq("cpf", result.data.cpf)
    .maybeSingle();

  return { cpf: result.data.cpf, resultado: existente ? "existente" : "novo" };
}

/** Espelha `confirmarIdentidadeComissaoTecnicaPublico` (Profissional), olhando
 * `comissao_tecnica_base`. */
export interface ConfirmarIdentidadeComissaoTecnicaBaseState {
  cpf?: string;
  dataNascimento?: string;
  error?: string;
  confirmado?: boolean;
  faltando?: { tipoContrato: boolean; dataInicio: boolean; valorSalario: boolean };
}

export async function confirmarIdentidadeComissaoTecnicaBasePublico(
  _prevState: ConfirmarIdentidadeComissaoTecnicaBaseState,
  formData: FormData,
): Promise<ConfirmarIdentidadeComissaoTecnicaBaseState> {
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
    .from("comissao_tecnica_base")
    .select("tipo_contrato, data_inicio, valor_salario, data_nascimento")
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
      tipoContrato: pessoa.tipo_contrato == null,
      dataInicio: pessoa.data_inicio == null,
      valorSalario: pessoa.valor_salario == null,
    },
  };
}

/** Espelha `completarCadastroComissaoTecnicaPublico` (Profissional), olhando
 * `comissao_tecnica_base`. */
export interface CompletarCadastroComissaoTecnicaBaseState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

export async function completarCadastroComissaoTecnicaBasePublico(
  _prevState: CompletarCadastroComissaoTecnicaBaseState,
  formData: FormData,
): Promise<CompletarCadastroComissaoTecnicaBaseState> {
  const raw = {
    cpf: String(formData.get("cpf") ?? ""),
    dataNascimento: String(formData.get("dataNascimento") ?? ""),
    tipoContrato: String(formData.get("tipoContrato") ?? ""),
    dataInicio: String(formData.get("dataInicio") ?? ""),
    valorSalario: String(formData.get("valorSalario") ?? ""),
  };
  const result = completarCadastroComissaoContratoSchema.safeParse(raw);
  if (!result.success) {
    return { error: "Não foi possível salvar. Recarregue a página e tente de novo." };
  }

  const admin = createAdminClient();
  if (!(await cadastroPublicoAtivo(admin))) {
    return { error: CADASTRO_FECHADO_MSG };
  }

  const { data: pessoa } = await admin
    .from("comissao_tecnica_base")
    .select("id, tipo_contrato, data_inicio, valor_salario, data_nascimento")
    .eq("cpf", result.data.cpf)
    .maybeSingle();

  if (!pessoa || pessoa.data_nascimento !== result.data.dataNascimento) {
    return { error: "Não foi possível confirmar sua identidade. Recarregue a página e tente de novo." };
  }

  const update: Record<string, unknown> = {};
  const fieldErrors: Record<string, string> = {};

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

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  if (Object.keys(update).length > 0) {
    const { error } = await admin.from("comissao_tecnica_base").update(update).eq("id", pessoa.id);
    if (error) return { error: "Não foi possível salvar. Tente novamente." };
    revalidatePath("/base/comissao-tecnica");
  }

  return { success: true };
}
