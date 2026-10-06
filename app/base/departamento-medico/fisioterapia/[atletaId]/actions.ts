"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getFisioterapiaPodeEditarBase } from "@/lib/auth/role";
import { statusFisioterapiaAtletaBase } from "@/lib/futebol/fisioterapia-base";
import { hojeBrasilia } from "@/lib/data-brasil";
import { recomputarStatusAtualBase, registrarStatusAtletaBase } from "@/lib/futebol/status-historico-base";
import type { AtletaBaseStatus, AtletaBaseStatusHistoricoRow, FisioterapiaTipo } from "@/lib/supabase/types";

/**
 * Espelha `app/departamento-medico/fisioterapia/[atletaId]/actions.ts` (Profissional), gravando
 * nas tabelas `_base` e usando `getFisioterapiaPodeEditarBase`/`statusFisioterapiaAtletaBase`/
 * `registrarStatusAtletaBase`. Ver docs/superpowers/specs/2026-10-06-fisioterapia-base-design.md.
 * `categoria` chega como campo oculto do formulário (o atleta já vem carregado na ficha) em vez de
 * uma query extra, só pra revalidar a página certa de `/base/atletas/[categoria]`.
 */

const TIPOS_VALIDOS: FisioterapiaTipo[] = [
  "muscular",
  "articular",
  "tendinea_fascial",
  "ligamentar",
  "osseo",
  "trauma",
];

function parseTipo(raw: FormDataEntryValue | null): FisioterapiaTipo | null {
  const valor = String(raw ?? "");
  return (TIPOS_VALIDOS as string[]).includes(valor) ? (valor as FisioterapiaTipo) : null;
}

export interface FisioterapiaFormStateBase {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
}

/** Recalcula `atletas_base.status` a partir das lesões que sobraram sem `data_fim` pra esse atleta
 * — mesma lógica de `sincronizarStatusAtleta` (Profissional). Roda dentro da mesma Server Action
 * que salva/encerra/exclui uma lesão. */
async function sincronizarStatusAtletaBase(
  supabase: ReturnType<typeof createClient>,
  atletaId: string,
  dataInicio: string,
  dataFim: string | null,
): Promise<void> {
  const { count } = await supabase
    .from("fisioterapia_lesoes_base")
    .select("*", { count: "exact", head: true })
    .eq("atleta_id", atletaId)
    .is("data_fim", null)
    .not("data_inicio", "is", null);

  const novoStatus: AtletaBaseStatus = statusFisioterapiaAtletaBase((count ?? 0) > 0);

  const { data: atletaAtual } = await supabase.from("atletas_base").select("status").eq("id", atletaId).maybeSingle();
  if ((atletaAtual as { status: AtletaBaseStatus } | null)?.status === novoStatus) return;

  const dataEvento = novoStatus === "departamento_medico" ? dataInicio : (dataFim ?? hojeBrasilia());
  await registrarStatusAtletaBase(supabase, atletaId, novoStatus, dataEvento);
}

function revalidarFichaBase(atletaId: string, categoria: string): void {
  revalidatePath(`/base/departamento-medico/fisioterapia/${atletaId}`);
  revalidatePath("/base/departamento-medico/fisioterapia");
  revalidatePath("/base/departamento-medico/fisioterapia/relatorio");
  revalidatePath("/base/atletas");
  if (categoria) {
    revalidatePath(`/base/atletas/${categoria}`);
    revalidatePath(`/base/atletas/${categoria}/${atletaId}/ver`);
  }
}

