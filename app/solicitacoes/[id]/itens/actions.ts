"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadItemFotoIfPresent } from "@/lib/solicitacao-itens-upload";
import { solicitacaoItemSchema } from "@/lib/validation/schemas";

export interface SolicitacaoItemFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

export async function createSolicitacaoItem(
  _prevState: SolicitacaoItemFormState,
  formData: FormData,
): Promise<SolicitacaoItemFormState> {
  const solicitacaoId = String(formData.get("solicitacaoId") ?? "");
  const raw = {
    quantidade: String(formData.get("quantidade") ?? ""),
    item: String(formData.get("item") ?? ""),
  };

  const result = solicitacaoItemSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const id = randomUUID();
  const { error: uploadError, path: fotoPath } = await uploadItemFotoIfPresent(
    supabase,
    formData.get("foto"),
    id,
  );
  if (uploadError) return { error: uploadError, values: raw };

  const { data: existentes } = await supabase
    .from("solicitacao_itens")
    .select("ordem")
    .eq("solicitacao_id", solicitacaoId)
    .order("ordem", { ascending: false })
    .limit(1);
  const proximaOrdem = existentes && existentes.length > 0 ? (existentes[0].ordem as number) + 1 : 0;

  const { error } = await supabase.from("solicitacao_itens").insert({
    id,
    solicitacao_id: solicitacaoId,
    quantidade: result.data.quantidade,
    item: result.data.item,
    foto_path: fotoPath ?? null,
    ordem: proximaOrdem,
  });

  if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };

  revalidatePath(`/solicitacoes/${solicitacaoId}`);
  redirect(`/solicitacoes/${solicitacaoId}`);
}

export async function deleteSolicitacaoItem(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();
  const { data } = await supabase
    .from("solicitacao_itens")
    .delete()
    .eq("id", id)
    .select("solicitacao_id")
    .single();

  if (data?.solicitacao_id) revalidatePath(`/solicitacoes/${data.solicitacao_id}`);
}
