"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    chavePix: String(formData.get("chavePix") ?? ""),
    valorPadraoPagamento: String(formData.get("valorPadraoPagamento") ?? "") || undefined,
  };

  const result = staffOperacionalSchema.safeParse(raw);
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

  const funcao = await resolveFuncaoId(supabase, data.funcaoId, data.novaFuncaoNome ?? "");
  if (funcao.error || !funcao.id) return { error: funcao.error, values: raw };

  const { error } = await supabase.from("staff_operacional").insert({
    id: randomUUID(),
    nome_completo: data.nomeCompleto,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    funcao_id: funcao.id,
    telefone: data.telefone || null,
    chave_pix: data.chavePix || null,
    valor_padrao_pagamento: data.valorPadraoPagamento ?? null,
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

  const funcao = await resolveFuncaoId(supabase, data.funcaoId, data.novaFuncaoNome ?? "");
  if (funcao.error || !funcao.id) return { error: funcao.error, values: raw };

  const { error } = await supabase
    .from("staff_operacional")
    .update({
      nome_completo: data.nomeCompleto,
      rg: data.rg,
      cpf: normalizeCPF(data.cpf),
      data_nascimento: data.dataNascimento,
      funcao_id: funcao.id,
      telefone: data.telefone || null,
      chave_pix: data.chavePix || null,
      valor_padrao_pagamento: data.valorPadraoPagamento ?? null,
    })
    .eq("id", id);

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
