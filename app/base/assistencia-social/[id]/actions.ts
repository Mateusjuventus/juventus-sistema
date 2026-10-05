"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface AssistenciaSocialFormState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
}

function revalidarFicha(atletaId: string) {
  revalidatePath(`/base/assistencia-social/${atletaId}`);
}

/** Registra um atendimento novo — qualquer um com o módulo liberado pode (não existe aqui a
 * distinção "pode editar"/"só vê" que a Fisioterapia tem, ver `getFisioterapiaPodeEditar`; o
 * próprio módulo já é a permissão). */
export async function registrarAtendimento(
  _prevState: AssistenciaSocialFormState,
  formData: FormData,
): Promise<AssistenciaSocialFormState> {
  const supabase = createClient();

  const atletaId = String(formData.get("atletaId") ?? "");
  const data = String(formData.get("data") ?? "");
  const anotacoes = String(formData.get("anotacoes") ?? "").trim();
  const encaminhamento = String(formData.get("encaminhamento") ?? "").trim() || null;

  const fieldErrors: Record<string, string> = {};
  if (!atletaId) fieldErrors.atletaId = "Atleta inválido.";
  if (!data) fieldErrors.data = "Data é obrigatória.";
  if (!anotacoes) fieldErrors.anotacoes = "Descreva o atendimento.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("assistencia_social_atendimentos").insert({
    atleta_id: atletaId,
    data,
    anotacoes,
    encaminhamento,
    created_by: user?.id ?? null,
  });
  if (error) return { error: `Não foi possível salvar o atendimento. Tente novamente. (${error.message})` };

  revalidarFicha(atletaId);
  return { success: "Atendimento registrado." };
}

/** Mesmo padrão de `atualizarAtendimento` da Fisioterapia — corrigir um atendimento já lançado. */
export async function atualizarAtendimento(
  _prevState: AssistenciaSocialFormState,
  formData: FormData,
): Promise<AssistenciaSocialFormState> {
  const supabase = createClient();

  const atletaId = String(formData.get("atletaId") ?? "");
  const atendimentoId = String(formData.get("atendimentoId") ?? "");
  if (!atletaId || !atendimentoId) return { error: "Não foi possível identificar o atendimento." };

  const data = String(formData.get("data") ?? "").trim();
  const anotacoes = String(formData.get("anotacoes") ?? "").trim();
  const encaminhamento = String(formData.get("encaminhamento") ?? "").trim() || null;

  if (!data) return { error: "Data é obrigatória." };
  if (!anotacoes) return { error: "Descreva o atendimento." };

  const { error } = await supabase
    .from("assistencia_social_atendimentos")
    .update({ data, anotacoes, encaminhamento })
    .eq("id", atendimentoId);
  if (error) return { error: `Não foi possível salvar o atendimento. Tente novamente. (${error.message})` };

  revalidarFicha(atletaId);
  return { success: "Atendimento atualizado." };
}

export interface DeleteAssistenciaSocialState {
  error?: string;
}

export async function excluirAtendimento(
  _prevState: DeleteAssistenciaSocialState,
  formData: FormData,
): Promise<DeleteAssistenciaSocialState> {
  const supabase = createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Não foi possível identificar o atendimento." };

  const { data: atendimentoAtual } = await supabase
    .from("assistencia_social_atendimentos")
    .select("atleta_id")
    .eq("id", id)
    .maybeSingle();
  const atletaId = (atendimentoAtual as { atleta_id: string } | null)?.atleta_id;
  if (!atletaId) return { error: "Atendimento não encontrado." };

  const { error } = await supabase.from("assistencia_social_atendimentos").delete().eq("id", id);
  if (error) return { error: `Não foi possível excluir o atendimento. Tente novamente. (${error.message})` };

  revalidarFicha(atletaId);
  return {};
}
