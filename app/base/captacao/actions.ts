"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { captacaoBaseSchema } from "@/lib/validation/schemas";
import type { CaptacaoBaseRow, CaptacaoStatus } from "@/lib/supabase/types";

/**
 * Server Actions da Captação/Avaliação (ver docs/superpowers/specs/2026-08-19-captacao-base-design.md
 * e 0076_captacao_alojamento_base.sql). O CRUD é comum; a peça especial é `aprovarCaptacao`, que
 * cria o cadastro oficial em `atletas_base` — decisão da conversa: aprovar não é só trocar o status,
 * é o que faz o candidato virar atleta de verdade.
 */

export interface CaptacaoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

function parseForm(formData: FormData) {
  const raw = {
    nomeCompleto: String(formData.get("nomeCompleto") ?? ""),
    dataInicio: String(formData.get("dataInicio") ?? ""),
    dataNascimento: String(formData.get("dataNascimento") ?? ""),
    posicao: String(formData.get("posicao") ?? ""),
    categoria: String(formData.get("categoria") ?? ""),
    indicacao: String(formData.get("indicacao") ?? ""),
    desejaAlojamento: formData.get("desejaAlojamento") === "on",
    status: String(formData.get("status") ?? "avaliacao"),
    observacoes: String(formData.get("observacoes") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    maeNome: String(formData.get("maeNome") ?? ""),
    maeTelefone: String(formData.get("maeTelefone") ?? ""),
    paiNome: String(formData.get("paiNome") ?? ""),
    paiTelefone: String(formData.get("paiTelefone") ?? ""),
    empresarioNome: String(formData.get("empresarioNome") ?? ""),
    empresarioTelefone: String(formData.get("empresarioTelefone") ?? ""),
    agencia: String(formData.get("agencia") ?? ""),
    valorAjudaCusto: String(formData.get("valorAjudaCusto") ?? "") || undefined,
    escola: String(formData.get("escola") ?? ""),
    cep: String(formData.get("cep") ?? ""),
    logradouro: String(formData.get("logradouro") ?? ""),
    // O input de número do endereço é renderizado por `EnderecoFields` (components/endereco-
    // fields.tsx), que usa name="numero" — igual em todo cadastro que reaproveita esse componente.
    // Na tabela `captacao_base` isso vira a coluna `numero_endereco` (o nome "numero" já é o Nº
    // sequencial do candidato, gerado pelo banco).
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    uf: String(formData.get("uf") ?? ""),
  };

  const result = captacaoBaseSchema.safeParse(raw);
  return {
    raw: { ...raw, desejaAlojamento: raw.desejaAlojamento ? "on" : "" },
    result,
  };
}

function dadosParaSalvar(data: ReturnType<typeof captacaoBaseSchema.parse>) {
  return {
    nome_completo: data.nomeCompleto,
    data_inicio: data.dataInicio || null,
    data_nascimento: data.dataNascimento || null,
    posicao: data.posicao || null,
    categoria: data.categoria || null,
    indicacao: data.indicacao || null,
    deseja_alojamento: data.desejaAlojamento,
    status: data.status,
    observacoes: data.observacoes || null,
    telefone: data.telefone || null,
    mae_nome: data.maeNome || null,
    mae_telefone: data.maeTelefone || null,
    pai_nome: data.paiNome || null,
    pai_telefone: data.paiTelefone || null,
    empresario_nome: data.empresarioNome || null,
    empresario_telefone: data.empresarioTelefone || null,
    agencia: data.agencia || null,
    valor_ajuda_custo: data.valorAjudaCusto ?? null,
    escola: data.escola || null,
    cep: data.cep || null,
    logradouro: data.logradouro || null,
    numero_endereco: data.numero || null,
    complemento: data.complemento || null,
    bairro: data.bairro || null,
    cidade: data.cidade || null,
    uf: data.uf ? data.uf.toUpperCase() : null,
  };
}

export async function criarCaptacao(_prevState: CaptacaoFormState, formData: FormData): Promise<CaptacaoFormState> {
  const { raw, result } = parseForm(formData);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("captacao_base")
    .insert({ ...dadosParaSalvar(result.data), origem: "interno" })
    .select("id")
    .single();
  if (error || !data) return { error: `Não foi possível salvar: ${error?.message ?? "erro desconhecido"}` };

  revalidatePath("/base/captacao");
  redirect(`/base/captacao/${data.id as string}`);
}

export async function atualizarCaptacao(
  captacaoId: string,
  _prevState: CaptacaoFormState,
  formData: FormData,
): Promise<CaptacaoFormState> {
  const { raw, result } = parseForm(formData);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const { error } = await supabase.from("captacao_base").update(dadosParaSalvar(result.data)).eq("id", captacaoId);
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/base/captacao");
  revalidatePath(`/base/captacao/${captacaoId}`);
  redirect(`/base/captacao/${captacaoId}`);
}

export async function excluirCaptacao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("captacao_base").delete().eq("id", id);
  revalidatePath("/base/captacao");
  redirect("/base/captacao");
}

