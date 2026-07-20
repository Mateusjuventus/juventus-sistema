"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadItemFotoIfPresent } from "@/lib/solicitacao-itens-upload";
import { recalcularValorTotalBase } from "@/lib/solicitacao-valor-total";
import { solicitacaoItemSchema } from "@/lib/validation/schemas";

/** Espelha `app/solicitacoes/[id]/itens/actions.ts` para o Futebol de Base. */
export interface SolicitacaoItemFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

export async function createSolicitacaoItemBase(
  _prevState: SolicitacaoItemFormState,
  formData: FormData,
): Promise<SolicitacaoItemFormState> {
  const solicitacaoId = String(formData.get("solicitacaoId") ?? "");
  const raw = {
    quantidade: String(formData.get("quantidade") ?? ""),
    item: String(formData.get("item") ?? ""),
    observacao: String(formData.get("observacao") ?? ""),
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
    .from("solicitacao_itens_base")
    .select("ordem")
    .eq("solicitacao_id", solicitacaoId)
    .order("ordem", { ascending: false })
    .limit(1);
  const proximaOrdem = existentes && existentes.length > 0 ? (existentes[0].ordem as number) + 1 : 0;

  const { error } = await supabase.from("solicitacao_itens_base").insert({
    id,
    solicitacao_id: solicitacaoId,
    quantidade: result.data.quantidade,
    item: result.data.item,
    observacao: result.data.observacao || null,
    foto_path: fotoPath ?? null,
    ordem: proximaOrdem,
  });

  if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };

  revalidatePath(`/base/solicitacoes/${solicitacaoId}`);
  redirect(`/base/solicitacoes/${solicitacaoId}`);
}

export async function deleteSolicitacaoItemBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();
  const { data } = await supabase
    .from("solicitacao_itens_base")
    .delete()
    .eq("id", id)
    .select("solicitacao_id")
    .single();

  if (data?.solicitacao_id) {
    const { data: solicitacao } = await supabase
      .from("solicitacoes_base")
      .select("tipo")
      .eq("id", data.solicitacao_id)
      .single();
    if (solicitacao?.tipo === "pagamento" || solicitacao?.tipo === "reembolso") {
      await recalcularValorTotalBase(supabase, data.solicitacao_id);
    }
    revalidatePath(`/base/solicitacoes/${data.solicitacao_id}`);
  }
}
