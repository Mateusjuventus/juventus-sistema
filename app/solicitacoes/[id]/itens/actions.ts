"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadItemFotoIfPresent } from "@/lib/solicitacao-itens-upload";
import { recalcularValorTotal } from "@/lib/solicitacao-valor-total";
import {
  solicitacaoItemSchema,
  solicitacaoItemPagamentoSchema,
  solicitacaoItemPassagemSchema,
  solicitacaoItemTransporteSchema,
  solicitacaoItemHospedagemSchema,
} from "@/lib/validation/schemas";
import type { SolicitacaoTipo } from "@/lib/supabase/types";

export interface SolicitacaoItemFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

/** Cada tipo de solicitação guarda campos diferentes na mesma tabela `solicitacao_itens` — só o
 * conjunto de colunas usado muda (ver SolicitacaoItemRow). Compartilhado entre criar e editar, pra
 * nunca ficarem dessincronizados sobre quais campos existem em cada tipo. */
function parseItemForm(tipo: SolicitacaoTipo, formData: FormData) {
  if (tipo === "pagamento" || tipo === "reembolso") {
    const raw = {
      descricao: String(formData.get("descricao") ?? ""),
      valor: String(formData.get("valor") ?? ""),
      observacao: String(formData.get("observacao") ?? ""),
    };
    return { raw, result: solicitacaoItemPagamentoSchema.safeParse(raw) };
  }
  if (tipo === "passagem_aerea") {
    const raw = {
      passageiro: String(formData.get("passageiro") ?? ""),
      origem: String(formData.get("origem") ?? ""),
      destino: String(formData.get("destino") ?? ""),
      dataVoo: String(formData.get("dataVoo") ?? ""),
      horarioVoo: String(formData.get("horarioVoo") ?? ""),
      observacao: String(formData.get("observacao") ?? ""),
    };
    return { raw, result: solicitacaoItemPassagemSchema.safeParse(raw) };
  }
  if (tipo === "transporte") {
    const raw = {
      passageiro: String(formData.get("passageiro") ?? ""),
      origem: String(formData.get("origem") ?? ""),
      destino: String(formData.get("destino") ?? ""),
      dataVoo: String(formData.get("dataVoo") ?? ""),
      horarioVoo: String(formData.get("horarioVoo") ?? ""),
      valor: String(formData.get("valor") ?? ""),
      observacao: String(formData.get("observacao") ?? ""),
    };
    return { raw, result: solicitacaoItemTransporteSchema.safeParse(raw) };
  }
  if (tipo === "hospedagem") {
    const raw = {
      passageiro: String(formData.get("passageiro") ?? ""),
      cidade: String(formData.get("cidade") ?? ""),
      hotel: String(formData.get("hotel") ?? ""),
      dataEntrada: String(formData.get("dataEntrada") ?? ""),
      dataSaida: String(formData.get("dataSaida") ?? ""),
      tipoAcomodacao: String(formData.get("tipoAcomodacao") ?? ""),
      valor: String(formData.get("valor") ?? ""),
      observacao: String(formData.get("observacao") ?? ""),
    };
    return { raw, result: solicitacaoItemHospedagemSchema.safeParse(raw) };
  }
  const raw = {
    quantidade: String(formData.get("quantidade") ?? ""),
    item: String(formData.get("item") ?? ""),
    observacao: String(formData.get("observacao") ?? ""),
  };
  return { raw, result: solicitacaoItemSchema.safeParse(raw) };
}

