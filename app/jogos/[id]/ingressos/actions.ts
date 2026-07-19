"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ingressoCargaSchema, ingressoSolicitacaoSchema } from "@/lib/validation/schemas";

export interface IngressoCargaFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
  /** Só usado pelo formulário inline de criação (lista principal) — indica sucesso pra limpar os
   * campos sem navegar pra outra página. A edição continua numa página própria e usa redirect. */
  success?: boolean;
}

export interface IngressoSolicitacaoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
  success?: boolean;
}

/**
 * Soma todas as cargas recebidas menos todo o atendido das solicitações daquele jogo — o saldo
 * nunca é uma coluna guardada (ver design doc), é recalculado aqui a cada lançamento. Quando
 * `excluirSolicitacaoId` é informado (edição de uma solicitação já existente), o atendido antigo
 * dessa própria linha não entra na soma — sem isso, editar uma solicitação pra baixo (reduzir o
 * atendido) ficaria bloqueado incorretamente contra o próprio valor antigo dela.
 */
async function calcularSaldoDisponivel(
  supabase: ReturnType<typeof createClient>,
  jogoId: string,
  excluirSolicitacaoId?: string,
): Promise<{ saldo: number } | { error: string }> {
  const { data: cargasData, error: cargasError } = await supabase
    .from("ingressos_cargas")
    .select("quantidade")
    .eq("jogo_id", jogoId);
  if (cargasError) return { error: "Não foi possível conferir o saldo de ingressos. Tente novamente." };

  const { data: solicitacoesData, error: solicitacoesError } = await supabase
    .from("ingressos_solicitacoes")
    .select("id, quantidade_atendida")
    .eq("jogo_id", jogoId);
  if (solicitacoesError) return { error: "Não foi possível conferir o saldo de ingressos. Tente novamente." };

  const totalCargas = ((cargasData ?? []) as { quantidade: number }[]).reduce(
    (soma, c) => soma + c.quantidade,
    0,
  );
  const totalAtendido = ((solicitacoesData ?? []) as { id: string; quantidade_atendida: number }[])
    .filter((s) => s.id !== excluirSolicitacaoId)
    .reduce((soma, s) => soma + s.quantidade_atendida, 0);

  return { saldo: totalCargas - totalAtendido };
}

function parseCargaForm(formData: FormData) {
  const raw = {
    quantidade: String(formData.get("quantidade") ?? ""),
    data: String(formData.get("data") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  };
  const result = ingressoCargaSchema.safeParse(raw);
  return { raw, result };
}

export async function createCarga(
  _prevState: IngressoCargaFormState,
  formData: FormData,
): Promise<IngressoCargaFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  const { raw, result } = parseCargaForm(formData);

  if (!jogoId) return { error: "Jogo não identificado. Recarregue a página e tente novamente.", values: raw };
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const { error } = await supabase.from("ingressos_cargas").insert({
    jogo_id: jogoId,
    quantidade: result.data.quantidade,
    data: result.data.data,
    observacoes: result.data.observacoes || null,
  });
  if (error) return { error: "Não foi possível salvar a carga. Tente novamente.", values: raw };

  revalidatePath(`/jogos/${jogoId}/ingressos`);
  return { success: true };
}

export async function updateCarga(
  _prevState: IngressoCargaFormState,
  formData: FormData,
): Promise<IngressoCargaFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  const id = String(formData.get("id") ?? "");
  const { raw, result } = parseCargaForm(formData);

  if (!jogoId || !id) {
    return { error: "Carga não identificada. Recarregue a página e tente novamente.", values: raw };
  }
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("ingressos_cargas")
    .update({
      quantidade: result.data.quantidade,
      data: result.data.data,
      observacoes: result.data.observacoes || null,
    })
    .eq("id", id);
  if (error) return { error: "Não foi possível salvar a carga. Tente novamente.", values: raw };

  revalidatePath(`/jogos/${jogoId}/ingressos`);
  redirect(`/jogos/${jogoId}/ingressos`);
}

