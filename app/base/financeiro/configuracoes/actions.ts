"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { configuracaoFinanceiroSchema } from "@/lib/validation/schemas";

/** Espelha `app/financeiro/configuracoes/actions.ts` para o Futebol de Base. Desde a unificação
 * de Jogos/Convocação (30/10/2026, ver 0157_unificacao_jogos.sql) `configuracoes_financeiro`
 * ganhou a coluna `departamento` e passou a guardar os dois singletons (Profissional e Base)
 * juntos — `configuracoes_financeiro_base` deixou de existir. */
export interface ConfiguracaoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

// Assinatura 1 não tem mais "Usuário que assina digitalmente" aqui — quem pode assinar vem da
// função/categorias cadastradas na Comissão Técnica da Base (ver
// docs/superpowers/specs/2026-10-27-assinatura-financeiro-base-por-supervisor-design.md). O campo
// (e a coluna `assinatura1_usuario_id`) deixaram de existir.
function parseForm(formData: FormData) {
  const raw = {
    assinatura1Nome: String(formData.get("assinatura1Nome") ?? ""),
    assinatura1Cargo: String(formData.get("assinatura1Cargo") ?? ""),
    assinatura2Nome: String(formData.get("assinatura2Nome") ?? ""),
    assinatura2Cargo: String(formData.get("assinatura2Cargo") ?? ""),
    assinatura2UsuarioId: String(formData.get("assinatura2UsuarioId") ?? ""),
  };

  const result = configuracaoFinanceiroSchema.safeParse(raw);
  return { raw, result };
}

export async function updateConfiguracaoFinanceiroBase(
  _prevState: ConfiguracaoFormState,
  formData: FormData,
): Promise<ConfiguracaoFormState> {
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
    assinatura1_nome: data.assinatura1Nome,
    assinatura1_cargo: data.assinatura1Cargo,
    assinatura2_nome: data.assinatura2Nome,
    assinatura2_cargo: data.assinatura2Cargo,
    assinatura2_usuario_id: data.assinatura2UsuarioId || null,
  };

  const { error } = id
    ? await supabase.from("configuracoes_financeiro").update(payload).eq("id", id)
    : await supabase.from("configuracoes_financeiro").insert({ ...payload, departamento: "futebol_base" });

  if (error) return { error: "Não foi possível salvar as assinaturas. Tente novamente.", values: raw };

  revalidatePath("/base/financeiro");
  revalidatePath("/base/financeiro/configuracoes");
  redirect("/base/financeiro");
}
