"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { alojamentoConfigSchema } from "@/lib/validation/schemas";

export interface AlojamentoConfigFormState {
  error?: string;
}

/** Salva só a capacidade total (singleton, ver 0076_captacao_alojamento_base.sql) — quem está
 * alojado continua vindo direto de `atletas_base.alojado`, editado no cadastro de cada atleta. */
export async function atualizarConfigAlojamento(
  configId: string,
  _prevState: AlojamentoConfigFormState,
  formData: FormData,
): Promise<AlojamentoConfigFormState> {
  const raw = {
    capacidadeTotal: String(formData.get("capacidadeTotal") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  };
  const result = alojamentoConfigSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("alojamento_base_config")
    .update({
      capacidade_total: result.data.capacidadeTotal,
      observacoes: result.data.observacoes || null,
    })
    .eq("id", configId);
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/base/alojamento");
  return {};
}
