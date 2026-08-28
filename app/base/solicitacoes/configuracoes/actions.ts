"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { configuracaoSolicitacoesSchema } from "@/lib/validation/schemas";

export interface ConfiguracaoSolicitacoesFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

function parseForm(formData: FormData) {
  const raw = {
    encarregadoNome: String(formData.get("encarregadoNome") ?? ""),
    encarregadoCargo: String(formData.get("encarregadoCargo") ?? ""),
    encarregadoUsuarioId: String(formData.get("encarregadoUsuarioId") ?? ""),
  };

  const result = configuracaoSolicitacoesSchema.safeParse(raw);
  return { raw, result };
}

/** Espelha `app/solicitacoes/configuracoes/actions.ts` para o Futebol de Base — grava em
 * `configuracoes_solicitacoes_base` (tabela singleton independente). */
export async function updateConfiguracaoSolicitacoesBase(
  _prevState: ConfiguracaoSolicitacoesFormState,
  formData: FormData,
): Promise<ConfiguracaoSolicitacoesFormState> {
  const id = String(formData.get("id") ?? "");
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  const payload = {
    encarregado_nome: data.encarregadoNome,
    encarregado_cargo: data.encarregadoCargo,
    encarregado_usuario_id: data.encarregadoUsuarioId || null,
  };

  const { error } = id
    ? await supabase.from("configuracoes_solicitacoes_base").update(payload).eq("id", id)
    : await supabase.from("configuracoes_solicitacoes_base").insert(payload);

  if (error) return { error: "Não foi possível salvar a configuração. Tente novamente.", values: raw };

  revalidatePath("/base/solicitacoes");
  revalidatePath("/base/solicitacoes/configuracoes");
  redirect("/base/solicitacoes");
}
