"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COMPETICAO_DOCUMENTOS_BUCKET, buildCompeticaoDocumentoPath } from "@/lib/supabase/storage";

/**
 * Server Actions do módulo de Competições (ver
 * docs/superpowers/specs/2026-08-10-competicoes-design.md). São muitas ações pequenas (fase,
 * grupo, equipe, vínculo de jogo, inscrição, prazo...) — todas seguem o mesmo formato: lê o
 * FormData, valida o mínimo, grava e revalida as telas da competição. Nenhuma ação aqui cria
 * jogo, cartão ou suspensão automática — jogos são só VINCULADOS e cartões/suspensões automáticas
 * são derivados das súmulas na leitura (`lib/futebol/competicao-disciplina.ts`).
 */

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function textoOuNull(formData: FormData, campo: string): string | null {
  const valor = texto(formData, campo);
  return valor === "" ? null : valor;
}

function inteiro(formData: FormData, campo: string, padrao: number): number {
  const valor = Number.parseInt(texto(formData, campo), 10);
  return Number.isFinite(valor) && valor >= 0 ? valor : padrao;
}

function revalidarCompeticao(competicaoId: string) {
  revalidatePath("/competicoes");
  revalidatePath(`/competicoes/${competicaoId}`, "layout");
  // O Mural da Home e a tela de Avisos derivam alertas das competições.
  revalidatePath("/profissional");
  revalidatePath("/avisos");
}

// ===== Temporada =====

export async function criarTemporada(formData: FormData): Promise<void> {
  const nome = texto(formData, "nome");
  if (!nome) return;
  const supabase = createClient();
  // upsert por nome: digitar uma temporada que já existe não duplica nem quebra.
  await supabase.from("temporadas").upsert({ nome }, { onConflict: "nome", ignoreDuplicates: true });
  revalidatePath("/competicoes");
}

// ===== Competição =====

export interface CompeticaoFormState {
  error?: string;
}

function parseCompeticao(formData: FormData) {
  return {
    temporada_id: texto(formData, "temporadaId"),
    nome: texto(formData, "nome"),
    federacao: textoOuNull(formData, "federacao"),
    categoria: texto(formData, "categoria") || "Profissional",
    data_inicio: textoOuNull(formData, "dataInicio"),
    data_termino: textoOuNull(formData, "dataTermino"),
    status: ["planejada", "em_andamento", "encerrada"].includes(texto(formData, "status"))
      ? texto(formData, "status")
      : "planejada",
    observacoes: textoOuNull(formData, "observacoes"),
    regra_amarelos_suspensao: inteiro(formData, "regraAmarelos", 3) || 3,
    regra_jogos_suspensao_amarelos: inteiro(formData, "regraJogosAmarelos", 1) || 1,
    regra_jogos_suspensao_vermelho: inteiro(formData, "regraJogosVermelho", 1) || 1,
  };
}

async function uploadRegulamentoIfPresent(
  supabase: ReturnType<typeof createClient>,
  formData: FormData,
): Promise<{ path?: string; error?: string }> {
  const file = formData.get("regulamento");
  if (!(file instanceof File) || file.size === 0) return {};
  const path = buildCompeticaoDocumentoPath(randomUUID(), file.name);
  const { error } = await supabase.storage.from(COMPETICAO_DOCUMENTOS_BUCKET).upload(path, file, {
    contentType: file.type || "application/pdf",
  });
  if (error) return { error: `Falha ao enviar o regulamento: ${error.message}` };
  return { path };
}

export async function criarCompeticao(
  _prevState: CompeticaoFormState,
  formData: FormData,
): Promise<CompeticaoFormState> {
  const valores = parseCompeticao(formData);
  if (!valores.nome) return { error: "Informe o nome da competição." };
  if (!valores.temporada_id) return { error: "Escolha a temporada." };

  const supabase = createClient();
  const upload = await uploadRegulamentoIfPresent(supabase, formData);
  if (upload.error) return { error: upload.error };

  const { data, error } = await supabase
    .from("competicoes")
    .insert({ ...valores, regulamento_path: upload.path ?? null })
    .select("id")
    .single();
  if (error || !data) return { error: `Não foi possível salvar: ${error?.message ?? "erro desconhecido"}` };

  revalidarCompeticao(data.id as string);
  redirect(`/competicoes/${data.id}`);
}

