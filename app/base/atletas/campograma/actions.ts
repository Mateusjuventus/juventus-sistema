"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ATLETA_POSICAO_OPTIONS } from "@/lib/validation/schemas";

export interface MoverAtletaCampogramaState {
  error?: string;
}

/**
 * Move um atleta pra outra posição a partir do arrastar-e-soltar do Campograma (ver
 * docs/superpowers/specs/2026-08-26-campograma-foto-classificacao-design.md) — grava direto em
 * `atletas_base.posicao`, o mesmo campo do cadastro completo. Não reaproveita o `atletaBaseSchema`
 * inteiro (essa mutação atualiza um único campo, não o cadastro completo); valida só contra a lista
 * fixa das 9 posições, a mesma checada pelo schema.
 */
export async function moverAtletaCampograma(
  atletaId: string,
  novaPosicao: string,
): Promise<MoverAtletaCampogramaState> {
  if (!atletaId) return { error: "Atleta inválido." };
  if (!(ATLETA_POSICAO_OPTIONS as readonly string[]).includes(novaPosicao)) {
    return { error: "Posição inválida." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("atletas_base").update({ posicao: novaPosicao }).eq("id", atletaId);

  if (error) return { error: "Não foi possível mover o atleta. Tente novamente." };

  revalidatePath("/base/atletas/campograma");
  return {};
}
