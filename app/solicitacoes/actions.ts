"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { solicitacaoSchema, solicitacaoStatusSchema } from "@/lib/validation/schemas";

export interface SolicitacaoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

function parseForm(formData: FormData) {
  const raw = {
    tipo: String(formData.get("tipo") ?? ""),
    dataSolicitacao: String(formData.get("dataSolicitacao") ?? ""),
    solicitante: String(formData.get("solicitante") ?? ""),
    setor: String(formData.get("setor") ?? ""),
    descricaoNecessidade: String(formData.get("descricaoNecessidade") ?? ""),
    prazoSugerido: String(formData.get("prazoSugerido") ?? ""),
    valor: String(formData.get("valor") ?? "") || undefined,
    chavePix: String(formData.get("chavePix") ?? ""),
    chavePixTipo: String(formData.get("chavePixTipo") ?? ""),
  };

  const result = solicitacaoSchema.safeParse(raw);
  return { raw, result };
}

export async function createSolicitacao(
  _prevState: SolicitacaoFormState,
  formData: FormData,
): Promise<SolicitacaoFormState> {
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  const { data: criada, error } = await supabase
    .from("solicitacoes")
    .insert({
      tipo: data.tipo,
      data_solicitacao: data.dataSolicitacao,
      solicitante: data.solicitante,
      setor: data.setor,
      descricao_necessidade: data.descricaoNecessidade,
      prazo_sugerido: data.prazoSugerido || null,
      valor: data.valor ?? null,
      chave_pix: data.chavePix || null,
      chave_pix_tipo: data.chavePixTipo || null,
    })
    .select("id")
    .single();

  if (error || !criada) {
    return { error: "Não foi possível salvar a solicitação. Tente novamente.", values: raw };
  }

  revalidatePath("/solicitacoes");
  if (data.tipo === "compra") {
    redirect(`/solicitacoes/${criada.id}`);
  }
  redirect("/solicitacoes");
}

export async function updateSolicitacao(
  _prevState: SolicitacaoFormState,
  formData: FormData,
): Promise<SolicitacaoFormState> {
  const id = String(formData.get("id") ?? "");
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  const { error } = await supabase
    .from("solicitacoes")
    .update({
      tipo: data.tipo,
      data_solicitacao: data.dataSolicitacao,
      solicitante: data.solicitante,
      setor: data.setor,
      descricao_necessidade: data.descricaoNecessidade,
      prazo_sugerido: data.prazoSugerido || null,
      valor: data.valor ?? null,
      chave_pix: data.chavePix || null,
      chave_pix_tipo: data.chavePixTipo || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar a solicitação. Tente novamente.", values: raw };

  revalidatePath("/solicitacoes");
  revalidatePath(`/solicitacoes/${id}`);
  redirect(`/solicitacoes/${id}`);
}

export async function deleteSolicitacao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();
  await supabase.from("solicitacoes").delete().eq("id", id);
  revalidatePath("/solicitacoes");
}

/** Troca rápida de status direto na listagem, sem precisar abrir a solicitação para editar. */
export async function updateSolicitacaoStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("status") ?? "");
  const result = solicitacaoStatusSchema.safeParse({ status: raw });
  if (!result.success || !id) return;

  const supabase = createClient();
  await supabase.from("solicitacoes").update({ status: result.data.status }).eq("id", id);
  revalidatePath("/solicitacoes");
  revalidatePath(`/solicitacoes/${id}`);
}
