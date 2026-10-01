"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getFisioterapiaPodeEditar } from "@/lib/auth/role";
import { statusFisioterapiaAtleta } from "@/lib/futebol/fisioterapia";
import { hojeBrasilia } from "@/lib/data-brasil";
import { recomputarStatusAtual, registrarStatusAtleta } from "@/lib/futebol/status-historico";
import type { AtletaStatus, AtletaStatusHistoricoRow, FisioterapiaTipo } from "@/lib/supabase/types";

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

export interface FisioterapiaFormState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
}

/** Recalcula `atletas.status` a partir das lesões que sobraram sem `data_fim` pra esse atleta — ver
 * docs/superpowers/specs/2026-09-30-fisioterapia-design.md, seção 5, e docs/superpowers/specs/
 * 2026-10-01-departamento-medico-historico-status-design.md, seção 3. Roda dentro da mesma Server
 * Action que salva/encerra uma lesão, nunca como trigger de banco (mesmo padrão do resto do
 * sistema: regra de negócio no código da aplicação). Só lança uma linha nova no histórico quando o
 * status realmente muda (editar uma lesão sem mudar o resultado — ex.: duas lesões abertas ao
 * mesmo tempo, fechar uma delas — não deve criar uma linha repetida). `dataInicio`/`dataFim` são as
 * datas da lesão que disparou a chamada, usadas como data do lançamento quando o status muda. */
async function sincronizarStatusAtleta(
  supabase: ReturnType<typeof createClient>,
  atletaId: string,
  dataInicio: string,
  dataFim: string | null,
): Promise<void> {
  // `.not("data_inicio", "is", null)`: uma lesão do histórico importado (sem data, ver migração
  // 0115) também tem `data_fim` nula, mas não é uma lesão ativa agora — sem esse filtro, encerrar
  // a última lesão de verdade de um atleta com histórico importado não voltaria o status pra
  // "Apto".
  const { count } = await supabase
    .from("fisioterapia_lesoes")
    .select("*", { count: "exact", head: true })
    .eq("atleta_id", atletaId)
    .is("data_fim", null)
    .not("data_inicio", "is", null);

  const novoStatus: AtletaStatus = statusFisioterapiaAtleta((count ?? 0) > 0);

  const { data: atletaAtual } = await supabase.from("atletas").select("status").eq("id", atletaId).maybeSingle();
  if ((atletaAtual as { status: AtletaStatus } | null)?.status === novoStatus) return;

  const dataEvento = novoStatus === "departamento_medico" ? dataInicio : (dataFim ?? hojeBrasilia());
  await registrarStatusAtleta(supabase, atletaId, novoStatus, dataEvento);
}

function revalidarFicha(atletaId: string): void {
  revalidatePath(`/departamento-medico/fisioterapia/${atletaId}`);
  revalidatePath("/departamento-medico/fisioterapia");
  revalidatePath("/departamento-medico/fisioterapia/relatorio");
  revalidatePath("/atletas");
}

/** Registra uma lesão nova — pode já vir com `dataFim` preenchida (lesão que já foi e voltou, só
 * pra manter o histórico) ou em aberto (lesão "em andamento", que já sincroniza o status do atleta
 * pra "Depto. Médico" — ver `sincronizarStatusAtleta`). Só quem tem `fisioterapia_pode_editar`
 * (ou é master) pode chamar — checado no servidor, nunca só escondendo o formulário no client. */
export async function registrarLesao(
  _prevState: FisioterapiaFormState,
  formData: FormData,
): Promise<FisioterapiaFormState> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditar(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const atletaId = String(formData.get("atletaId") ?? "");
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

  const { error } = await supabase.from("fisioterapia_lesoes").insert({
    atleta_id: atletaId,
    descricao,
    tipo,
    data_inicio: dataInicio,
    data_fim: dataFim,
    observacoes,
    created_by: user?.id ?? null,
  });
  if (error) return { error: `Não foi possível salvar a lesão. Tente novamente. (${error.message})` };

  await sincronizarStatusAtleta(supabase, atletaId, dataInicio, dataFim);
  revalidarFicha(atletaId);
  return { success: "Lesão registrada." };
}

