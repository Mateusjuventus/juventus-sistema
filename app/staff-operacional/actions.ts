"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { staffOperacionalSchema } from "@/lib/validation/schemas";
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
    funcaoSetor: String(formData.get("funcaoSetor") ?? ""),
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

  const { error } = await supabase.from("staff_operacional").insert({
    id: randomUUID(),
    nome_completo: data.nomeCompleto,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    funcao_setor: data.funcaoSetor,
    telefone: data.telefone || null,
    chave_pix: data.chavePix || null,
    valor_padrao_pagamento: data.valorPadraoPagamento ?? null,
  });

  if (error) return { error: friendlyDbError(error), values: raw };

  revalidatePath("/staff-operacional");
  redirect("/staff-operacional");
}

export async function updateStaff(
  id: string,
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

  const { error } = await supabase
    .from("staff_operacional")
    .update({
      nome_completo: data.nomeCompleto,
      rg: data.rg,
      cpf: normalizeCPF(data.cpf),
      data_nascimento: data.dataNascimento,
      funcao_setor: data.funcaoSetor,
      telefone: data.telefone || null,
      chave_pix: data.chavePix || null,
      valor_padrao_pagamento: data.valorPadraoPagamento ?? null,
    })
    .eq("id", id);

  if (error) return { error: friendlyDbError(error), values: raw };

  revalidatePath("/staff-operacional");
  redirect("/staff-operacional");
}

export async function deleteStaff(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("staff_operacional").delete().eq("id", id);
  revalidatePath("/staff-operacional");
}
