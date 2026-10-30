"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checklistTemplateParaJogo } from "@/lib/checklist-templates";
import type { ChecklistJogoItemRow, JogoRow } from "@/lib/supabase/types";

/** Espelha `app/jogos/[id]/checklist/actions.ts` para o Futebol de Base. */
export async function buscarOuCriarChecklistBase(jogo: JogoRow): Promise<ChecklistJogoItemRow[]> {
  const supabase = createClient();

  const { data: existentes } = await supabase
    .from("checklist_jogo_itens")
    .select("*")
    .eq("jogo_id", jogo.id)
    .order("ordem", { ascending: true });

  if (existentes && existentes.length > 0) {
    return existentes as ChecklistJogoItemRow[];
  }

  const modelo = checklistTemplateParaJogo(jogo.mandante);
  const novosItens = modelo.map((item, indice) => ({
    jogo_id: jogo.id,
    item,
    ordem: indice,
  }));

  const { data: criados, error } = await supabase
    .from("checklist_jogo_itens")
    .insert(novosItens)
    .select("*")
    .order("ordem", { ascending: true });

  if (error || !criados) return [];
  return criados as ChecklistJogoItemRow[];
}

function revalidarChecklistBase(jogoId: string) {
  revalidatePath(`/base/jogos/${jogoId}/checklist`);
}

export async function alternarChecklistItemBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const jogoId = String(formData.get("jogoId") ?? "");
  const novoValor = formData.get("novoValor") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase.from("checklist_jogo_itens").update({ concluido: novoValor }).eq("id", id);
  await revalidarChecklistBase(jogoId);
}

export async function definirChecklistPrazoBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const jogoId = String(formData.get("jogoId") ?? "");
  const prazo = String(formData.get("prazo") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase
    .from("checklist_jogo_itens")
    .update({ prazo: prazo || null })
    .eq("id", id);
  await revalidarChecklistBase(jogoId);
}