export async function createSolicitacaoItem(
  _prevState: SolicitacaoItemFormState,
  formData: FormData,
): Promise<SolicitacaoItemFormState> {
  const solicitacaoId = String(formData.get("solicitacaoId") ?? "");
  const tipo = String(formData.get("tipo") ?? "") as SolicitacaoTipo;
  const { raw, result } = parseItemForm(tipo, formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const id = randomUUID();

  const { data: existentes } = await supabase
    .from("solicitacao_itens")
    .select("ordem")
    .eq("solicitacao_id", solicitacaoId)
    .order("ordem", { ascending: false })
    .limit(1);
  const proximaOrdem = existentes && existentes.length > 0 ? (existentes[0].ordem as number) + 1 : 0;

  if (tipo === "pagamento" || tipo === "reembolso") {
    const data = result.data as { descricao: string; valor: number; observacao?: string };
    const { error } = await supabase.from("solicitacao_itens").insert({
      id,
      solicitacao_id: solicitacaoId,
      descricao: data.descricao,
      valor: data.valor,
      observacao: data.observacao || null,
      ordem: proximaOrdem,
    });
    if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };
    await recalcularValorTotal(supabase, solicitacaoId);
  } else if (tipo === "passagem_aerea") {
    const data = result.data as {
      passageiro: string;
      origem?: string;
      destino?: string;
      dataVoo?: string;
      horarioVoo?: string;
      observacao?: string;
    };
    const { error } = await supabase.from("solicitacao_itens").insert({
      id,
      solicitacao_id: solicitacaoId,
      passageiro: data.passageiro,
      origem: data.origem || null,
      destino: data.destino || null,
      data_voo: data.dataVoo || null,
      horario_voo: data.horarioVoo || null,
      observacao: data.observacao || null,
      ordem: proximaOrdem,
    });
    if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };
  } else if (tipo === "transporte") {
    const data = result.data as {
      passageiro: string;
      origem?: string;
      destino?: string;
      dataVoo?: string;
      horarioVoo?: string;
      valor?: number | null;
      observacao?: string;
    };
    const { error } = await supabase.from("solicitacao_itens").insert({
      id,
      solicitacao_id: solicitacaoId,
      passageiro: data.passageiro,
      origem: data.origem || null,
      destino: data.destino || null,
      data_voo: data.dataVoo || null,
      horario_voo: data.horarioVoo || null,
      valor: data.valor ?? null,
      observacao: data.observacao || null,
      ordem: proximaOrdem,
    });
    if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };
    await recalcularValorTotal(supabase, solicitacaoId);
  } else if (tipo === "hospedagem") {
    const data = result.data as {
      passageiro: string;
      cidade?: string;
      hotel?: string;
      dataEntrada?: string;
      dataSaida?: string;
      tipoAcomodacao?: string;
      valor?: number | null;
      observacao?: string;
    };
    const { error } = await supabase.from("solicitacao_itens").insert({
      id,
      solicitacao_id: solicitacaoId,
      passageiro: data.passageiro,
      cidade: data.cidade || null,
      hotel: data.hotel || null,
      data_entrada: data.dataEntrada || null,
      data_saida: data.dataSaida || null,
      tipo_acomodacao: data.tipoAcomodacao || null,
      valor: data.valor ?? null,
      observacao: data.observacao || null,
      ordem: proximaOrdem,
    });
    if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };
    await recalcularValorTotal(supabase, solicitacaoId);
  } else {
    const data = result.data as { quantidade: string; item: string; observacao?: string };
    const { error: uploadError, path: fotoPath } = await uploadItemFotoIfPresent(
      supabase,
      formData.get("foto"),
      id,
    );
    if (uploadError) return { error: uploadError, values: raw };

    const { error } = await supabase.from("solicitacao_itens").insert({
      id,
      solicitacao_id: solicitacaoId,
      quantidade: data.quantidade,
      item: data.item,
      observacao: data.observacao || null,
      foto_path: fotoPath ?? null,
      ordem: proximaOrdem,
    });
    if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };
  }

  revalidatePath(`/solicitacoes/${solicitacaoId}`);
  redirect(`/solicitacoes/${solicitacaoId}`);
}