export async function atualizarCompeticao(
  competicaoId: string,
  _prevState: CompeticaoFormState,
  formData: FormData,
): Promise<CompeticaoFormState> {
  const valores = parseCompeticao(formData);
  if (!valores.nome) return { error: "Informe o nome da competição." };
  if (!valores.temporada_id) return { error: "Escolha a temporada." };

  const supabase = createClient();
  const upload = await uploadRegulamentoIfPresent(supabase, formData);
  if (upload.error) return { error: upload.error };

  const { error } = await supabase
    .from("competicoes")
    .update(upload.path ? { ...valores, regulamento_path: upload.path } : valores)
    .eq("id", competicaoId);
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidarCompeticao(competicaoId);
  redirect(`/competicoes/${competicaoId}`);
}

export async function excluirCompeticao(formData: FormData): Promise<void> {
  const competicaoId = texto(formData, "id");
  if (!competicaoId) return;
  const supabase = createClient();
  await supabase.from("competicoes").delete().eq("id", competicaoId);
  revalidatePath("/competicoes");
  revalidatePath("/profissional");
  revalidatePath("/avisos");
  redirect("/competicoes");
}

// ===== Fases e Grupos =====

export async function criarFase(competicaoId: string, formData: FormData): Promise<void> {
  const nome = texto(formData, "nome");
  if (!nome) return;
  const supabase = createClient();
  const { count } = await supabase
    .from("competicao_fases")
    .select("*", { count: "exact", head: true })
    .eq("competicao_id", competicaoId);
  await supabase.from("competicao_fases").insert({ competicao_id: competicaoId, nome, ordem: count ?? 0 });
  revalidarCompeticao(competicaoId);
}

export async function atualizarStatusFase(competicaoId: string, formData: FormData): Promise<void> {
  const faseId = texto(formData, "faseId");
  const status = texto(formData, "status");
  if (!faseId || !["aguardando", "em_andamento", "encerrada"].includes(status)) return;
  const supabase = createClient();
  await supabase.from("competicao_fases").update({ status }).eq("id", faseId);
  revalidarCompeticao(competicaoId);
}

export async function excluirFase(competicaoId: string, formData: FormData): Promise<void> {
  const faseId = texto(formData, "id");
  if (!faseId) return;
  const supabase = createClient();
  await supabase.from("competicao_fases").delete().eq("id", faseId);
  revalidarCompeticao(competicaoId);
}

export async function criarGrupo(competicaoId: string, formData: FormData): Promise<void> {
  const faseId = texto(formData, "faseId");
  const nome = texto(formData, "nome");
  if (!faseId || !nome) return;
  const supabase = createClient();
  const { count } = await supabase
    .from("competicao_grupos")
    .select("*", { count: "exact", head: true })
    .eq("fase_id", faseId);
  await supabase.from("competicao_grupos").insert({ fase_id: faseId, nome, ordem: count ?? 0 });
  revalidarCompeticao(competicaoId);
}

export async function excluirGrupo(competicaoId: string, formData: FormData): Promise<void> {
  const grupoId = texto(formData, "id");
  if (!grupoId) return;
  const supabase = createClient();
  await supabase.from("competicao_grupos").delete().eq("id", grupoId);
  revalidarCompeticao(competicaoId);
}

/** Equipe fixa (nome digitado) OU vaga projetada ("1º do Grupo X") — o formulário manda um dos
 * dois; a constraint do banco garante que pelo menos um veio. */
export async function adicionarEquipe(competicaoId: string, formData: FormData): Promise<void> {
  const grupoId = texto(formData, "grupoId");
  if (!grupoId) return;
  const nome = textoOuNull(formData, "nome");
  const origemGrupoId = textoOuNull(formData, "origemGrupoId");
  const origemPosicao = Number.parseInt(texto(formData, "origemPosicao"), 10);
  const vagaValida = origemGrupoId !== null && Number.isFinite(origemPosicao) && origemPosicao >= 1;
  if (!nome && !vagaValida) return;

  const supabase = createClient();
  const { count } = await supabase
    .from("competicao_grupo_equipes")
    .select("*", { count: "exact", head: true })
    .eq("grupo_id", grupoId);
  await supabase.from("competicao_grupo_equipes").insert(
    nome
      ? { grupo_id: grupoId, nome, ordem: count ?? 0 }
      : { grupo_id: grupoId, origem_grupo_id: origemGrupoId, origem_posicao: origemPosicao, ordem: count ?? 0 },
  );
  revalidarCompeticao(competicaoId);
}

