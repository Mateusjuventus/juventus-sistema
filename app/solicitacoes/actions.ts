"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadItemFotoIfPresent } from "@/lib/solicitacao-itens-upload";
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
    passageiro: String(formData.get("passageiro") ?? ""),
    origem: String(formData.get("origem") ?? ""),
    destino: String(formData.get("destino") ?? ""),
    dataVoo: String(formData.get("dataVoo") ?? ""),
    horarioVoo: String(formData.get("horarioVoo") ?? ""),
  };

  const result = solicitacaoSchema.safeParse(raw);
  return { raw, result };
}

/**
 * Salva os itens de uma solicitação de Compra já na criação, direto do mesmo formulário — os
 * campos "itemQuantidade"/"itemItem"/"itemFoto" se repetem, um trio por linha adicionada no
 * formulário (ver app/solicitacoes/solicitacao-form.tsx), na mesma ordem em que aparecem na tela.
 * Linhas sem descrição do item são ignoradas (ex.: uma linha em branco deixada sem preencher).
 */
async function salvarItensInline(
  supabase: ReturnType<typeof createClient>,
  formData: FormData,
  solicitacaoId: string,
): Promise<{ error?: string }> {
  const quantidades = formData.getAll("itemQuantidade").map(String);
  const descricoes = formData.getAll("itemItem").map(String);
  const fotos = formData.getAll("itemFoto");

  let ordem = 0;
  for (let i = 0; i < descricoes.length; i++) {
    const item = descricoes[i]?.trim();
    if (!item) continue;
    const quantidade = quantidades[i]?.trim() || "1";

    const id = randomUUID();
    const { error: uploadError, path: fotoPath } = await uploadItemFotoIfPresent(supabase, fotos[i] ?? null, id);
    if (uploadError) return { error: uploadError };

    const { error } = await supabase.from("solicitacao_itens").insert({
      id,
      solicitacao_id: solicitacaoId,
      quantidade,
      item,
      foto_path: fotoPath ?? null,
      ordem: ordem++,
    });
    if (error) return { error: "Não foi possível salvar os itens. Tente novamente." };
  }

  return {};
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
      descricao_necessidade: data.descricaoNecessidade || null,
      prazo_sugerido: data.prazoSugerido || null,
      valor: data.valor ?? null,
      chave_pix: data.chavePix || null,
      chave_pix_tipo: data.chavePixTipo || null,
      passageiro: data.passageiro || null,
      origem: data.origem || null,
      destino: data.destino || null,
      data_voo: data.dataVoo || null,
      horario_voo: data.horarioVoo || null,
    })
    .select("id")
    .single();

  if (error || !criada) {
    return { error: "Não foi possível salvar a solicitação. Tente novamente.", values: raw };
  }

  if (data.tipo === "compra") {
    const { error: itensError } = await salvarItensInline(supabase, formData, criada.id);
    if (itensError) {
      return { error: `Solicitação salva, mas houve um problema com os itens: ${itensError}`, values: raw };
    }
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
      descricao_necessidade: data.descricaoNecessidade || null,
      prazo_sugerido: data.prazoSugerido || null,
      valor: data.valor ?? null,
      chave_pix: data.chavePix || null,
      chave_pix_tipo: data.chavePixTipo || null,
      passageiro: data.passageiro || null,
      origem: data.origem || null,
      destino: data.destino || null,
      data_voo: data.dataVoo || null,
      horario_voo: data.horarioVoo || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar a solicitação. Tente novamente.", values: raw };

  if (data.tipo === "compra") {
    const { error: itensError } = await salvarItensInline(supabase, formData, id);
    if (itensError) {
      return { error: `Solicitação salva, mas houve um problema com os itens: ${itensError}`, values: raw };
    }
  }

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
