"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checklistTemplateParaJogo } from "@/lib/checklist-templates";
import type { ChecklistJogoItemRow, JogoRow } from "@/lib/supabase/types";

/**
 * Garante que o jogo já tem os itens de checklist criados. Na primeira vez que a aba é aberta
 * (nenhum item ainda pra esse jogo), cria os itens a partir do modelo fixo (casa ou fora,
 * conforme jogo.mandante). Nas próximas vezes, só devolve os itens já existentes.
 */
export async function buscarOuCriarChecklist(jogo: JogoRow): Promise<ChecklistJogoItemRow[]> {
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

/** Marca/desmarca um item do checklist como concluído, direto na listagem. */
export async function alternarChecklistItem(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const jogoId = String(formData.get("jogoId") ?? "");
  const novoValor = formData.get("novoValor") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase.from("checklist_jogo_itens").update({ concluido: novoValor }).eq("id", id);
  revalidatePath(`/jogos/${jogoId}/checklist`);
}

/** Define (ou limpa) o prazo de um item do checklist, direto na listagem. */
export async function definirChecklistPrazo(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const jogoId = String(formData.get("jogoId") ?? "");
  const prazo = String(formData.get("prazo") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase
    .from("checklist_jogo_itens")
    .update({ prazo: prazo || null })
    .eq("id", id);
  revalidatePath(`/jogos/${jogoId}/checklist`);
}
