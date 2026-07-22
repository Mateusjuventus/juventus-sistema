"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProgramacaoTipo } from "@/lib/supabase/types";

/** Espelha `app/jogos/[id]/programacao/actions.ts` para o Futebol de Base. */
export interface ProgramacaoLinhaFormState {
  error?: string;
  success?: boolean;
}

function caminhoProgramacao(jogoId: string): string {
  return `/base/jogos/${jogoId}/programacao`;
}

export async function adicionarItemProgramacaoBase(
  _prevState: ProgramacaoLinhaFormState,
  formData: FormData,
): Promise<ProgramacaoLinhaFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  const tipo = String(formData.get("tipo") ?? "") as ProgramacaoTipo;
  const horario = String(formData.get("horario") ?? "").trim();
  const local = String(formData.get("local") ?? "").trim();
  const ehConfronto = formData.get("ehConfronto") === "on";
  const atividade = ehConfronto ? "" : String(formData.get("atividade") ?? "").trim();

  if (!jogoId) return { error: "Jogo não identificado. Recarregue a página e tente novamente." };
  if (!horario || !local || (!ehConfronto && !atividade)) {
    return { error: 'Preencha horário, local e atividade (ou marque "Esta linha é o confronto").' };
  }
  if (tipo !== "concentracao" && tipo !== "dia_jogo") {
    return { error: "Tipo de programação inválido." };
  }

  const supabase = createClient();

  const { count, error: countError } = await supabase
    .from("jogo_programacao_itens_base")
    .select("*", { count: "exact", head: true })
    .eq("jogo_id", jogoId)
    .eq("tipo", tipo);

  if (countError) {
    return { error: `Não foi possível adicionar a linha: ${countError.message}` };
  }

  const { error: insertError } = await supabase.from("jogo_programacao_itens_base").insert({
    jogo_id: jogoId,
    tipo,
    ordem: count ?? 0,
    horario,
    atividade,
    local,
    eh_confronto: ehConfronto,
  });

  if (insertError) {
    return { error: `Não foi possível adicionar a linha: ${insertError.message}` };
  }

  const caminho = caminhoProgramacao(jogoId);
  if (caminho) revalidatePath(caminho);
  return { success: true };
}

export async function removerItemProgramacaoBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const { data: item } = await supabase
    .from("jogo_programacao_itens_base")
    .select("jogo_id")
    .eq("id", id)
    .single();

  await supabase.from("jogo_programacao_itens_base").delete().eq("id", id);
  if (item) {
    const caminho = caminhoProgramacao(item.jogo_id);
    if (caminho) revalidatePath(caminho);
  }
}

export async function salvarConfigConcentracaoBase(formData: FormData): Promise<void> {
  const jogoId = String(formData.get("jogoId") ?? "");
  const concentracaoData = String(formData.get("concentracaoData") ?? "");
  const concentracaoRegras = String(formData.get("concentracaoRegras") ?? "");
  if (!jogoId) return;

  const supabase = createClient();
  await supabase
    .from("jogos_base")
    .update({
      concentracao_data: concentracaoData || null,
      concentracao_regras: concentracaoRegras,
    })
    .eq("id", jogoId);

  const caminho = caminhoProgramacao(jogoId);
  if (caminho) revalidatePath(caminho);
}

export async function salvarConfigDiaJogoBase(formData: FormData): Promise<void> {
  const jogoId = String(formData.get("jogoId") ?? "");
  const diaJogoLiberacao = String(formData.get("diaJogoLiberacao") ?? "").trim();
  if (!jogoId) return;

  const supabase = createClient();
  await supabase
    .from("jogos_base")
    .update({ dia_jogo_liberacao: diaJogoLiberacao || null })
    .eq("id", jogoId);

  const caminho = caminhoProgramacao(jogoId);
  if (caminho) revalidatePath(caminho);
}