export async function excluirEquipe(competicaoId: string, formData: FormData): Promise<void> {
  const equipeId = texto(formData, "id");
  if (!equipeId) return;
  const supabase = createClient();
  await supabase.from("competicao_grupo_equipes").delete().eq("id", equipeId);
  revalidarCompeticao(competicaoId);
}

// ===== Jogos (vínculo — nunca criação) =====

export async function vincularJogo(competicaoId: string, formData: FormData): Promise<void> {
  const jogoId = texto(formData, "jogoId");
  if (!jogoId) return;
  const supabase = createClient();
  await supabase.from("competicao_jogos").insert({
    competicao_id: competicaoId,
    jogo_id: jogoId,
    fase_id: textoOuNull(formData, "faseId"),
    grupo_id: textoOuNull(formData, "grupoId"),
  });
  revalidarCompeticao(competicaoId);
}

export async function atualizarVinculoJogo(competicaoId: string, formData: FormData): Promise<void> {
  const vinculoId = texto(formData, "vinculoId");
  if (!vinculoId) return;
  const supabase = createClient();
  await supabase
    .from("competicao_jogos")
    .update({ fase_id: textoOuNull(formData, "faseId"), grupo_id: textoOuNull(formData, "grupoId") })
    .eq("id", vinculoId);
  revalidarCompeticao(competicaoId);
}

export async function desvincularJogo(competicaoId: string, formData: FormData): Promise<void> {
  const vinculoId = texto(formData, "id");
  if (!vinculoId) return;
  const supabase = createClient();
  await supabase.from("competicao_jogos").delete().eq("id", vinculoId);
  revalidarCompeticao(competicaoId);
}

// ===== Resultados externos (classificação) =====

export async function lancarResultadoExterno(competicaoId: string, formData: FormData): Promise<void> {
  const grupoId = texto(formData, "grupoId");
  const equipeCasa = texto(formData, "equipeCasa");
  const equipeFora = texto(formData, "equipeFora");
  const golsCasa = Number.parseInt(texto(formData, "golsCasa"), 10);
  const golsFora = Number.parseInt(texto(formData, "golsFora"), 10);
  if (!grupoId || !equipeCasa || !equipeFora) return;
  if (!Number.isFinite(golsCasa) || !Number.isFinite(golsFora) || golsCasa < 0 || golsFora < 0) return;

  const supabase = createClient();
  await supabase.from("competicao_grupo_resultados").insert({
    grupo_id: grupoId,
    equipe_casa: equipeCasa,
    equipe_fora: equipeFora,
    gols_casa: golsCasa,
    gols_fora: golsFora,
    data_jogo: textoOuNull(formData, "dataJogo"),
  });
  revalidarCompeticao(competicaoId);
}

export async function excluirResultadoExterno(competicaoId: string, formData: FormData): Promise<void> {
  const resultadoId = texto(formData, "id");
  if (!resultadoId) return;
  const supabase = createClient();
  await supabase.from("competicao_grupo_resultados").delete().eq("id", resultadoId);
  revalidarCompeticao(competicaoId);
}

// ===== Inscrições =====

export async function inscreverAtleta(competicaoId: string, formData: FormData): Promise<void> {
  const atletaId = texto(formData, "atletaId");
  if (!atletaId) return;
  const lista = texto(formData, "lista");
  const supabase = createClient();
  await supabase.from("competicao_inscricoes").upsert(
    {
      competicao_id: competicaoId,
      atleta_id: atletaId,
      lista: lista === "A" || lista === "B" ? lista : null,
      data_inscricao: texto(formData, "dataInscricao") || undefined,
    },
    { onConflict: "competicao_id,atleta_id" },
  );
  revalidarCompeticao(competicaoId);
}

