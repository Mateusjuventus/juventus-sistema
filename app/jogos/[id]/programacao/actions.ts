"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProgramacaoTipo } from "@/lib/supabase/types";

/**
 * Adiciona uma linha de cronograma (Concentração ou Dia de Jogo) — sempre no fim da lista daquele
 * tipo (sem drag-and-drop, ver "Fora de escopo" da spec). Quando `ehConfronto` vem marcado, o
 * campo de atividade é ignorado (o pôster preenche sozinho o texto do confronto a partir do
 * adversário/mandante do jogo) — grava vazio em vez do texto digitado, pra nunca ficar
 * inconsistente com o que aparece de fato no pôster.
 */
export async function adicionarItemProgramacao(formData: FormData): Promise<void> {
  const jogoId = String(formData.get("jogoId") ?? "");
  const tipo = String(formData.get("tipo") ?? "") as ProgramacaoTipo;
  const horario = String(formData.get("horario") ?? "").trim();
  const local = String(formData.get("local") ?? "").trim();
  const ehConfronto = formData.get("ehConfronto") === "on";
  const atividade = ehConfronto ? "" : String(formData.get("atividade") ?? "").trim();

  if (!jogoId || !horario || !local || (!ehConfronto && !atividade)) return;
  if (tipo !== "concentracao" && tipo !== "dia_jogo") return;

  const supabase = createClient();

  const { count } = await supabase
    .from("jogo_programacao_itens")
    .select("*", { count: "exact", head: true })
    .eq("jogo_id", jogoId)
    .eq("tipo", tipo);

  await supabase.from("jogo_programacao_itens").insert({
    jogo_id: jogoId,
    tipo,
    ordem: count ?? 0,
    horario,
    atividade,
    local,
    eh_confronto: ehConfronto,
  });

  revalidatePath(`/jogos/${jogoId}/programacao`);
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
