"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gastoJogoSchema, NOVA_CATEGORIA_GASTO_VALUE } from "@/lib/validation/schemas";

/**
 * Espelha `app/jogos/[id]/financeiro/actions.ts` para o Futebol de Base — grava em
 * `gastos_jogo_base`, mas reaproveita o MESMO catálogo `categorias_gasto` do Profissional
 * (compartilhado, ver a spec) e o mesmo `gastoJogoSchema` (estrutura idêntica, sem categoria de
 * idade — o gasto pertence a um jogo, e o jogo já tem a categoria).
 */
export interface GastoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

function parseForm(formData: FormData) {
  const raw = {
    categoriaId: String(formData.get("categoriaId") ?? ""),
    novaCategoriaNome: String(formData.get("novaCategoriaNome") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    valorPrevisto: String(formData.get("valorPrevisto") ?? ""),
    valorEfetuado: String(formData.get("valorEfetuado") ?? "") || undefined,
  };

  const result = gastoJogoSchema.safeParse(raw);
  return { raw, result };
}

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

function caminhoFinanceiro(jogoId: string): string {
  return `/base/jogos/${jogoId}/financeiro`;
}

export async function createGastoBase(
  _prevState: GastoFormState,
  formData: FormData,
): Promise<GastoFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  const { raw, result } = parseForm(formData);

  if (!jogoId) return { error: "Jogo não identificado. Recarregue a página e tente novamente.", values: raw };

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  const categoria = await resolveCategoriaId(supabase, data.categoriaId, data.novaCategoriaNome ?? "");
  if (categoria.error || !categoria.id) return { error: categoria.error, values: raw };

  const { error } = await supabase.from("gastos_jogo_base").insert({
    id: randomUUID(),
    jogo_id: jogoId,
    categoria_id: categoria.id,
    descricao: data.descricao || null,
    valor_previsto: data.valorPrevisto,
    valor_efetuado: data.valorEfetuado ?? null,
  });

  if (error) return { error: "Não foi possível salvar o gasto. Tente novamente.", values: raw };

  const caminho = caminhoFinanceiro(jogoId);
  if (caminho) {
    revalidatePath(caminho);
    redirect(caminho);
  }
  redirect("/base/jogos");
}

export async function updateGastoBase(
  _prevState: GastoFormState,
  formData: FormData,
): Promise<GastoFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  const id = String(formData.get("id") ?? "");
  const { raw, result } = parseForm(formData);

  if (!jogoId || !id) {
    return { error: "Gasto não identificado. Recarregue a página e tente novamente.", values: raw };
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
    .from("gastos_jogo_base")
    .update({
      categoria_id: categoria.id,
      descricao: data.descricao || null,
      valor_previsto: data.valorPrevisto,
      valor_efetuado: data.valorEfetuado ?? null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar o gasto. Tente novamente.", values: raw };

  const caminho = caminhoFinanceiro(jogoId);
  if (caminho) {
    revalidatePath(caminho);
    redirect(caminho);
  }
  redirect("/base/jogos");
}

export async function deleteGastoBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();

  const { data } = await supabase.from("gastos_jogo_base").select("jogo_id").eq("id", id).maybeSingle();
  await supabase.from("gastos_jogo_base").delete().eq("id", id);

  if (data?.jogo_id) {
    const caminho = caminhoFinanceiro(data.jogo_id);
    if (caminho) revalidatePath(caminho);
  }
}
