"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { captacaoBaseSchema } from "@/lib/validation/schemas";
import type { CaptacaoStatus } from "@/lib/supabase/types";

/**
 * Server Actions da Captação/Avaliação — banco TOTALMENTE separado de `atletas_base` desde o
 * ajuste de 19/08 (ver docs/superpowers/specs/2026-08-19-captacao-atletas-separacao-design.md e
 * 0077_captacao_atletas_separacao.sql). Aprovar aqui é só trocar o status; não cria cadastro de
 * Atleta nenhum — isso é feito à parte, pela "Ficha de Cadastro" (app/cadastro-atleta-base) ou pelo
 * cadastro manual de Atleta.
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

/** Troca simples de status — "Aprovado" aqui é só um status administrativo (não cria mais nada em
 * `atletas_base`, ver o comentário no topo do arquivo). Não serve pra tirar alguém da fila de
 * "Aprovações" (status "inscricao"): isso exige uma Data de Início, ver `aprovarInscricaoCaptacao`. */
export async function mudarStatusCaptacao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as CaptacaoStatus;
  const statusValidos: CaptacaoStatus[] = ["avaliacao", "aprovado", "dispensado", "nao_compareceu"];
  if (!id || !statusValidos.includes(status)) return;

  const supabase = createClient();
  await supabase.from("captacao_base").update({ status }).eq("id", id);
  revalidatePath("/base/captacao");
  revalidatePath("/base/captacao/aprovacoes");
  revalidatePath(`/base/captacao/${id}`);
}

/**
 * Aprova uma INSCRIÇÃO (status "inscricao", vinda do link público) pra entrar em avaliação de
 * verdade: exige a Data de Início (é o que faz sentido pedir nesse momento — antes disso o
 * candidato só se inscreveu, ainda não começou nada). Usada só na aba "Aprovações"
 * (`/base/captacao/aprovacoes`).
 */
export interface AprovarInscricaoState {
  error?: string;
}

export async function aprovarInscricaoCaptacao(
  _prevState: AprovarInscricaoState,
  formData: FormData,
): Promise<AprovarInscricaoState> {
  const id = String(formData.get("id") ?? "");
  const dataInicio = String(formData.get("dataInicio") ?? "");
  if (!id) return { error: "Candidato inválido." };
  if (!dataInicio) return { error: "Informe a data de início da avaliação." };

  const supabase = createClient();
  const { error } = await supabase
    .from("captacao_base")
    .update({ status: "avaliacao", data_inicio: dataInicio })
    .eq("id", id)
    .eq("status", "inscricao");
  if (error) return { error: `Não foi possível aprovar: ${error.message}` };

  revalidatePath("/base/captacao");
  revalidatePath("/base/captacao/aprovacoes");
  revalidatePath(`/base/captacao/${id}`);
  return {};
}

/** Liga/desliga o link público de INSCRIÇÃO da Captação (`/inscricao-captacao-base`) — totalmente
 * separado do toggle da Ficha de Cadastro de Atletas (ver `alternarFichaCadastroAtletaBase` em
 * app/base/atletas/actions.ts). Mesmo formato de toggle já usado no resto do sistema. */
export async function alternarInscricaoCaptacao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const novoValor = String(formData.get("novoValor") ?? "") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase
    .from("configuracoes_inscricao_captacao_base")
    .update({ cadastro_publico_ativo: novoValor })
    .eq("id", id);

  revalidatePath("/base/captacao");
  revalidatePath("/inscricao-captacao-base");
}
