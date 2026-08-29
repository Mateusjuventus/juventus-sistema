"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gastoJogoSchema, NOVA_CATEGORIA_GASTO_VALUE } from "@/lib/validation/schemas";
import { notificarAssinantesFinanceiro } from "@/lib/notificacoes/financeiro";

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
    data: String(formData.get("data") ?? ""),
  };

  const result = gastoJogoSchema.safeParse(raw);
  return { raw, result };
}

/**
 * Resolve o categoria_id a usar: se o usuário escolheu "+ Cadastrar nova categoria...", cria (ou
 * reaproveita, se já existir com o mesmo nome) a categoria no catálogo antes de salvar o gasto.
 * Mesmo padrão de resolveFuncaoId em app/staff-operacional/actions.ts.
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

export async function createGasto(
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

  const { error } = await supabase.from("gastos_jogo").insert({
    id: randomUUID(),
    jogo_id: jogoId,
    categoria_id: categoria.id,
    descricao: data.descricao || null,
    valor_previsto: data.valorPrevisto,
    valor_efetuado: data.valorEfetuado ?? null,
    data: data.data || null,
  });

  if (error) return { error: "Não foi possível salvar o gasto. Tente novamente.", values: raw };

  await avisarSeNovoBlocoAssinavel(supabase, jogoId, data.valorEfetuado !== undefined);

  revalidatePath(`/jogos/${jogoId}/financeiro`);
  redirect(`/jogos/${jogoId}/financeiro`);
}

/** Avisa quem assina o Financeiro na primeira vez que Orçamento (1º gasto) ou Despesas (1º gasto
 * com valor já efetuado) do jogo ficam prontos pra assinatura — mesmo gate de
 * `lib/assinaturas/pendencias.ts`. Best-effort: nunca derruba o salvamento do gasto em si. */
async function avisarSeNovoBlocoAssinavel(
  supabase: ReturnType<typeof createClient>,
  jogoId: string,
  temEfetuado: boolean,
): Promise<void> {
  const [{ data: jogo }, { data: gastos }] = await Promise.all([
    supabase.from("jogos").select("adversario_nome, data_jogo").eq("id", jogoId).maybeSingle(),
    supabase.from("gastos_jogo").select("valor_efetuado").eq("jogo_id", jogoId),
  ]);
  if (!jogo) return;

  const total = gastos?.length ?? 0;
  const totalEfetuados = (gastos ?? []).filter((g) => g.valor_efetuado !== null).length;
  const link = `/jogos/${jogoId}/financeiro`;

  if (total === 1) {
    await notificarAssinantesFinanceiro({
      tabelaConfig: "configuracoes_financeiro",
      jogoId,
      adversarioNome: jogo.adversario_nome,
      dataJogo: jogo.data_jogo,
      bloco: "Orçamento",
      link,
    });
  }
  if (temEfetuado && totalEfetuados === 1) {
    await notificarAssinantesFinanceiro({
      tabelaConfig: "configuracoes_financeiro",
      jogoId,
      adversarioNome: jogo.adversario_nome,
      dataJogo: jogo.data_jogo,
      bloco: "Despesas",
      link,
    });
  }
}

export async function updateGasto(
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
    .from("gastos_jogo")
    .update({
      categoria_id: categoria.id,
      descricao: data.descricao || null,
      valor_previsto: data.valorPrevisto,
      valor_efetuado: data.valorEfetuado ?? null,
      data: data.data || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar o gasto. Tente novamente.", values: raw };

  revalidatePath(`/jogos/${jogoId}/financeiro`);
  redirect(`/jogos/${jogoId}/financeiro`);
}

export async function deleteGasto(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();

  const { data } = await supabase.from("gastos_jogo").select("jogo_id").eq("id", id).maybeSingle();
  await supabase.from("gastos_jogo").delete().eq("id", id);

  if (data?.jogo_id) revalidatePath(`/jogos/${data.jogo_id}/financeiro`);
}