/** Encerra uma lesão em andamento, preenchendo `data_fim` — a única edição permitida numa lesão já
 * lançada (ver "Fora de escopo" da spec: sem exclusão nesta rodada). Recalcula o status do atleta
 * em seguida: só volta pra "Apto" se não sobrar nenhuma outra lesão ativa. */
export async function encerrarLesao(
  _prevState: FisioterapiaFormState,
  formData: FormData,
): Promise<FisioterapiaFormState> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditar(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const lesaoId = String(formData.get("lesaoId") ?? "");
  const atletaId = String(formData.get("atletaId") ?? "");
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
    .from("fisioterapia_lesoes")
    .update({ data_fim: dataFim, updated_at: new Date().toISOString() })
    .eq("id", lesaoId);
  if (error) return { error: `Não foi possível encerrar a lesão. Tente novamente. (${error.message})` };

  await sincronizarStatusAtleta(supabase, atletaId, dataInicio, dataFim);
  revalidarFicha(atletaId);
  return { success: "Lesão encerrada." };
}

export async function registrarQueixa(
  _prevState: FisioterapiaFormState,
  formData: FormData,
): Promise<FisioterapiaFormState> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditar(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const atletaId = String(formData.get("atletaId") ?? "");
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

  const { error } = await supabase.from("fisioterapia_queixas").insert({
    atleta_id: atletaId,
    tipo,
    data,
    descricao,
    created_by: user?.id ?? null,
  });
  if (error) return { error: `Não foi possível salvar a queixa. Tente novamente. (${error.message})` };

  revalidarFicha(atletaId);
  return { success: "Queixa registrada." };
}

export async function registrarAtendimento(
  _prevState: FisioterapiaFormState,
  formData: FormData,
): Promise<FisioterapiaFormState> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditar(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const atletaId = String(formData.get("atletaId") ?? "");
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

  const { error } = await supabase.from("fisioterapia_atendimentos").insert({
    atleta_id: atletaId,
    data,
    descricao,
    lesao_id: lesaoId,
    created_by: user?.id ?? null,
  });
  if (error) return { error: `Não foi possível salvar o atendimento. Tente novamente. (${error.message})` };

  revalidarFicha(atletaId);
  return { success: "Atendimento registrado." };
}

/** Corrige qualquer campo de uma lesão já lançada — descrição, tipo, datas ou observações. Antes só
 * dava pra corrigir o tipo (pedido original do Mateus ao trazer a classificação do relatório em
 * papel); ele pediu depois pra abrir pra qualquer campo, editando ao clicar na própria lesão em vez
 * de um controle à parte. Recalcula o status do atleta em seguida, já que corrigir as datas pode
 * mudar se a lesão conta como em andamento. */
export async function atualizarLesao(
  _prevState: FisioterapiaFormState,
  formData: FormData,
): Promise<FisioterapiaFormState> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditar(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const atletaId = String(formData.get("atletaId") ?? "");
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
    .from("fisioterapia_lesoes")
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

  await sincronizarStatusAtleta(supabase, atletaId, dataInicio ?? "", dataFim);
  revalidarFicha(atletaId);
  return { success: "Lesão atualizada." };
}

/** Mesma ideia de `atualizarLesao`, pras Queixas (sem `data_inicio`/`data_fim`/`observacoes` — a
 * queixa só tem descrição, tipo e data; e sem `updated_at`, coluna que não existe nessa tabela). */
