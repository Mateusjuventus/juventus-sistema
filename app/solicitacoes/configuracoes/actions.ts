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

/**
 * Configuração do Encarregado do Departamento que assina digitalmente as Solicitações do Futebol
 * Profissional (ver docs/superpowers/specs/2026-08-28-assinatura-digital-notificacoes-design.md,
 * Fase 2) — tabela singleton, mesmo padrão de `updateConfiguracaoFinanceiro`.
 */
export async function updateConfiguracaoSolicitacoes(
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
    ? await supabase.from("configuracoes_solicitacoes").update(payload).eq("id", id)
    : await supabase.from("configuracoes_solicitacoes").insert(payload);

  if (error) return { error: "Não foi possível salvar a configuração. Tente novamente.", values: raw };

  revalidatePath("/solicitacoes");
  revalidatePath("/solicitacoes/configuracoes");
  redirect("/solicitacoes");
}
