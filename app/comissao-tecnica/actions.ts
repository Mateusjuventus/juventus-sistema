"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadFotoRedimensionada } from "@/lib/supabase/storage";
import { comissaoTecnicaUnificadaSchema } from "@/lib/validation/schemas";
import { normalizeCPF } from "@/lib/validation/cpf";
import { normalizeTelefone } from "@/lib/validation/telefone";

/** Comissão Técnica já unificada (Profissional + Base, "profissional" tratado como mais uma
 * categoria — ver docs/superpowers/specs/2026-10-28-unificacao-comissao-tecnica-design.md). Estas
 * actions substituem as separadas que existiam antes (`app/base/comissao-tecnica/actions.ts`
 * virou redirect). */
export interface ComissaoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
  categoriasSelecionadas?: string[];
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
    valorSalario: String(formData.get("valorSalario") ?? "") || undefined,
    dataInicio: String(formData.get("dataInicio") ?? ""),
  };

  const result = comissaoTecnicaUnificadaSchema.safeParse({ ...raw, categorias });
  return { raw, categorias, result };
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

  const { path, error } = await uploadFotoRedimensionada(supabase, file, "comissao", id);

  if (error) return { error: "Não foi possível enviar a foto. O restante dos dados não foi salvo." };
  return { path };
}

export async function createComissao(
  _prevState: ComissaoFormState,
  formData: FormData,
): Promise<ComissaoFormState> {
  const { raw, categorias, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw, categoriasSelecionadas: categorias };
  }

  const supabase = createClient();
  const id = randomUUID();
  const data = result.data;

  const { error: uploadError, path: fotoPath } = await uploadFotoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw, categoriasSelecionadas: categorias };

  const { error } = await supabase.from("comissao_tecnica").insert({
    id,
    categorias: data.categorias,
    nome_completo: data.nomeCompleto,
    apelido: data.apelido || null,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    funcao: data.funcao,
    telefone: data.telefone ? normalizeTelefone(data.telefone) : null,
    email: data.email || null,
    foto_path: fotoPath ?? null,
    tipo_contrato: data.tipoContrato || null,
    valor_salario: data.valorSalario ?? null,
    data_inicio: data.dataInicio || null,
  });

  if (error) return { error: friendlyDbError(error), values: raw, categoriasSelecionadas: categorias };

  revalidatePath("/comissao-tecnica");
  redirect("/comissao-tecnica");
}

export async function updateComissao(
  _prevState: ComissaoFormState,
  formData: FormData,
): Promise<ComissaoFormState> {
  const id = String(formData.get("id") ?? "");
  const { raw, categorias, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw, categoriasSelecionadas: categorias };
  }

  const supabase = createClient();
  const data = result.data;

  const { error: uploadError, path: fotoPath } = await uploadFotoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw, categoriasSelecionadas: categorias };

  const updatePayload: Record<string, unknown> = {
    categorias: data.categorias,
    nome_completo: data.nomeCompleto,
    apelido: data.apelido || null,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    funcao: data.funcao,
    telefone: data.telefone ? normalizeTelefone(data.telefone) : null,
    email: data.email || null,
    tipo_contrato: data.tipoContrato || null,
    data_inicio: data.dataInicio || null,
  };
  if (fotoPath) updatePayload.foto_path = fotoPath;
  // O campo "Salário mensal" some do formulário pra quem tem isso marcado como campo escondido
  // (ver docs/superpowers/specs/2026-10-02-campos-sensiveis-e-atletas-por-categoria-design.md) — e
  // por isso não chega no `formData`. Só grava `valor_salario` quando o campo veio preenchido no
  // envio, pra não zerar um valor já salvo quando quem está editando não pode nem ver o campo.
  if (formData.has("valorSalario")) updatePayload.valor_salario = data.valorSalario ?? null;

  const { error } = await supabase.from("comissao_tecnica").update(updatePayload).eq("id", id);

  if (error) return { error: friendlyDbError(error), values: raw, categoriasSelecionadas: categorias };

  revalidatePath("/comissao-tecnica");
  redirect("/comissao-tecnica");
}

export async function deleteComissao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();
  await supabase.from("comissao_tecnica").delete().eq("id", id);
  revalidatePath("/comissao-tecnica");
}