/** Muda pra "Dispensado" ou "Não compareceu" — troca simples de status, sem criar nada. Não serve
 * pra aprovar (ver `aprovarCaptacao`, que faz mais coisa que isso). */
export async function mudarStatusCaptacao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as CaptacaoStatus;
  if (!id || (status !== "dispensado" && status !== "nao_compareceu" && status !== "avaliacao")) return;

  const supabase = createClient();
  await supabase.from("captacao_base").update({ status }).eq("id", id);
  revalidatePath("/base/captacao");
  revalidatePath(`/base/captacao/${id}`);
}

/**
 * Aprova o candidato: cria o cadastro oficial em `atletas_base` com os dados que a Captação já tem,
 * e marca `atleta_gerado_id` pra não aprovar duas vezes sem querer (o botão de Aprovar some quando
 * já existe). Exige categoria e posição preenchidas — sem elas o Atleta não teria como nascer com um
 * cadastro esportivo mínimo.
 */
export interface AprovarCaptacaoState {
  error?: string;
}

export async function aprovarCaptacao(
  _prevState: AprovarCaptacaoState,
  formData: FormData,
): Promise<AprovarCaptacaoState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Candidato inválido." };

  const supabase = createClient();
  const { data: captacaoData, error: buscaError } = await supabase
    .from("captacao_base")
    .select("*")
    .eq("id", id)
    .single();
  if (buscaError || !captacaoData) {
    revalidatePath(`/base/captacao/${id}`);
    return { error: "Candidato não encontrado." };
  }

  const c = captacaoData as CaptacaoBaseRow;
  if (c.atleta_gerado_id) {
    revalidatePath(`/base/captacao/${id}`);
    return { error: "Este candidato já foi aprovado." };
  }
  if (!c.categoria) return { error: "Preencha a categoria antes de aprovar." };
  if (!c.posicao) return { error: "Preencha a posição antes de aprovar." };
  if (!c.data_nascimento) return { error: "Preencha a data de nascimento antes de aprovar." };

  const atletaId = randomUUID();
  const { error: insertError } = await supabase.from("atletas_base").insert({
    id: atletaId,
    categoria: c.categoria,
    nome_completo: c.nome_completo,
    data_nascimento: c.data_nascimento,
    posicao: c.posicao,
    status: "liberado",
    telefone: c.telefone,
    data_inicio_clube: c.data_inicio,
    empresario_nome: c.empresario_nome,
    empresario_telefone: c.empresario_telefone,
    mae_nome: c.mae_nome,
    mae_telefone: c.mae_telefone,
    pai_nome: c.pai_nome,
    pai_telefone: c.pai_telefone,
    escola: c.escola,
    agencia: c.agencia,
    valor_ajuda_custo: c.valor_ajuda_custo,
    alojado: c.deseja_alojamento,
    cep: c.cep,
    logradouro: c.logradouro,
    numero: c.numero_endereco,
    complemento: c.complemento,
    bairro: c.bairro,
    cidade: c.cidade,
    uf: c.uf,
  });
  if (insertError) {
    return { error: `Não foi possível criar o cadastro de Atleta: ${insertError.message}` };
  }

  const { error: updateError } = await supabase
    .from("captacao_base")
    .update({ status: "aprovado", atleta_gerado_id: atletaId })
    .eq("id", id);
  if (updateError) {
    return { error: `Atleta criado, mas não foi possível atualizar a Captação: ${updateError.message}` };
  }

  revalidatePath("/base/captacao");
  revalidatePath(`/base/captacao/${id}`);
  revalidatePath(`/base/atletas/${c.categoria}`);
  redirect(`/base/atletas/${c.categoria}/${atletaId}`);
}

/** Liga/desliga o link público de Captação (`/cadastro-atleta-base`) — mesmo formato do toggle de
 * Staff/Comissão/Vagas já usado no resto do sistema. */
export async function alternarCadastroPublicoAtletaBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const novoValor = String(formData.get("novoValor") ?? "") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase.from("configuracoes_cadastro_atleta_base").update({ cadastro_publico_ativo: novoValor }).eq("id", id);

  revalidatePath("/base/captacao");
  revalidatePath("/cadastro-atleta-base");
}
