"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadItemFotoIfPresent } from "@/lib/solicitacao-itens-upload";
import { recalcularValorTotal } from "@/lib/solicitacao-valor-total";
import { solicitacaoSchema, solicitacaoStatusSchema } from "@/lib/validation/schemas";
import type { SolicitacaoTipo } from "@/lib/supabase/types";

export interface SolicitacaoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

/** Tipos de solicitação que têm lista de itens (Exame Médico não tem). */
const TIPOS_COM_ITENS: SolicitacaoTipo[] = ["compra", "pagamento", "reembolso", "passagem_aerea"];

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

/**
 * Salva os itens de uma solicitação já na criação/edição, direto do mesmo formulário — os nomes
 * dos campos que se repetem (um trio/conjunto por linha adicionada, ver
 * app/solicitacoes/solicitacao-form.tsx) mudam conforme o tipo:
 * - Compra: itemItem / itemQuantidade / itemFoto
 * - Pagamento / Reembolso: itemDescricao / itemObservacao / itemValor
 * - Passagem Aérea: itemPassageiro / itemOrigem / itemDestino / itemDataVoo / itemHorarioVoo / itemObservacao
 * Linhas em branco (sem o campo principal preenchido) são ignoradas. Depois de salvar os itens de
 * Pagamento/Reembolso, o valor total da solicitação é recalculado como a soma de todos os itens.
 */
async function salvarItensInline(
  supabase: ReturnType<typeof createClient>,
  formData: FormData,
  solicitacaoId: string,
  tipo: SolicitacaoTipo,
): Promise<{ error?: string }> {
  if (tipo === "compra") {
    const quantidades = formData.getAll("itemQuantidade").map(String);
    const descricoes = formData.getAll("itemItem").map(String);
    const observacoes = formData.getAll("itemObservacao").map(String);
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
        observacao: observacoes[i]?.trim() || null,
        foto_path: fotoPath ?? null,
        ordem: ordem++,
      });
      if (error) return { error: "Não foi possível salvar os itens. Tente novamente." };
    }
    return {};
  }

  if (tipo === "pagamento" || tipo === "reembolso") {
    const descricoes = formData.getAll("itemDescricao").map(String);
    const observacoes = formData.getAll("itemObservacao").map(String);
    const valores = formData.getAll("itemValor").map(String);

    let ordem = 0;
    for (let i = 0; i < descricoes.length; i++) {
      const descricao = descricoes[i]?.trim();
      if (!descricao) continue;
      const valorStr = valores[i]?.trim();
      const valor = valorStr ? Number(valorStr) : null;

      const { error } = await supabase.from("solicitacao_itens").insert({
        id: randomUUID(),
        solicitacao_id: solicitacaoId,
        descricao,
        observacao: observacoes[i]?.trim() || null,
        valor,
        ordem: ordem++,
      });
      if (error) return { error: "Não foi possível salvar os itens. Tente novamente." };
    }

    await recalcularValorTotal(supabase, solicitacaoId);
    return {};
  }

  if (tipo === "passagem_aerea") {
    const passageiros = formData.getAll("itemPassageiro").map(String);
    const origens = formData.getAll("itemOrigem").map(String);
    const destinos = formData.getAll("itemDestino").map(String);
    const datasVoo = formData.getAll("itemDataVoo").map(String);
    const horariosVoo = formData.getAll("itemHorarioVoo").map(String);
    const observacoes = formData.getAll("itemObservacao").map(String);

    let ordem = 0;
    for (let i = 0; i < passageiros.length; i++) {
      const passageiro = passageiros[i]?.trim();
      if (!passageiro) continue;

      const { error } = await supabase.from("solicitacao_itens").insert({
        id: randomUUID(),
        solicitacao_id: solicitacaoId,
        passageiro,
        origem: origens[i]?.trim() || null,
        destino: destinos[i]?.trim() || null,
        data_voo: datasVoo[i]?.trim() || null,
        horario_voo: horariosVoo[i]?.trim() || null,
        observacao: observacoes[i]?.trim() || null,
        ordem: ordem++,
      });
      if (error) return { error: "Não foi possível salvar os itens. Tente novamente." };
    }
    return {};
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
      valor: null,
      chave_pix: data.chavePix || null,
      chave_pix_tipo: data.chavePixTipo || null,
    })
    .select("id")
    .single();

  if (error || !criada) {
    return { error: "Não foi possível salvar a solicitação. Tente novamente.", values: raw };
  }

  if (TIPOS_COM_ITENS.includes(data.tipo)) {
    const { error: itensError } = await salvarItensInline(supabase, formData, criada.id, data.tipo);
    if (itensError) {
      return { error: `Solicitação salva, mas houve um problema com os itens: ${itensError}`, values: raw };
    }
  }

  revalidatePath("/solicitacoes");
  if (TIPOS_COM_ITENS.includes(data.tipo)) {
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
      chave_pix: data.chavePix || null,
      chave_pix_tipo: data.chavePixTipo || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar a solicitação. Tente novamente.", values: raw };

  if (TIPOS_COM_ITENS.includes(data.tipo)) {
    const { error: itensError } = await salvarItensInline(supabase, formData, id, data.tipo);
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