export async function registrarLesaoBase(
  _prevState: FisioterapiaFormStateBase,
  formData: FormData,
): Promise<FisioterapiaFormStateBase> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditarBase(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const atletaId = String(formData.get("atletaId") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const descricao = String(formData.get("descricao") ?? "").trim();
  const tipo = parseTipo(formData.get("tipo"));
  const dataInicio = String(formData.get("dataInicio") ?? "");
  const dataFim = String(formData.get("dataFim") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  const fieldErrors: Record<string, string> = {};
  if (!atletaId) fieldErrors.atletaId = "Atleta inválido.";
  if (!descricao) fieldErrors.descricao = "Descreva a lesão.";
  if (!tipo) fieldErrors.tipo = "Escolha o tipo da lesão.";
  if (!dataInicio) fieldErrors.dataInicio = "Data de início é obrigatória.";
  if (dataFim && dataInicio && dataFim < dataInicio) {
    fieldErrors.dataFim = "Data de fim não pode ser antes da data de início.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("fisioterapia_lesoes_base").insert({
    atleta_id: atletaId,
    descricao,
    tipo,
    data_inicio: dataInicio,
    data_fim: dataFim,
    observacoes,
    created_by: user?.id ?? null,
  });
  if (error) return { error: `Não foi possível salvar a lesão. Tente novamente. (${error.message})` };

  await sincronizarStatusAtletaBase(supabase, atletaId, dataInicio, dataFim);
  revalidarFichaBase(atletaId, categoria);
  return { success: "Lesão registrada." };
}

export async function encerrarLesaoBase(
  _prevState: FisioterapiaFormStateBase,
  formData: FormData,
): Promise<FisioterapiaFormStateBase> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditarBase(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const lesaoId = String(formData.get("lesaoId") ?? "");
  const atletaId = String(formData.get("atletaId") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const dataInicio = String(formData.get("dataInicioAtual") ?? "");
  const dataFim = String(formData.get("dataFim") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!lesaoId || !atletaId) fieldErrors.dataFim = "Lesão inválida.";
  if (!dataFim) fieldErrors.dataFim = "Informe a data de fim.";
  if (dataFim && dataInicio && dataFim < dataInicio) {
    fieldErrors.dataFim = "Data de fim não pode ser antes da data de início.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { error } = await supabase
    .from("fisioterapia_lesoes_base")
    .update({ data_fim: dataFim, updated_at: new Date().toISOString() })
    .eq("id", lesaoId);
  if (error) return { error: `Não foi possível encerrar a lesão. Tente novamente. (${error.message})` };

  await sincronizarStatusAtletaBase(supabase, atletaId, dataInicio, dataFim);
  revalidarFichaBase(atletaId, categoria);
  return { success: "Lesão encerrada." };
}

export async function registrarQueixaBase(
  _prevState: FisioterapiaFormStateBase,
  formData: FormData,
): Promise<FisioterapiaFormStateBase> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditarBase(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const atletaId = String(formData.get("atletaId") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const tipo = parseTipo(formData.get("tipo"));
  const data = String(formData.get("data") ?? "");
  const descricao = String(formData.get("descricao") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!atletaId) fieldErrors.atletaId = "Atleta inválido.";
  if (!tipo) fieldErrors.tipo = "Escolha o tipo da queixa.";
  if (!data) fieldErrors.data = "Data é obrigatória.";
  if (!descricao) fieldErrors.descricao = "Descreva a queixa.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("fisioterapia_queixas_base").insert({
    atleta_id: atletaId,
    tipo,
    data,
    descricao,
    created_by: user?.id ?? null,
  });
  if (error) return { error: `Não foi possível salvar a queixa. Tente novamente. (${error.message})` };

  revalidarFichaBase(atletaId, categoria);
  return { success: "Queixa registrada." };
}

export interface DeleteFisioterapiaStateBase {
  error?: string;
}

export async function excluirLesaoBase(
  _prevState: DeleteFisioterapiaStateBase,
  formData: FormData,
): Promise<DeleteFisioterapiaStateBase> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditarBase(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Não foi possível identificar a lesão." };

  const { data: lesaoAtual } = await supabase
    .from("fisioterapia_lesoes_base")
    .select("atleta_id")
    .eq("id", id)
    .maybeSingle();
  const atletaId = (lesaoAtual as { atleta_id: string } | null)?.atleta_id;
  if (!atletaId) return { error: "Lesão não encontrada." };

  const { error } = await supabase.from("fisioterapia_lesoes_base").delete().eq("id", id);
  if (error) return { error: `Não foi possível excluir a lesão. Tente novamente. (${error.message})` };

  const { data: atletaAtual } = await supabase.from("atletas_base").select("categoria").eq("id", atletaId).maybeSingle();
  await sincronizarStatusAtletaBase(supabase, atletaId, hojeBrasilia(), null);
  revalidarFichaBase(atletaId, (atletaAtual as { categoria: string } | null)?.categoria ?? "");
  return {};
}

export async function excluirQueixaBase(
  _prevState: DeleteFisioterapiaStateBase,
  formData: FormData,
): Promise<DeleteFisioterapiaStateBase> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditarBase(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Não foi possível identificar a queixa." };

  const { data: queixaAtual } = await supabase
    .from("fisioterapia_queixas_base")
    .select("atleta_id")
    .eq("id", id)
    .maybeSingle();
  const atletaId = (queixaAtual as { atleta_id: string } | null)?.atleta_id;
  if (!atletaId) return { error: "Queixa não encontrada." };

  const { error } = await supabase.from("fisioterapia_queixas_base").delete().eq("id", id);
  if (error) return { error: `Não foi possível excluir a queixa. Tente novamente. (${error.message})` };

  const { data: atletaAtual } = await supabase.from("atletas_base").select("categoria").eq("id", atletaId).maybeSingle();
  revalidarFichaBase(atletaId, (atletaAtual as { categoria: string } | null)?.categoria ?? "");
  return {};
}

export async function registrarAtendimentoBase(
  _prevState: FisioterapiaFormStateBase,
  formData: FormData,
): Promise<FisioterapiaFormStateBase> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditarBase(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const atletaId = String(formData.get("atletaId") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const data = String(formData.get("data") ?? "");
  const descricao = String(formData.get("descricao") ?? "").trim();
  const lesaoId = String(formData.get("lesaoId") ?? "").trim() || null;

  const fieldErrors: Record<string, string> = {};
  if (!atletaId) fieldErrors.atletaId = "Atleta inválido.";
  if (!data) fieldErrors.data = "Data é obrigatória.";
  if (!descricao) fieldErrors.descricao = "Descreva o atendimento.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("fisioterapia_atendimentos_base").insert({
    atleta_id: atletaId,
    data,
    descricao,
    lesao_id: lesaoId,
    created_by: user?.id ?? null,
  });
  if (error) return { error: `Não foi possível salvar o atendimento. Tente novamente. (${error.message})` };

  revalidarFichaBase(atletaId, categoria);
  return { success: "Atendimento registrado." };
}

export async function atualizarAtendimentoBase(
  _prevState: FisioterapiaFormStateBase,
  formData: FormData,
): Promise<FisioterapiaFormStateBase> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditarBase(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const atletaId = String(formData.get("atletaId") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const atendimentoId = String(formData.get("atendimentoId") ?? "");
  if (!atletaId || !atendimentoId) return { error: "Não foi possível identificar o atendimento." };

  const data = String(formData.get("data") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const lesaoId = String(formData.get("lesaoId") ?? "").trim() || null;

  if (!data) return { error: "Data é obrigatória." };
  if (!descricao) return { error: "Descreva o atendimento." };

  const { error } = await supabase
    .from("fisioterapia_atendimentos_base")
    .update({ data, descricao, lesao_id: lesaoId })
    .eq("id", atendimentoId);
  if (error) return { error: `Não foi possível salvar o atendimento. Tente novamente. (${error.message})` };

  revalidarFichaBase(atletaId, categoria);
  return { success: "Atendimento atualizado." };
}

export async function excluirAtendimentoBase(
  _prevState: DeleteFisioterapiaStateBase,
  formData: FormData,
): Promise<DeleteFisioterapiaStateBase> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditarBase(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Não foi possível identificar o atendimento." };

  const { data: atendimentoAtual } = await supabase
    .from("fisioterapia_atendimentos_base")
    .select("atleta_id")
    .eq("id", id)
    .maybeSingle();
  const atletaId = (atendimentoAtual as { atleta_id: string } | null)?.atleta_id;
  if (!atletaId) return { error: "Atendimento não encontrado." };

  const { error } = await supabase.from("fisioterapia_atendimentos_base").delete().eq("id", id);
  if (error) return { error: `Não foi possível excluir o atendimento. Tente novamente. (${error.message})` };

  const { data: atletaAtual } = await supabase.from("atletas_base").select("categoria").eq("id", atletaId).maybeSingle();
  revalidarFichaBase(atletaId, (atletaAtual as { categoria: string } | null)?.categoria ?? "");
  return {};
}

export async function atualizarLesaoBase(
  _prevState: FisioterapiaFormStateBase,
  formData: FormData,
): Promise<FisioterapiaFormStateBase> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditarBase(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const atletaId = String(formData.get("atletaId") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const lesaoId = String(formData.get("lesaoId") ?? "");
  if (!atletaId || !lesaoId) return { error: "Não foi possível identificar a lesão." };

  const descricao = String(formData.get("descricao") ?? "").trim();
  const tipo = parseTipo(formData.get("tipo"));
  const dataInicio = String(formData.get("dataInicio") ?? "").trim() || null;
  const dataFim = String(formData.get("dataFim") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  if (!descricao) return { error: "Descreva a lesão." };
  if (!tipo) return { error: "Escolha o tipo da lesão." };
  if (dataFim && dataInicio && dataFim < dataInicio) {
    return { error: "Data de fim não pode ser antes da data de início." };
  }

  const { error } = await supabase
    .from("fisioterapia_lesoes_base")
    .update({
      descricao,
      tipo,
      data_inicio: dataInicio,
      data_fim: dataFim,
      observacoes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lesaoId);
  if (error) return { error: `Não foi possível salvar a lesão. Tente novamente. (${error.message})` };

  await sincronizarStatusAtletaBase(supabase, atletaId, dataInicio ?? "", dataFim);
  revalidarFichaBase(atletaId, categoria);
  return { success: "Lesão atualizada." };
}

export async function atualizarQueixaBase(
  _prevState: FisioterapiaFormStateBase,
  formData: FormData,
): Promise<FisioterapiaFormStateBase> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditarBase(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const atletaId = String(formData.get("atletaId") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const queixaId = String(formData.get("queixaId") ?? "");
  if (!atletaId || !queixaId) return { error: "Não foi possível identificar a queixa." };

  const descricao = String(formData.get("descricao") ?? "").trim();
  const tipo = parseTipo(formData.get("tipo"));
  const data = String(formData.get("data") ?? "").trim() || null;

  if (!descricao) return { error: "Descreva a queixa." };
  if (!tipo) return { error: "Escolha o tipo da queixa." };

  const { error } = await supabase.from("fisioterapia_queixas_base").update({ descricao, tipo, data }).eq("id", queixaId);
  if (error) return { error: `Não foi possível salvar a queixa. Tente novamente. (${error.message})` };

  revalidarFichaBase(atletaId, categoria);
  return { success: "Queixa atualizada." };
}

const STATUS_VALIDOS: AtletaBaseStatus[] = ["liberado", "suspenso", "departamento_medico", "dispensado"];

function parseStatusAtletaBase(raw: FormDataEntryValue | null): AtletaBaseStatus | null {
  const valor = String(raw ?? "");
  return (STATUS_VALIDOS as string[]).includes(valor) ? (valor as AtletaBaseStatus) : null;
}

export interface HistoricoStatusFormStateBase {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
}

/** Lança uma linha manual na linha do tempo de status da Base — espelha `lancarStatusManual`
 * (Profissional). Mesma permissão de editar a Fisioterapia da Base. */
export async function lancarStatusManualBase(
  _prevState: HistoricoStatusFormStateBase,
  formData: FormData,
): Promise<HistoricoStatusFormStateBase> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditarBase(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const atletaId = String(formData.get("atletaId") ?? "");
  const status = parseStatusAtletaBase(formData.get("status"));
  const data = String(formData.get("data") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (!atletaId) fieldErrors.atletaId = "Atleta inválido.";
  if (!status) fieldErrors.status = "Escolha o status.";
  if (!data) fieldErrors.data = "Data é obrigatória.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { error } = await registrarStatusAtletaBase(supabase, atletaId, status as AtletaBaseStatus, data);
  if (error) return { error };

  const { data: atletaAtual } = await supabase.from("atletas_base").select("categoria").eq("id", atletaId).maybeSingle();
  revalidarFichaBase(atletaId, (atletaAtual as { categoria: string } | null)?.categoria ?? "");
  return { success: "Status lançado." };
}

/** Corrige uma linha já lançada (status e/ou data) — espelha `editarLancamentoStatus`
 * (Profissional). */
export async function editarLancamentoStatusBase(
  _prevState: HistoricoStatusFormStateBase,
  formData: FormData,
): Promise<HistoricoStatusFormStateBase> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditarBase(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const historicoId = String(formData.get("historicoId") ?? "");
  const atletaId = String(formData.get("atletaId") ?? "");
  const status = parseStatusAtletaBase(formData.get("status"));
  const data = String(formData.get("data") ?? "");
  if (!historicoId || !atletaId) return { error: "Não foi possível identificar o lançamento." };

  const fieldErrors: Record<string, string> = {};
  if (!status) fieldErrors.status = "Escolha o status.";
  if (!data) fieldErrors.data = "Data é obrigatória.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { error } = await supabase.from("atletas_base_status_historico").update({ status, data }).eq("id", historicoId);
  if (error) return { error: `Não foi possível salvar. Tente novamente. (${error.message})` };

  await recomputarStatusAtualBase(supabase, atletaId);
  const { data: atletaAtual } = await supabase.from("atletas_base").select("categoria").eq("id", atletaId).maybeSingle();
  revalidarFichaBase(atletaId, (atletaAtual as { categoria: string } | null)?.categoria ?? "");
  return { success: "Lançamento atualizado." };
}

/** Linha do tempo de status completa de um atleta da Base — espelha `buscarHistoricoStatus`
 * (Profissional). */
export async function buscarHistoricoStatusBase(atletaId: string): Promise<AtletaBaseStatusHistoricoRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("atletas_base_status_historico")
    .select("*")
    .eq("atleta_id", atletaId)
    .order("data", { ascending: false });
  return (data ?? []) as AtletaBaseStatusHistoricoRow[];
}