export async function atualizarQueixa(
  _prevState: FisioterapiaFormState,
  formData: FormData,
): Promise<FisioterapiaFormState> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditar(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const atletaId = String(formData.get("atletaId") ?? "");
  const queixaId = String(formData.get("queixaId") ?? "");
  if (!atletaId || !queixaId) return { error: "Não foi possível identificar a queixa." };

  const descricao = String(formData.get("descricao") ?? "").trim();
  const tipo = parseTipo(formData.get("tipo"));
  const data = String(formData.get("data") ?? "").trim() || null;

  if (!descricao) return { error: "Descreva a queixa." };
  if (!tipo) return { error: "Escolha o tipo da queixa." };

  const { error } = await supabase.from("fisioterapia_queixas").update({ descricao, tipo, data }).eq("id", queixaId);
  if (error) return { error: `Não foi possível salvar a queixa. Tente novamente. (${error.message})` };

  revalidarFicha(atletaId);
  return { success: "Queixa atualizada." };
}

const STATUS_VALIDOS: AtletaStatus[] = ["liberado", "departamento_medico", "transicao"];

function parseStatusAtleta(raw: FormDataEntryValue | null): AtletaStatus | null {
  const valor = String(raw ?? "");
  return (STATUS_VALIDOS as string[]).includes(valor) ? (valor as AtletaStatus) : null;
}

export interface HistoricoStatusFormState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
}

/** Lança uma linha manual na linha do tempo de status (ex.: marcar "Transição" sem precisar de uma
 * lesão associada) — ver docs/superpowers/specs/2026-10-01-departamento-medico-historico-status-
 * design.md, seção 4. Mesma permissão de editar a Fisioterapia; não existe uma permissão própria
 * pro histórico de status. */
export async function lancarStatusManual(
  _prevState: HistoricoStatusFormState,
  formData: FormData,
): Promise<HistoricoStatusFormState> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditar(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const atletaId = String(formData.get("atletaId") ?? "");
  const status = parseStatusAtleta(formData.get("status"));
  const data = String(formData.get("data") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (!atletaId) fieldErrors.atletaId = "Atleta inválido.";
  if (!status) fieldErrors.status = "Escolha o status.";
  if (!data) fieldErrors.data = "Data é obrigatória.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { error } = await registrarStatusAtleta(supabase, atletaId, status as AtletaStatus, data);
  if (error) return { error };

  revalidarFicha(atletaId);
  return { success: "Status lançado." };
}

/** Corrige uma linha já lançada (status e/ou data) — recalcula `atletas.status` em seguida, só
 * mudando-o se a linha editada for (ou deixar de ser) a mais recente depois da correção. */
export async function editarLancamentoStatus(
  _prevState: HistoricoStatusFormState,
  formData: FormData,
): Promise<HistoricoStatusFormState> {
  const supabase = createClient();
  if (!(await getFisioterapiaPodeEditar(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const historicoId = String(formData.get("historicoId") ?? "");
  const atletaId = String(formData.get("atletaId") ?? "");
  const status = parseStatusAtleta(formData.get("status"));
  const data = String(formData.get("data") ?? "");
  if (!historicoId || !atletaId) return { error: "Não foi possível identificar o lançamento." };

  const fieldErrors: Record<string, string> = {};
  if (!status) fieldErrors.status = "Escolha o status.";
  if (!data) fieldErrors.data = "Data é obrigatória.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { error } = await supabase.from("atletas_status_historico").update({ status, data }).eq("id", historicoId);
  if (error) return { error: `Não foi possível salvar. Tente novamente. (${error.message})` };

  await recomputarStatusAtual(supabase, atletaId);
  revalidarFicha(atletaId);
  return { success: "Lançamento atualizado." };
}

/** Linha do tempo de status completa de um atleta — usada pelo modal "Histórico de Status", que
 * busca sob demanda ao abrir (não vem pré-carregada na listagem). */
export async function buscarHistoricoStatus(atletaId: string): Promise<AtletaStatusHistoricoRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("atletas_status_historico")
    .select("*")
    .eq("atleta_id", atletaId)
    .order("data", { ascending: false });
  return (data ?? []) as AtletaStatusHistoricoRow[];
}
