"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checklistTemplateParaJogo } from "@/lib/checklist-templates";
import type { ChecklistJogoItemBaseRow, JogoBaseRow } from "@/lib/supabase/types";

/** Espelha `app/jogos/[id]/checklist/actions.ts` para o Futebol de Base. */
export async function buscarOuCriarChecklistBase(jogo: JogoBaseRow): Promise<ChecklistJogoItemBaseRow[]> {
  const supabase = createClient();

  const { data: existentes } = await supabase
    .from("checklist_jogo_itens_base")
    .select("*")
    .eq("jogo_id", jogo.id)
    .order("ordem", { ascending: true });

  if (existentes && existentes.length > 0) {
    return existentes as ChecklistJogoItemBaseRow[];
  }

  const modelo = checklistTemplateParaJogo(jogo.mandante);
  const novosItens = modelo.map((item, indice) => ({
    jogo_id: jogo.id,
    item,
    ordem: indice,
  }));

  const { data: criados, error } = await supabase
    .from("checklist_jogo_itens_base")
    .insert(novosItens)
    .select("*")
    .order("ordem", { ascending: true });

  if (error || !criados) return [];
  return criados as ChecklistJogoItemBaseRow[];
}

/** Como a rota não carrega a categoria, busca-se o jogo antes de revalidar (mesmo padrão de
 * `revalidarAbaBase` em `operacao-actions.ts`). */
async function revalidarChecklistBase(jogoId: string) {
  const supabase = createClient();
  const { data: jogo } = await supabase.from("jogos_base").select("categoria").eq("id", jogoId).maybeSingle();
  if (jogo) revalidatePath(`/base/jogos/${jogo.categoria}/${jogoId}/checklist`);
}

export async function alternarChecklistItemBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const jogoId = String(formData.get("jogoId") ?? "");
  const novoValor = formData.get("novoValor") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase.from("checklist_jogo_itens_base").update({ concluido: novoValor }).eq("id", id);
  await revalidarChecklistBase(jogoId);
}

export async function definirChecklistPrazoBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const jogoId = String(formData.get("jogoId") ?? "");
  const prazo = String(formData.get("prazo") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase
    .from("checklist_jogo_itens_base")
    .update({ prazo: prazo || null })
    .eq("id", id);
  await revalidarChecklistBase(jogoId);
}
