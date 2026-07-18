"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProgramacaoTipo } from "@/lib/supabase/types";

export interface ProgramacaoLinhaFormState {
  error?: string;
  success?: boolean;
}

/**
 * Adiciona uma linha de cronograma (Concentração ou Dia de Jogo) — sempre no fim da lista daquele
 * tipo (sem drag-and-drop, ver "Fora de escopo" da spec). Quando `ehConfronto` vem marcado, o
 * campo de atividade é ignorado (o pôster preenche sozinho o texto do confronto a partir do
 * adversário/mandante do jogo) — grava vazio em vez do texto digitado, pra nunca ficar
 * inconsistente com o que aparece de fato no pôster.
 *
 * Devolve `{error}` em vez de falhar silenciosamente — antes, um erro do Supabase (RLS, migração
 * não aplicada, etc.) na hora de inserir era simplesmente ignorado, e a linha nunca era
 * adicionada sem nenhum aviso na tela, dando a impressão de um limite de "1 atividade só".
 */
export async function adicionarItemProgramacao(
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
    .from("jogo_programacao_itens")
    .select("*", { count: "exact", head: true })
    .eq("jogo_id", jogoId)
    .eq("tipo", tipo);

  if (countError) {
    return { error: `Não foi possível adicionar a linha: ${countError.message}` };
  }

  const { error: insertError } = await supabase.from("jogo_programacao_itens").insert({
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

  revalidatePath(`/jogos/${jogoId}/programacao`);
  return { success: true };
}

/**
 * Remove uma linha de cronograma (Concentração ou Dia de Jogo) — usa o mesmo `DeleteButton`
 * compartilhado do resto do sistema, que só manda o `id` no FormData, então busca o `jogo_id` da
 * própria linha antes de apagar pra saber qual página revalidar.
 */
export async function removerItemProgramacao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const { data: item } = await supabase
    .from("jogo_programacao_itens")
    .select("jogo_id")
    .eq("id", id)
    .single();

  await supabase.from("jogo_programacao_itens").delete().eq("id", id);
  if (item) revalidatePath(`/jogos/${item.jogo_id}/programacao`);
}

/** Salva a data da concentração e o texto das orientações (uma regra por linha). */
export async function salvarConfigConcentracao(formData: FormData): Promise<void> {
  const jogoId = String(formData.get("jogoId") ?? "");
  const concentracaoData = String(formData.get("concentracaoData") ?? "");
  const concentracaoRegras = String(formData.get("concentracaoRegras") ?? "");
  if (!jogoId) return;

  const supabase = createClient();
  await supabase
    .from("jogos")
    .update({
      concentracao_data: concentracaoData || null,
      concentracao_regras: concentracaoRegras,
    })
    .eq("id", jogoId);

  revalidatePath(`/jogos/${jogoId}/programacao`);
}

/** Salva a frase de liberação do pôster de Dia de Jogo. */
export async function salvarConfigDiaJogo(formData: FormData): Promise<void> {
  const jogoId = String(formData.get("jogoId") ?? "");
  const diaJogoLiberacao = String(formData.get("diaJogoLiberacao") ?? "").trim();
  if (!jogoId) return;

  const supabase = createClient();
  await supabase
    .from("jogos")
    .update({ dia_jogo_liberacao: diaJogoLiberacao || null })
    .eq("id", jogoId);

  revalidatePath(`/jogos/${jogoId}/programacao`);
}
