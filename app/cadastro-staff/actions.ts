"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cadastroPublicoStaffSchema } from "@/lib/validation/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPhotoPath, ENTITY_PHOTOS_BUCKET } from "@/lib/supabase/storage";
import { normalizeCPF } from "@/lib/validation/cpf";

export interface CadastroPublicoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
  success?: boolean;
}

function parseForm(formData: FormData) {
  const raw = {
    nomeCompleto: String(formData.get("nomeCompleto") ?? ""),
    rg: String(formData.get("rg") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    dataNascimento: String(formData.get("dataNascimento") ?? ""),
    funcaoId: String(formData.get("funcaoId") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    email: String(formData.get("email") ?? ""),
    cep: String(formData.get("cep") ?? ""),
    logradouro: String(formData.get("logradouro") ?? ""),
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    uf: String(formData.get("uf") ?? ""),
    chavePix: String(formData.get("chavePix") ?? ""),
    chavePixTipo: String(formData.get("chavePixTipo") ?? ""),
  };

  const result = cadastroPublicoStaffSchema.safeParse(raw);
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

/**
 * Envia a foto pro bucket usando o cliente admin (service_role) — quem preenche este formulário
 * não tem sessão autenticada, então usa o mesmo cliente já usado para gravar o cadastro.
 */
async function uploadFotoIfPresent(
  admin: ReturnType<typeof createAdminClient>,
  formData: FormData,
  staffId: string,
): Promise<{ path?: string | null; error?: string }> {
  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) return {};

  const path = buildPhotoPath("staff-operacional", staffId, file.name);
  const { error } = await admin.storage.from(ENTITY_PHOTOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) return { error: "Não foi possível enviar a foto. O restante do cadastro não foi salvo." };
  return { path };
}

/**
 * Cadastro público de Staff Operacional (link sem login, ver app/cadastro-staff/page.tsx). Roda
 * inteiro com o cliente admin (service_role), já que não existe sessão de usuário aqui — por isso
 * revalida a checagem de "cadastro ativo" e a existência da função de novo, mesmo que a página já
 * tenha checado antes (a pessoa pode ter deixado a aba aberta depois que o cadastro foi desativado).
 */
export async function cadastrarStaffPublico(
  _prevState: CadastroPublicoFormState,
  formData: FormData,
): Promise<CadastroPublicoFormState> {
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const admin = createAdminClient();

  const { data: configData } = await admin
    .from("configuracoes_cadastro_staff")
    .select("cadastro_publico_ativo")
    .limit(1)
    .maybeSingle();
  if (!configData?.cadastro_publico_ativo) {
    return {
      error: "O cadastro público está fechado no momento. Fale com o responsável do departamento.",
    };
  }

  const data = result.data;

  const { data: nomeExistente } = await admin
    .from("staff_operacional")
    .select("id")
    .ilike("nome_completo", data.nomeCompleto.trim())
    .limit(1);
  if ((nomeExistente?.length ?? 0) > 0) {
    return {
      fieldErrors: { nomeCompleto: "Já existe uma pessoa cadastrada com esse nome completo." },
      values: raw,
    };
  }

  const { data: funcaoExistente } = await admin
    .from("staff_funcoes_catalogo")
    .select("id")
    .eq("id", data.funcaoId)
    .maybeSingle();
  if (!funcaoExistente) {
    return { fieldErrors: { funcaoId: "Selecione uma função válida da lista." }, values: raw };
  }

  const id = randomUUID();
  const { error: uploadError, path: fotoPath } = await uploadFotoIfPresent(admin, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const { error } = await admin.from("staff_operacional").insert({
    id,
    nome_completo: data.nomeCompleto,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    funcao_id: data.funcaoId,
    telefone: data.telefone || null,
    email: data.email || null,
    cep: data.cep || null,
    logradouro: data.logradouro || null,
    numero: data.numero || null,
    complemento: data.complemento || null,
    bairro: data.bairro || null,
    cidade: data.cidade || null,
    uf: data.uf || null,
    chave_pix: data.chavePix || null,
    chave_pix_tipo: data.chavePixTipo || null,
    foto_path: fotoPath ?? null,
  });

  if (error) return { error: friendlyDbError(error), values: raw };

  revalidatePath("/staff-operacional");
  return { success: true };
}
