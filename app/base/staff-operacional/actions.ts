"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildPhotoPath, ENTITY_PHOTOS_BUCKET } from "@/lib/supabase/storage";
import { staffOperacionalSchema, NOVA_FUNCAO_VALUE } from "@/lib/validation/schemas";
import { normalizeCPF } from "@/lib/validation/cpf";

/**
 * Espelha `app/staff-operacional/actions.ts`, mas grava em `staff_operacional_base` — lista única,
 * sem categoria (ver a spec). O catálogo de funções (`staff_funcoes_catalogo`) é o MESMO do
 * Profissional — reaproveitado sem duplicar, já que são só nomes de função.
 */
export interface StaffBaseFormState {
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

/** Mesma regra de `app/staff-operacional/actions.ts`: bloqueia dois cadastros com o mesmo nome
 * completo (ignorando maiúsculas/minúsculas), ignorando o próprio registro na edição. */
async function existeNomeDuplicado(
  supabase: ReturnType<typeof createClient>,
  nomeCompleto: string,
  ignorarId?: string,
): Promise<boolean> {
  let query = supabase
    .from("staff_operacional_base")
    .select("id")
    .ilike("nome_completo", nomeCompleto.trim());
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

/** Resolve o funcao_id a usar no catálogo COMPARTILHADO `staff_funcoes_catalogo` — mesma lógica de
 * `app/staff-operacional/actions.ts`: se a pessoa escolheu "+ Cadastrar nova função...", cria (ou
 * reaproveita, se já existir com o mesmo nome) antes de salvar. */
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

  const path = buildPhotoPath("staff-operacional-base", staffId, file.name);
  const { error } = await supabase.storage.from(ENTITY_PHOTOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) return { error: "Não foi possível enviar a foto. O restante dos dados não foi salvo." };
  return { path };
}

export async function createStaffBase(
  _prevState: StaffBaseFormState,
  formData: FormData,
): Promise<StaffBaseFormState> {
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

  const { error } = await supabase.from("staff_operacional_base").insert({
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

  revalidatePath("/base/staff-operacional");
  redirect("/base/staff-operacional");
}

export async function updateStaffBase(
  _prevState: StaffBaseFormState,
  formData: FormData,
): Promise<StaffBaseFormState> {
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

  const { error } = await supabase.from("staff_operacional_base").update(updatePayload).eq("id", id);

  if (error) return { error: friendlyDbError(error), values: raw };

  revalidatePath("/base/staff-operacional");
  redirect("/base/staff-operacional");
}

export async function deleteStaffBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();
  await supabase.from("staff_operacional_base").delete().eq("id", id);
  revalidatePath("/base/staff-operacional");
}

/** Mesma regra de `app/staff-operacional/actions.ts`: marca ativo/inativo em vez de excluir. */
export async function alternarStaffBaseAtivo(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const novoValor = String(formData.get("novoValor") ?? "") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase.from("staff_operacional_base").update({ ativo: novoValor }).eq("id", id);
  revalidatePath("/base/staff-operacional");
}
