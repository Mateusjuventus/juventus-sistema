"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getFisioterapiaPodeEditar } from "@/lib/auth/role";
import { statusFisioterapiaAtleta } from "@/lib/futebol/fisioterapia";
import type { FisioterapiaQueixaTipo } from "@/lib/supabase/types";

export interface FisioterapiaFormState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
}

/** Recalcula `atletas.status` a partir das lesões que sobraram sem `data_fim` pra esse atleta — ver
 * docs/superpowers/specs/2026-09-30-fisioterapia-design.md, seção 5. Roda dentro da mesma Server
 * Action que salva/encerra uma lesão, nunca como trigger de banco (mesmo padrão do resto do
 * sistema: regra de negócio no código da aplicação). */
async function sincronizarStatusAtleta(
  supabase: ReturnType<typeof createClient>,
  atletaId: string,
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

  const status = statusFisioterapiaAtleta((count ?? 0) > 0);
  await supabase.from("atletas").update({ status }).eq("id", atletaId);
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
  const dataInicio = String(formData.get("dataInicio") ?? "");
  const dataFim = String(formData.get("dataFim") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  const fieldErrors: Record<string, string> = {};
  if (!atletaId) fieldErrors.atletaId = "Atleta inválido.";
  if (!descricao) fieldErrors.descricao = "Descreva a lesão.";
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
    data_inicio: dataInicio,
    data_fim: dataFim,
    observacoes,
    created_by: user?.id ?? null,
  });
  if (error) return { error: `Não foi possível salvar a lesão. Tente novamente. (${error.message})` };

  await sincronizarStatusAtleta(supabase, atletaId);
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

  await sincronizarStatusAtleta(supabase, atletaId);
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
  const tipoRaw = String(formData.get("tipo") ?? "");
  const tipo: FisioterapiaQueixaTipo | null = tipoRaw === "muscular" || tipoRaw === "articular" ? tipoRaw : null;
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