export async function updateSolicitacaoItem(
  _prevState: SolicitacaoItemFormState,
  formData: FormData,
): Promise<SolicitacaoItemFormState> {
  const solicitacaoId = String(formData.get("solicitacaoId") ?? "");
  const id = String(formData.get("id") ?? "");
  const tipo = String(formData.get("tipo") ?? "") as SolicitacaoTipo;
  const { raw, result } = parseItemForm(tipo, formData);

  if (!id || !solicitacaoId) {
    return { error: "Item não identificado. Recarregue a página e tente novamente.", values: raw };
  }
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();

  if (tipo === "pagamento" || tipo === "reembolso") {
    const data = result.data as { descricao: string; valor: number; observacao?: string };
    const { error } = await supabase
      .from("solicitacao_itens")
      .update({
        descricao: data.descricao,
        valor: data.valor,
        observacao: data.observacao || null,
      })
      .eq("id", id);
    if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };
    await recalcularValorTotal(supabase, solicitacaoId);
  } else if (tipo === "passagem_aerea") {
    const data = result.data as {
      passageiro: string;
      origem?: string;
      destino?: string;
      dataVoo?: string;
      horarioVoo?: string;
      observacao?: string;
    };
    const { error } = await supabase
      .from("solicitacao_itens")
      .update({
        passageiro: data.passageiro,
        origem: data.origem || null,
        destino: data.destino || null,
        data_voo: data.dataVoo || null,
        horario_voo: data.horarioVoo || null,
        observacao: data.observacao || null,
      })
      .eq("id", id);
    if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };
  } else if (tipo === "transporte") {
    const data = result.data as {
      passageiro: string;
      origem?: string;
      destino?: string;
      dataVoo?: string;
      horarioVoo?: string;
      valor?: number | null;
      observacao?: string;
    };
    const { error } = await supabase
      .from("solicitacao_itens")
      .update({
        passageiro: data.passageiro,
        origem: data.origem || null,
        destino: data.destino || null,
        data_voo: data.dataVoo || null,
        horario_voo: data.horarioVoo || null,
        valor: data.valor ?? null,
        observacao: data.observacao || null,
      })
      .eq("id", id);
    if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };
    await recalcularValorTotal(supabase, solicitacaoId);
  } else if (tipo === "hospedagem") {
    const data = result.data as {
      passageiro: string;
      cidade?: string;
      hotel?: string;
      dataEntrada?: string;
      dataSaida?: string;
      tipoAcomodacao?: string;
      valor?: number | null;
      observacao?: string;
    };
    const { error } = await supabase
      .from("solicitacao_itens")
      .update({
        passageiro: data.passageiro,
        cidade: data.cidade || null,
        hotel: data.hotel || null,
        data_entrada: data.dataEntrada || null,
        data_saida: data.dataSaida || null,
        tipo_acomodacao: data.tipoAcomodacao || null,
        valor: data.valor ?? null,
        observacao: data.observacao || null,
      })
      .eq("id", id);
    if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };
    await recalcularValorTotal(supabase, solicitacaoId);
  } else {
    const data = result.data as { quantidade: string; item: string; observacao?: string };
    const { error: uploadError, path: fotoPath } = await uploadItemFotoIfPresent(
      supabase,
      formData.get("foto"),
      id,
    );
    if (uploadError) return { error: uploadError, values: raw };

    const { error } = await supabase
      .from("solicitacao_itens")
      .update({
        quantidade: data.quantidade,
        item: data.item,
        observacao: data.observacao || null,
        ...(fotoPath ? { foto_path: fotoPath } : {}),
      })
      .eq("id", id);
    if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };
  }

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

  if (data?.solicitacao_id) {
    const { data: solicitacao } = await supabase
      .from("solicitacoes")
      .select("tipo")
      .eq("id", data.solicitacao_id)
      .single();
    if (
      solicitacao?.tipo === "pagamento" ||
      solicitacao?.tipo === "reembolso" ||
      solicitacao?.tipo === "transporte" ||
      solicitacao?.tipo === "hospedagem"
    ) {
      await recalcularValorTotal(supabase, data.solicitacao_id);
    }
    revalidatePath(`/solicitacoes/${data.solicitacao_id}`);
  }
}