export async function deleteCarga(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const { data } = await supabase.from("ingressos_cargas").select("jogo_id").eq("id", id).maybeSingle();
  await supabase.from("ingressos_cargas").delete().eq("id", id);

  if (data?.jogo_id) revalidatePath(`/jogos/${data.jogo_id}/ingressos`);
}

function parseSolicitacaoForm(formData: FormData) {
  const raw = {
    nomeSolicitante: String(formData.get("nomeSolicitante") ?? ""),
    quantidadeSolicitada: String(formData.get("quantidadeSolicitada") ?? ""),
    quantidadeAtendida: String(formData.get("quantidadeAtendida") ?? "") || undefined,
    observacoes: String(formData.get("observacoes") ?? ""),
  };
  const result = ingressoSolicitacaoSchema.safeParse(raw);
  return { raw, result };
}

export async function createSolicitacao(
  _prevState: IngressoSolicitacaoFormState,
  formData: FormData,
): Promise<IngressoSolicitacaoFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  const { raw, result } = parseSolicitacaoForm(formData);

  if (!jogoId) return { error: "Jogo não identificado. Recarregue a página e tente novamente.", values: raw };
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const quantidadeAtendida = result.data.quantidadeAtendida ?? 0;
  const supabase = createClient();

  if (quantidadeAtendida > 0) {
    const saldoResult = await calcularSaldoDisponivel(supabase, jogoId);
    if ("error" in saldoResult) return { error: saldoResult.error, values: raw };
    if (quantidadeAtendida > saldoResult.saldo) {
      return {
        error: `Saldo insuficiente: restam ${saldoResult.saldo} ingresso(s) disponível(is).`,
        values: raw,
      };
    }
  }

  const { error } = await supabase.from("ingressos_solicitacoes").insert({
    jogo_id: jogoId,
    nome_solicitante: result.data.nomeSolicitante,
    quantidade_solicitada: result.data.quantidadeSolicitada,
    quantidade_atendida: quantidadeAtendida,
    observacoes: result.data.observacoes || null,
  });
  if (error) return { error: "Não foi possível salvar a solicitação. Tente novamente.", values: raw };

  revalidatePath(`/jogos/${jogoId}/ingressos`);
  return { success: true };
}

export async function updateSolicitacao(
  _prevState: IngressoSolicitacaoFormState,
  formData: FormData,
): Promise<IngressoSolicitacaoFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  const id = String(formData.get("id") ?? "");
  const { raw, result } = parseSolicitacaoForm(formData);

  if (!jogoId || !id) {
    return { error: "Solicitação não identificada. Recarregue a página e tente novamente.", values: raw };
  }
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const quantidadeAtendida = result.data.quantidadeAtendida ?? 0;
  const supabase = createClient();

  if (quantidadeAtendida > 0) {
    const saldoResult = await calcularSaldoDisponivel(supabase, jogoId, id);
    if ("error" in saldoResult) return { error: saldoResult.error, values: raw };
    if (quantidadeAtendida > saldoResult.saldo) {
      return {
        error: `Saldo insuficiente: restam ${saldoResult.saldo} ingresso(s) disponível(is).`,
        values: raw,
      };
    }
  }

  const { error } = await supabase
    .from("ingressos_solicitacoes")
    .update({
      nome_solicitante: result.data.nomeSolicitante,
      quantidade_solicitada: result.data.quantidadeSolicitada,
      quantidade_atendida: quantidadeAtendida,
      observacoes: result.data.observacoes || null,
    })
    .eq("id", id);
  if (error) return { error: "Não foi possível salvar a solicitação. Tente novamente.", values: raw };

  revalidatePath(`/jogos/${jogoId}/ingressos`);
  redirect(`/jogos/${jogoId}/ingressos`);
}

export async function deleteSolicitacao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const { data } = await supabase
    .from("ingressos_solicitacoes")
    .select("jogo_id")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("ingressos_solicitacoes").delete().eq("id", id);

  if (data?.jogo_id) revalidatePath(`/jogos/${data.jogo_id}/ingressos`);
}