export async function removerInscricao(competicaoId: string, formData: FormData): Promise<void> {
  const inscricaoId = texto(formData, "id");
  if (!inscricaoId) return;
  const supabase = createClient();
  await supabase.from("competicao_inscricoes").delete().eq("id", inscricaoId);
  revalidarCompeticao(competicaoId);
}

// ===== Suspensão manual (única suspensão cadastrável — as automáticas são derivadas) =====

export async function criarSuspensaoManual(competicaoId: string, formData: FormData): Promise<void> {
  const atletaId = texto(formData, "atletaId");
  const motivo = texto(formData, "motivo");
  if (!atletaId || !motivo) return;
  const origem = texto(formData, "origem");
  const supabase = createClient();
  await supabase.from("competicao_suspensoes_manuais").insert({
    competicao_id: competicaoId,
    atleta_id: atletaId,
    origem: ["cartao", "decisao_disciplinar", "outro"].includes(origem) ? origem : "decisao_disciplinar",
    motivo,
    jogos_suspensao: Math.max(1, inteiro(formData, "jogosSuspensao", 1)),
    data_decisao: texto(formData, "dataDecisao") || undefined,
    observacoes: textoOuNull(formData, "observacoes"),
  });
  revalidarCompeticao(competicaoId);
}

export async function excluirSuspensaoManual(competicaoId: string, formData: FormData): Promise<void> {
  const suspensaoId = texto(formData, "id");
  if (!suspensaoId) return;
  const supabase = createClient();
  await supabase.from("competicao_suspensoes_manuais").delete().eq("id", suspensaoId);
  revalidarCompeticao(competicaoId);
}

// ===== Prazos =====

export async function criarPrazo(competicaoId: string, formData: FormData): Promise<void> {
  const titulo = texto(formData, "titulo");
  const dataFim = texto(formData, "dataFim");
  if (!titulo || !dataFim) return;
  const supabase = createClient();
  await supabase.from("competicao_prazos").insert({
    competicao_id: competicaoId,
    titulo,
    data_inicio: textoOuNull(formData, "dataInicio"),
    data_fim: dataFim,
  });
  revalidarCompeticao(competicaoId);
}

export async function alternarPrazoConcluido(competicaoId: string, formData: FormData): Promise<void> {
  const prazoId = texto(formData, "id");
  if (!prazoId) return;
  const supabase = createClient();
  const { data } = await supabase.from("competicao_prazos").select("concluido").eq("id", prazoId).maybeSingle();
  if (!data) return;
  await supabase.from("competicao_prazos").update({ concluido: !data.concluido }).eq("id", prazoId);
  revalidarCompeticao(competicaoId);
}

export async function excluirPrazo(competicaoId: string, formData: FormData): Promise<void> {
  const prazoId = texto(formData, "id");
  if (!prazoId) return;
  const supabase = createClient();
  await supabase.from("competicao_prazos").delete().eq("id", prazoId);
  revalidarCompeticao(competicaoId);
}

// ===== Documentos =====

export async function enviarDocumento(competicaoId: string, formData: FormData): Promise<void> {
  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) return;
  const nome = texto(formData, "nome") || file.name;
  const documentoId = randomUUID();
  const path = buildCompeticaoDocumentoPath(documentoId, file.name);

  const supabase = createClient();
  const { error } = await supabase.storage.from(COMPETICAO_DOCUMENTOS_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (error) return;

  await supabase.from("competicao_documentos").insert({
    id: documentoId,
    competicao_id: competicaoId,
    nome,
    arquivo_path: path,
  });
  revalidarCompeticao(competicaoId);
}

export async function excluirDocumento(competicaoId: string, formData: FormData): Promise<void> {
  const documentoId = texto(formData, "id");
  if (!documentoId) return;
  const supabase = createClient();
  const { data } = await supabase
    .from("competicao_documentos")
    .select("arquivo_path")
    .eq("id", documentoId)
    .maybeSingle();
  await supabase.from("competicao_documentos").delete().eq("id", documentoId);
  if (data?.arquivo_path) {
    await supabase.storage.from(COMPETICAO_DOCUMENTOS_BUCKET).remove([data.arquivo_path as string]);
  }
  revalidarCompeticao(competicaoId);
}
