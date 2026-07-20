"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildPhotoPath, ENTITY_PHOTOS_BUCKET } from "@/lib/supabase/storage";
import { comissaoTecnicaBaseSchema } from "@/lib/validation/schemas";
import { normalizeCPF } from "@/lib/validation/cpf";

/** Espelha `app/comissao-tecnica/actions.ts`, mas grava em `comissao_tecnica_base` e inclui
 * `categoria` — mesmo padrão de `app/base/atletas/actions.ts` (categoria pode ser trocada no
 * formulário, então cria/edita redirecionam pra lista da categoria enviada, não a da URL). */
export interface ComissaoBaseFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

function parseForm(formData: FormData) {
  const raw = {
    categoria: String(formData.get("categoria") ?? ""),
    nomeCompleto: String(formData.get("nomeCompleto") ?? ""),
    apelido: String(formData.get("apelido") ?? ""),
    rg: String(formData.get("rg") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    dataNascimento: String(formData.get("dataNascimento") ?? ""),
    funcao: String(formData.get("funcao") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    email: String(formData.get("email") ?? ""),
    tipoQuartoPreferido: String(formData.get("tipoQuartoPreferido") ?? ""),
  };

  const result = comissaoTecnicaBaseSchema.safeParse(raw);
  return { raw, result };
}

function friendlyDbError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("cpf")) return "Já existe uma pessoa cadastrada com este CPF.";
    if (error.message.includes("rg")) return "Já existe uma pessoa cadastrada com este RG.";
    return "Já existe um registro com esses dados.";
  }
  return "Não foi possível salvar. Tente novamente.";
}

async function uploadFotoIfPresent(
  supabase: ReturnType<typeof createClient>,
  formData: FormData,
  id: string,
): Promise<{ path?: string | null; error?: string }> {
  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) return {};

  const path = buildPhotoPath("comissao-base", id, file.name);
  const { error } = await supabase.storage.from(ENTITY_PHOTOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) return { error: "Não foi possível enviar a foto. O restante dos dados não foi salvo." };
  return { path };
}

export async function createComissaoBase(
  _prevState: ComissaoBaseFormState,
  formData: FormData,
): Promise<ComissaoBaseFormState> {
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const id = randomUUID();
  const data = result.data;

  const { error: uploadError, path: fotoPath } = await uploadFotoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const { error } = await supabase.from("comissao_tecnica_base").insert({
    id,
    categoria: data.categoria,
    nome_completo: data.nomeCompleto,
    apelido: data.apelido || null,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    funcao: data.funcao,
    telefone: data.telefone || null,
    email: data.email || null,
    foto_path: fotoPath ?? null,
    tipo_quarto_preferido: data.tipoQuartoPreferido || null,
  });

  if (error) return { error: friendlyDbError(error), values: raw };

  revalidatePath("/base/comissao-tecnica");
  redirect(`/base/comissao-tecnica/${data.categoria}`);
}

export async function updateComissaoBase(
  _prevState: ComissaoBaseFormState,
  formData: FormData,
): Promise<ComissaoBaseFormState> {
  const id = String(formData.get("id") ?? "");
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  const { error: uploadError, path: fotoPath } = await uploadFotoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const updatePayload: Record<string, unknown> = {
    categoria: data.categoria,
    nome_completo: data.nomeCompleto,
    apelido: data.apelido || null,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    funcao: data.funcao,
    telefone: data.telefone || null,
    email: data.email || null,
    tipo_quarto_preferido: data.tipoQuartoPreferido || null,
  };
  if (fotoPath) updatePayload.foto_path = fotoPath;

  const { error } = await supabase.from("comissao_tecnica_base").update(updatePayload).eq("id", id);

  if (error) return { error: friendlyDbError(error), values: raw };

  revalidatePath("/base/comissao-tecnica");
  redirect(`/base/comissao-tecnica/${data.categoria}`);
}

/** Antes de excluir, lê a categoria da linha pra revalidar a lista certa — mesmo motivo de
 * `deleteAtletaBase` em `app/base/atletas/actions.ts`. */
export async function deleteComissaoBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();

  const { data } = await supabase
    .from("comissao_tecnica_base")
    .select("categoria")
    .eq("id", id)
    .maybeSingle();
  const categoria = (data as { categoria?: string } | null)?.categoria;

  await supabase.from("comissao_tecnica_base").delete().eq("id", id);

  revalidatePath("/base/comissao-tecnica");
  if (categoria) revalidatePath(`/base/comissao-tecnica/${categoria}`);
}
