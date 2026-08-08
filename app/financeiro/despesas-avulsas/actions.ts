"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { despesaAvulsaSchema, NOVA_CATEGORIA_GASTO_VALUE } from "@/lib/validation/schemas";

export interface DespesaAvulsaFormState {
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
    data: String(formData.get("data") ?? ""),
  };

  const result = despesaAvulsaSchema.safeParse(raw);
  return { raw, result };
}

/** Lê os jogos marcados no seletor "Jogos relacionados" — um hidden input `jogo_<id>` por jogo
 * selecionado, mesmo padrão de `comissao_<id>` em convocacao-form.tsx. */
function parseJogosRelacionados(formData: FormData): string[] {
  const ids: string[] = [];
  for (const key of formData.keys()) {
    if (key.startsWith("jogo_")) ids.push(key.slice("jogo_".length));
  }
  return ids;
}

/**
 * Resolve o categoria_id a usar: se o usuário escolheu "+ Cadastrar nova categoria...", cria (ou
 * reaproveita, se já existir com o mesmo nome) a categoria no catálogo antes de salvar a despesa.
 * Mesmo helper de app/jogos/[id]/financeiro/actions.ts — despesas avulsas reaproveitam o mesmo
 * catálogo categorias_gasto.
 */
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

/** Substitui os vínculos despesas_avulsas_jogos de uma despesa pelos jogos atualmente marcados —
 * apaga tudo e recria, mais simples do que calcular o diff, e o volume por despesa é sempre
 * pequeno. */
async function sincronizarJogosRelacionados(
  supabase: ReturnType<typeof createClient>,
  despesaId: string,
  jogoIds: string[],
) {
  await supabase.from("despesas_avulsas_jogos").delete().eq("despesa_id", despesaId);
  if (jogoIds.length === 0) return;
  await supabase
    .from("despesas_avulsas_jogos")
    .insert(jogoIds.map((jogoId) => ({ despesa_id: despesaId, jogo_id: jogoId })));
}

export async function createDespesaAvulsa(
  _prevState: DespesaAvulsaFormState,
  formData: FormData,
): Promise<DespesaAvulsaFormState> {
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

  const id = randomUUID();
  const { error } = await supabase.from("despesas_avulsas").insert({
    id,
    categoria_id: categoria.id,
    descricao: data.descricao || null,
    valor_previsto: data.valorPrevisto,
    valor_efetuado: data.valorEfetuado ?? null,
    data: data.data || null,
  });

  if (error) return { error: "Não foi possível salvar a despesa avulsa. Tente novamente.", values: raw };

  await sincronizarJogosRelacionados(supabase, id, parseJogosRelacionados(formData));

  revalidatePath("/financeiro/despesas-avulsas");
  revalidatePath("/financeiro");
  redirect("/financeiro/despesas-avulsas");
}

export async function updateDespesaAvulsa(
  _prevState: DespesaAvulsaFormState,
  formData: FormData,
): Promise<DespesaAvulsaFormState> {
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
    .from("despesas_avulsas")
    .update({
      categoria_id: categoria.id,
      descricao: data.descricao || null,
      valor_previsto: data.valorPrevisto,
      valor_efetuado: data.valorEfetuado ?? null,
      data: data.data || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar a despesa avulsa. Tente novamente.", values: raw };

  await sincronizarJogosRelacionados(supabase, id, parseJogosRelacionados(formData));

  revalidatePath("/financeiro/despesas-avulsas");
  revalidatePath("/financeiro");
  redirect("/financeiro/despesas-avulsas");
}

export async function deleteDespesaAvulsa(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();

  await supabase.from("despesas_avulsas").delete().eq("id", id);

  revalidatePath("/financeiro/despesas-avulsas");
  revalidatePath("/financeiro");
}
