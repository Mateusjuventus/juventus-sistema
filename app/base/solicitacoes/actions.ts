"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadItemFotoIfPresent } from "@/lib/solicitacao-itens-upload";
import { recalcularValorTotalBase } from "@/lib/solicitacao-valor-total";
import { solicitacaoSchema, solicitacaoStatusSchema } from "@/lib/validation/schemas";
import type { SolicitacaoTipo } from "@/lib/supabase/types";

/** Espelha `app/solicitacoes/actions.ts` para o Futebol de Base — mesmos tipos/fluxo, contra
 * `solicitacoes_base`/`solicitacao_itens_base`. Solicitações do Base não têm dimensão `categoria`. */
export interface SolicitacaoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

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
    banco: String(formData.get("banco") ?? ""),
    agencia: String(formData.get("agencia") ?? ""),
    conta: String(formData.get("conta") ?? ""),
    tipoConta: String(formData.get("tipoConta") ?? ""),
    titularConta: String(formData.get("titularConta") ?? ""),
  };

  const result = solicitacaoSchema.safeParse(raw);
  return { raw, result };
}

async function salvarItensInlineBase(
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

      const { error } = await supabase.from("solicitacao_itens_base").insert({
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

      const { error } = await supabase.from("solicitacao_itens_base").insert({
        id: randomUUID(),
        solicitacao_id: solicitacaoId,
        descricao,
        observacao: observacoes[i]?.trim() || null,
        valor,
        ordem: ordem++,
      });
      if (error) return { error: "Não foi possível salvar os itens. Tente novamente." };
    }

    await recalcularValorTotalBase(supabase, solicitacaoId);
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

      const { error } = await supabase.from("solicitacao_itens_base").insert({
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

export async function createSolicitacaoBase(
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
    .from("solicitacoes_base")
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
      banco: data.banco || null,
      agencia: data.agencia || null,
      conta: data.conta || null,
      tipo_conta: data.tipoConta || null,
      titular_conta: data.titularConta || null,
    })
    .select("id")
    .single();

  if (error || !criada) {
    return { error: "Não foi possível salvar a solicitação. Tente novamente.", values: raw };
  }

  if (TIPOS_COM_ITENS.includes(data.tipo)) {
    const { error: itensError } = await salvarItensInlineBase(supabase, formData, criada.id, data.tipo);
    if (itensError) {
      return { error: `Solicitação salva, mas houve um problema com os itens: ${itensError}`, values: raw };
    }
  }

  revalidatePath("/base/solicitacoes");
  if (TIPOS_COM_ITENS.includes(data.tipo)) {
    redirect(`/base/solicitacoes/${criada.id}`);
  }
  redirect("/base/solicitacoes");
}

export async function updateSolicitacaoBase(
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
    .from("solicitacoes_base")
    .update({
      tipo: data.tipo,
      data_solicitacao: data.dataSolicitacao,
      solicitante: data.solicitante,
      setor: data.setor,
      descricao_necessidade: data.descricaoNecessidade || null,
      prazo_sugerido: data.prazoSugerido || null,
      chave_pix: data.chavePix || null,
      chave_pix_tipo: data.chavePixTipo || null,
      banco: data.banco || null,
      agencia: data.agencia || null,
      conta: data.conta || null,
      tipo_conta: data.tipoConta || null,
      titular_conta: data.titularConta || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar a solicitação. Tente novamente.", values: raw };

  if (TIPOS_COM_ITENS.includes(data.tipo)) {
    const { error: itensError } = await salvarItensInlineBase(supabase, formData, id, data.tipo);
    if (itensError) {
      return { error: `Solicitação salva, mas houve um problema com os itens: ${itensError}`, values: raw };
    }
  }

  revalidatePath("/base/solicitacoes");
  revalidatePath(`/base/solicitacoes/${id}`);
  redirect(`/base/solicitacoes/${id}`);
}

export async function deleteSolicitacaoBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();
  await supabase.from("solicitacoes_base").delete().eq("id", id);
  revalidatePath("/base/solicitacoes");
}

export async function updateSolicitacaoStatusBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("status") ?? "");
  const result = solicitacaoStatusSchema.safeParse({ status: raw });
  if (!result.success || !id) return;

  const supabase = createClient();
  await supabase.from("solicitacoes_base").update({ status: result.data.status }).eq("id", id);
  revalidatePath("/base/solicitacoes");
  revalidatePath(`/base/solicitacoes/${id}`);
}
