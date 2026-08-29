"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { configuracaoDispensaSchema } from "@/lib/validation/schemas";

export interface ConfiguracaoDispensaFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

/**
 * Fase 3 (ver docs/superpowers/specs/2026-08-28-assinatura-digital-notificacoes-design.md) —
 * grava quem é o "Departamento" que assina o Relatório de Dispensa. Sem vincular ninguém, volta a
 * ser "qualquer master pode assinar" (comportamento de antes desta tela existir).
 */
export async function updateConfiguracaoDispensaBase(
  _prevState: ConfiguracaoDispensaFormState,
  formData: FormData,
): Promise<ConfiguracaoDispensaFormState> {
  const id = String(formData.get("id") ?? "");
  const raw = { departamentoUsuarioId: String(formData.get("departamentoUsuarioId") ?? "") };
  const result = configuracaoDispensaSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const payload = { departamento_usuario_id: result.data.departamentoUsuarioId || null };

  const { error } = id
    ? await supabase.from("configuracoes_dispensa_base").update(payload).eq("id", id)
    : await supabase.from("configuracoes_dispensa_base").insert(payload);

  if (error) return { error: "Não foi possível salvar a configuração. Tente novamente.", values: raw };

  revalidatePath("/base/atletas");
  revalidatePath("/base/atletas/configuracoes");
  redirect("/base/atletas");
}
