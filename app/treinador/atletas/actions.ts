"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";

/**
 * Salva a Classificação (G1/G2/G3) de um atleta do elenco, a partir da seção "Meus atletas" do
 * Treinador (ver docs/superpowers/specs/2026-08-25-classificacao-dispensa-atleta-base-design.md,
 * seção 2) — mesmo padrão de "ação simples sem `useFormState`" já usado em
 * `alternarFichaCadastroAtletaBase` (app/base/atletas/actions.ts). Dupla checagem de permissão:
 * `getCategoriasTreinador` só devolve algo pra quem está logado como "treinador", e a categoria do
 * atleta é conferida contra as categorias liberadas pra esse treinador — mesma dupla checagem já
 * feita em `salvarParecerCaptacao`.
 */
export async function salvarClassificacaoTreinador(formData: FormData): Promise<void> {
  const supabase = createClient();
  const categorias = await getCategoriasTreinador(supabase);
  if (categorias.length === 0) return;

  const atletaId = String(formData.get("atletaId") ?? "");
  if (!atletaId) return;

  const classificacaoRaw = String(formData.get("classificacao") ?? "");
  const classificacao = ["g1", "g2", "g3"].includes(classificacaoRaw) ? classificacaoRaw : null;

  const { data: atleta } = await supabase
    .from("atletas_base")
    .select("categoria")
    .eq("id", atletaId)
    .maybeSingle();
  if (!atleta?.categoria || !categorias.includes(atleta.categoria)) return;

  await supabase.from("atletas_base").update({ classificacao }).eq("id", atletaId);

  revalidatePath("/treinador");
  revalidatePath("/base/atletas");
}
