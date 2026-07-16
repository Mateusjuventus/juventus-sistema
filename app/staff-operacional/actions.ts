"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildPhotoPath, ENTITY_PHOTOS_BUCKET } from "@/lib/supabase/storage";
import { staffOperacionalSchema, NOVA_FUNCAO_VALUE } from "@/lib/validation/schemas";
import { normalizeCPF } from "@/lib/validation/cpf";

export interface StaffFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

function parseForm(formData: FormData) {
  const raw = {
    nomeCompleto: String(formData.get("nomeCompleto") ?? ""),
    rg: String(formData.get("rg") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    dataNascimento: String(formData.get("dataNascimento") ?? ""),
    funcaoId: String(formData.get("funcaoId") ?? ""),
    novaFuncaoNome: String(formData.get("novaFuncaoNome") ?? ""),
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
    valorPadraoPagamento: String(formData.get("valorPadraoPagamento") ?? "") || undefined,
  };

  const result = staffOperacionalSchema.safeParse(raw);
  return { raw, result };
}

/**
 * Bloqueia dois cadastros com o mesmo nome completo (comparação sem diferenciar maiúsculas/
 * minúsculas). Na edição, ignora o próprio registro (senão nenhuma edição seria salva).
 */
async function existeNomeDuplicado(
  supabase: ReturnType<typeof createClient>,
  nomeCompleto: string,
  ignorarId?: string,
): Promise<boolean> {
  let query = supabase.from("staff_operacional").select("id").ilike("nome_completo", nomeCompleto.trim());
  if (ignorarId) query = query.neq("id", ignorarId);
  const { data } = await query.limit(1);
  return (data?.length ?? 0) > 0;
}

function friendlyDbError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("cpf")) return "Já existe uma pessoa cadastrada com este CPF.";
    if (error.message.includes("rg")) return "Já existe uma pessoa cadastrada com este RG.";
    return "Já existe um registro com esses dados.";
  }
  return "Não foi possível salvar. Tente novamente.";
}

/**
 * Resolve o funcao_id a usar: se o usuário escolheu "+ Cadastrar nova função...", cria (ou
 * reaproveita, se já existir com o mesmo nome) a função no catálogo antes de salvar a pessoa.
 */
async function resolveFuncaoId(
  supabase: ReturnType<typeof createClient>,
  funcaoId: string,
  novaFuncaoNome: string,
): Promise<{ id?: string; error?: string }> {
  if (funcaoId !== NOVA_FUNCAO_VALUE) return { id: funcaoId };

  const nome = novaFuncaoNome.trim();
  const { data: existente } = await supabase
    .from("staff_funcoes_catalogo")
    .select("id")
    .ilike("nome", nome)
    .maybeSingle();

  if (existente) return { id: existente.id as string };

  const { data: criada, error } = await supabase
    .from("staff_funcoes_catalogo")
    .insert({ nome })
    .select("id")
    .single();

  if (error || !criada) return { error: "Não foi possível cadastrar a nova função. Tente novamente." };
  return { id: criada.id as string };
}

async function uploadFotoIfPresent(
  supabase: ReturnType<typeof createClient>,
  formData: FormData,
  staffId: string,
): Promise<{ path?: string | null; error?: string }> {
  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) return {};

  const path = buildPhotoPath("staff-operacional", staffId, file.name);
  const { error } = await supabase.storage.from(ENTITY_PHOTOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) return { error: "Não foi possível enviar a foto. O restante dos dados não foi salvo." };
  return { path };
}

export async function createStaff(
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  if (await existeNomeDuplicado(supabase, data.nomeCompleto)) {
    return {
      fieldErrors: { nomeCompleto: "Já existe uma pessoa cadastrada com esse nome completo." },
      values: raw,
    };
  }

  const funcao = await resolveFuncaoId(supabase, data.funcaoId, data.novaFuncaoNome ?? "");
  if (funcao.error || !funcao.id) return { error: funcao.error, values: raw };

  const id = randomUUID();
  const { error: uploadError, path: fotoPath } = await uploadFotoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const { error } = await supabase.from("staff_operacional").insert({
    id,
    nome_completo: data.nomeCompleto,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    funcao_id: funcao.id,
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
    valor_padrao_pagamento: data.valorPadraoPagamento ?? null,
    foto_path: fotoPath ?? null,
  });

  if (error) return { error: friendlyDbError(error), values: raw };

  revalidatePath("/staff-operacional");
  redirect("/staff-operacional");
}

export async function updateStaff(
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const id = String(formData.get("id") ?? "");
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  if (await existeNomeDuplicado(supabase, data.nomeCompleto, id)) {
    return {
      fieldErrors: { nomeCompleto: "Já existe uma pessoa cadastrada com esse nome completo." },
      values: raw,
    };
  }

  const funcao = await resolveFuncaoId(supabase, data.funcaoId, data.novaFuncaoNome ?? "");
  if (funcao.error || !funcao.id) return { error: funcao.error, values: raw };

  const { error: uploadError, path: fotoPath } = await uploadFotoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const updatePayload: Record<string, unknown> = {
    nome_completo: data.nomeCompleto,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    funcao_id: funcao.id,
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
    valor_padrao_pagamento: data.valorPadraoPagamento ?? null,
  };
  if (fotoPath) updatePayload.foto_path = fotoPath;

  const { error } = await supabase.from("staff_operacional").update(updatePayload).eq("id", id);

  if (error) return { error: friendlyDbError(error), values: raw };

  revalidatePath("/staff-operacional");
  redirect("/staff-operacional");
}

export async function deleteStaff(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();
  await supabase.from("staff_operacional").delete().eq("id", id);
  revalidatePath("/staff-operacional");
}

/**
 * Marca um cadastro como ativo/inativo (em vez de excluir, quando a pessoa não trabalha mais com
 * o clube) — histórico e vínculos anteriores continuam intactos.
 */
export async function alternarStaffAtivo(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const novoValor = String(formData.get("novoValor") ?? "") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase.from("staff_operacional").update({ ativo: novoValor }).eq("id", id);
  revalidatePath("/staff-operacional");
}
