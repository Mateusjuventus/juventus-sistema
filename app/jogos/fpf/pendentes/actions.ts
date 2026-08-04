"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function campoObrigatorio(formData: FormData, nome: string): string {
  return String(formData.get(nome) ?? "");
}

/** Cria um jogo nosso já preenchido com os dados do jogo da FPF e vincula o `fpf_id_jogo`. */
export async function criarJogoDaFpf(formData: FormData): Promise<void> {
  const fpfIdJogo = Number(formData.get("fpfIdJogo"));
  if (!Number.isInteger(fpfIdJogo)) return;

  const supabase = createClient();
  await supabase.from("jogos").insert({
    competicao: campoObrigatorio(formData, "competicao"),
    rodada_fase: campoObrigatorio(formData, "rodadaFase") || null,
    adversario_nome: campoObrigatorio(formData, "adversarioNome"),
    data_jogo: campoObrigatorio(formData, "dataJogo"),
    horario: campoObrigatorio(formData, "horario") || null,
    local_estadio: campoObrigatorio(formData, "localEstadio") || null,
    endereco: campoObrigatorio(formData, "endereco") || null,
    mandante: formData.get("mandante") === "true",
    gols_pro: formData.get("golsPro") ? Number(formData.get("golsPro")) : null,
    gols_contra: formData.get("golsContra") ? Number(formData.get("golsContra")) : null,
    fpf_id_jogo: fpfIdJogo,
    fpf_link_sumula: campoObrigatorio(formData, "fpfLinkSumula") || null,
    fpf_sincronizado_em: new Date().toISOString(),
  });

  revalidatePath("/jogos/fpf/pendentes");
  revalidatePath("/jogos");
}

/** Vincula um jogo da FPF a um jogo já cadastrado manualmente antes da sincronização existir. */
export async function vincularJogoExistente(formData: FormData): Promise<void> {
  const fpfIdJogo = Number(formData.get("fpfIdJogo"));
  const jogoId = String(formData.get("jogoId") ?? "");
  if (!Number.isInteger(fpfIdJogo) || !jogoId) return;

  const supabase = createClient();
  await supabase
    .from("jogos")
    .update({
      fpf_id_jogo: fpfIdJogo,
      fpf_link_sumula: campoObrigatorio(formData, "fpfLinkSumula") || null,
      fpf_sincronizado_em: new Date().toISOString(),
    })
    .eq("id", jogoId);

  revalidatePath("/jogos/fpf/pendentes");
  revalidatePath("/jogos");
}

/** Marca um jogo da FPF como "não é nosso" — nunca mais aparece na revisão de pendentes. */
export async function ignorarJogoFpf(formData: FormData): Promise<void> {
  const fpfIdJogo = Number(formData.get("fpfIdJogo"));
  if (!Number.isInteger(fpfIdJogo)) return;

  const supabase = createClient();
  await supabase.from("fpf_jogos_ignorados").insert({
    fpf_id_jogo: fpfIdJogo,
    descricao: campoObrigatorio(formData, "descricao"),
  });

  revalidatePath("/jogos/fpf/pendentes");
}
