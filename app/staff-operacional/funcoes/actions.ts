"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { funcaoCatalogoSchema } from "@/lib/validation/schemas";

/**
 * Gerencia o catálogo `staff_funcoes_catalogo`, compartilhado entre Profissional e Base — ver
 * `app/staff-operacional/funcoes/page.tsx`. Cadastrar/editar staff continua permitindo criar uma
 * função nova na hora (ver `resolveFuncaoId` em `app/staff-operacional/actions.ts`); esta tela
 * cobre o caso de só querer mexer no catálogo em si, sem vincular a nenhuma pessoa.
 */
export interface FuncaoCatalogoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

function parseForm(formData: FormData) {
  const raw = { nome: String(formData.get("nome") ?? "") };
  const result = funcaoCatalogoSchema.safeParse(raw);
  return { raw, result };
}

function friendlyDbError(error: { code?: string }): string {
  if (error.code === "23505") return "Já existe uma função com esse nome.";
  return "Não foi possível salvar. Tente novamente.";
}

export async function createFuncaoCatalogo(
  _prevState: FuncaoCatalogoFormState,
  formData: FormData,
): Promise<FuncaoCatalogoFormState> {
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const { error } = await supabase.from("staff_funcoes_catalogo").insert({ nome: result.data.nome.trim() });

  if (error) return { error: friendlyDbError(error), values: raw };

  revalidatePath("/staff-operacional/funcoes");
  revalidatePath("/staff-operacional");
  revalidatePath("/base/staff-operacional");
  revalidatePath("/cadastro-staff");
  revalidatePath("/cadastro-staff-base");
  return { values: {} };
}

export async function updateFuncaoCatalogo(
  _prevState: FuncaoCatalogoFormState,
  formData: FormData,
): Promise<FuncaoCatalogoFormState> {
  const id = String(formData.get("id") ?? "");
  const { raw, result } = parseForm(formData);

  if (!id) return { error: "Função não identificada. Recarregue a página e tente novamente.", values: raw };
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("staff_funcoes_catalogo")
    .update({ nome: result.data.nome.trim() })
    .eq("id", id);

  if (error) return { error: friendlyDbError(error), values: raw };

  revalidatePath("/staff-operacional/funcoes");
  revalidatePath("/staff-operacional");
  revalidatePath("/base/staff-operacional");
  revalidatePath("/cadastro-staff");
  revalidatePath("/cadastro-staff-base");
  return { values: { nome: result.data.nome.trim() } };
}

/**
 * Só é chamada quando a função não está em uso por nenhum staff (ver contagem calculada em
 * `page.tsx`, que só mostra o botão de excluir quando a contagem é zero) — por isso não precisa
 * tratar erro de violação de chave estrangeira aqui.
 */
export async function deleteFuncaoCatalogo(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("staff_funcoes_catalogo").delete().eq("id", id);

  revalidatePath("/staff-operacional/funcoes");
  revalidatePath("/staff-operacional");
  revalidatePath("/base/staff-operacional");
  revalidatePath("/cadastro-staff");
  revalidatePath("/cadastro-staff-base");
}
