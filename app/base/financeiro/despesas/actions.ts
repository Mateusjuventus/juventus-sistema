"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { despesaAvulsaBaseSchema, NOVA_CATEGORIA_GASTO_VALUE } from "@/lib/validation/schemas";

/** Espelha `app/financeiro/despesas-avulsas/actions.ts`, gravando em `despesas_avulsas_base` —
 * sem o vínculo com jogos (fora de escopo, ver docs/superpowers/specs/
 * 2026-08-19-financeiro-base-design.md) e com `categoria` (idade) a mais. */
export interface DespesaAvulsaBaseFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

function parseForm(formData: FormData) {
  const raw = {
    categoriaId: String(formData.get("categoriaId") ?? ""),
    novaCategoriaNome: String(formData.get("novaCategoriaNome") ?? ""),
    categoria: String(formData.get("categoria") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    valorPrevisto: String(formData.get("valorPrevisto") ?? ""),
    valorEfetuado: String(formData.get("valorEfetuado") ?? "") || undefined,
    data: String(formData.get("data") ?? ""),
  };

  const result = despesaAvulsaBaseSchema.safeParse(raw);
  return { raw, result };
}

/** Resolve o categoria_id (tipo de despesa) a usar: se o usuário escolheu "+ Cadastrar nova
 * categoria...", cria (ou reaproveita, se já existir com o mesmo nome) a categoria no catálogo
 * antes de salvar a despesa — mesmo helper de app/financeiro/despesas-avulsas/actions.ts, o
 * catálogo `categorias_gasto` é compartilhado entre Profissional e Base. */
async function resolveCategoriaId(
  supabase: ReturnType<typeof createClient>,
  categoriaId: string,
  novaCategoriaNome: string,
): Promise<{ id?: string; error?: string }> {
  if (categoriaId !== NOVA_CATEGORIA_GASTO_VALUE) return { id: categoriaId };

  const nome = novaCategoriaNome.trim();
  const { data: existente } = await supabase
    .from("categorias_gasto")
    .select("id")
    .ilike("nome", nome)
    .maybeSingle();

  if (existente) return { id: existente.id as string };

  const { data: criada, error } = await supabase
    .from("categorias_gasto")
    .insert({ nome })
    .select("id")
    .single();

  if (error || !criada) return { error: "Não foi possível cadastrar a nova categoria. Tente novamente." };
  return { id: criada.id as string };
}

export async function createDespesaBase(
  _prevState: DespesaAvulsaBaseFormState,
  formData: FormData,
): Promise<DespesaAvulsaBaseFormState> {
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  const categoria = await resolveCategoriaId(supabase, data.categoriaId, data.novaCategoriaNome ?? "");
  if (categoria.error || !categoria.id) return { error: categoria.error, values: raw };

  const { error } = await supabase.from("despesas_avulsas_base").insert({
    id: randomUUID(),
    categoria_id: categoria.id,
    categoria: data.categoria || null,
    descricao: data.descricao || null,
    valor_previsto: data.valorPrevisto,
    valor_efetuado: data.valorEfetuado ?? null,
    data: data.data || null,
  });

  if (error) return { error: "Não foi possível salvar a despesa. Tente novamente.", values: raw };

  revalidatePath("/base/financeiro");
  redirect("/base/financeiro?aba=geral");
}

export async function updateDespesaBase(
  _prevState: DespesaAvulsaBaseFormState,
  formData: FormData,
): Promise<DespesaAvulsaBaseFormState> {
  const id = String(formData.get("id") ?? "");
  const { raw, result } = parseForm(formData);

  if (!id) {
    return { error: "Despesa não identificada. Recarregue a página e tente novamente.", values: raw };
  }

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  const categoria = await resolveCategoriaId(supabase, data.categoriaId, data.novaCategoriaNome ?? "");
  if (categoria.error || !categoria.id) return { error: categoria.error, values: raw };

  const { error } = await supabase
    .from("despesas_avulsas_base")
    .update({
      categoria_id: categoria.id,
      categoria: data.categoria || null,
      descricao: data.descricao || null,
      valor_previsto: data.valorPrevisto,
      valor_efetuado: data.valorEfetuado ?? null,
      data: data.data || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar a despesa. Tente novamente.", values: raw };

  revalidatePath("/base/financeiro");
  redirect("/base/financeiro?aba=geral");
}

export async function deleteDespesaBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();

  await supabase.from("despesas_avulsas_base").delete().eq("id", id);

  revalidatePath("/base/financeiro");
}
