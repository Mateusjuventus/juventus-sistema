"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { captacaoBaseSchema } from "@/lib/validation/schemas";
import { hojeBrasilia } from "@/lib/data-brasil";
import { payloadMudancaStatusCaptacao, type CaptacaoStatusDecidido } from "@/lib/futebol/captacao";
import { buildPhotoPath, ENTITY_PHOTOS_BUCKET } from "@/lib/supabase/storage";
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
    dataTermino: String(formData.get("dataTermino") ?? ""),
    dataNascimento: String(formData.get("dataNascimento") ?? ""),
    posicao: String(formData.get("posicao") ?? ""),
    categoria: String(formData.get("categoria") ?? ""),
    indicacao: String(formData.get("indicacao") ?? ""),
    desejaAlojamento: formData.get("desejaAlojamento") === "on",
    clubeAnterior: String(formData.get("clubeAnterior") ?? ""),
    status: String(formData.get("status") ?? "avaliacao"),
    observacoes: String(formData.get("observacoes") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    maeNome: String(formData.get("maeNome") ?? ""),
    maeTelefone: String(formData.get("maeTelefone") ?? ""),
    paiNome: String(formData.get("paiNome") ?? ""),
    paiTelefone: String(formData.get("paiTelefone") ?? ""),
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
    data_termino: data.dataTermino || null,
    data_nascimento: data.dataNascimento || null,
    posicao: data.posicao || null,
    categoria: data.categoria || null,
    indicacao: data.indicacao || null,
    deseja_alojamento: data.desejaAlojamento,
    clube_anterior: data.clubeAnterior || null,
    status: data.status,
    observacoes: data.observacoes || null,
    telefone: data.telefone || null,
    mae_nome: data.maeNome || null,
    mae_telefone: data.maeTelefone || null,
    pai_nome: data.paiNome || null,
    pai_telefone: data.paiTelefone || null,
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

/** Mesmo padrão de `uploadFotoIfPresent` em app/base/atletas/actions.ts: sobe a foto (se veio um
 * arquivo no campo "foto") pro bucket privado compartilhado `entity-photos`, sempre com o mesmo
 * nome por candidato (upsert), pra um novo upload substituir o anterior em vez de acumular
 * arquivos órfãos. Usado tanto pelo cadastro interno (`criarCaptacao`/`atualizarCaptacao`) quanto,
 * futuramente, por qualquer outro fluxo que precise trocar a foto do candidato. */
async function uploadFotoIfPresent(
  supabase: ReturnType<typeof createClient>,
  formData: FormData,
  captacaoId: string,
): Promise<{ path?: string | null; error?: string }> {
  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) return {};

  const path = buildPhotoPath("captacao-base", captacaoId, file.name);
  const { error } = await supabase.storage.from(ENTITY_PHOTOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) return { error: "Não foi possível enviar a foto. O restante dos dados não foi salvo." };
  return { path };
}

export async function criarCaptacao(_prevState: CaptacaoFormState, formData: FormData): Promise<CaptacaoFormState> {
  const { raw, result } = parseForm(formData);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const id = randomUUID();
  const { error: uploadError, path: fotoPath } = await uploadFotoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const { data, error } = await supabase
    .from("captacao_base")
    .insert({ ...dadosParaSalvar(result.data), id, foto_path: fotoPath ?? null, origem: "interno" })
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
  const { error: uploadError, path: fotoPath } = await uploadFotoIfPresent(supabase, formData, captacaoId);
  if (uploadError) return { error: uploadError, values: raw };

  const updatePayload: Record<string, unknown> = { ...dadosParaSalvar(result.data) };
  if (fotoPath) updatePayload.foto_path = fotoPath;

  const { error } = await supabase.from("captacao_base").update(updatePayload).eq("id", captacaoId);
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

/**
 * Troca de status embutida na lista/tela do candidato (Em avaliação/Aprovado/Dispensado/Não
 * compareceu) — mesma assinatura de `updateSolicitacaoStatus` (app/solicitacoes/actions.ts), por
 * isso dá pra reaproveitar o mesmo padrão de `<select>` que já manda o form ao trocar de opção (ver
 * `CaptacaoStatusSelect`, mesmo espírito do `SolicitacaoStatusSelect`). Pedido de 19/08: "lá em
 * status consigo definir se ele foi aprovado, dispensado ou não compareceu. e ai vai agrupando
 * conforme for trocando de status igual vc faz hoje na solicitações."
 *
 * "Inscrição enviada" nunca passa por aqui — só sai da fila pela Aprovação (`aprovarInscricaoCaptacao`,
 * que também pede a Data de Início), senão viraria "Em avaliação" sem data nenhuma.
 *
 * Ao marcar um resultado final (Aprovado/Dispensado/Não compareceu), a Data de término é carimbada
 * com a data de hoje automaticamente quando ainda não tiver uma — dá pra corrigir depois pelo
 * formulário completo do candidato. Voltar pra "Em avaliação" limpa a Data de término, já que a
 * avaliação não terminou de verdade.
 */
export async function mudarStatusCaptacao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as CaptacaoStatus;
  const statusValidos: CaptacaoStatus[] = ["avaliacao", "aprovado", "dispensado", "nao_compareceu"];
  if (!id || !statusValidos.includes(status)) return;

  const supabase = createClient();
  const { data: atual } = await supabase
    .from("captacao_base")
    .select("status, data_termino")
    .eq("id", id)
    .single();
  if (!atual || atual.status === "inscricao") return;

  const payload = payloadMudancaStatusCaptacao(
    status as CaptacaoStatusDecidido,
    atual.data_termino,
    hojeBrasilia(),
  );

  await supabase.from("captacao_base").update(payload).eq("id", id);
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

/** Estado da action de configuração das assinaturas do Parecer Final — mesmo formato de
 * `PermissaoActionState` (components/permissao-checkboxes-form.tsx), mas não reaproveita aquele
 * tipo porque este formulário não é de checkboxes. */
export interface AssinaturasParecerState {
  success?: string;
  error?: string;
}

/**
 * Salva a lista de assinaturas (nome + cargo) que aparecem em todo Parecer Final de Avaliação
 * gerado — configuração fixa, uma tela só (ver `AssinaturasConfigForm`), reaproveitada em todo PDF.
 * `assinaturaNome`/`assinaturaCargo` chegam como listas paralelas (um `<input>` de cada por linha,
 * mesma ordem em que a tela renderizou) — o índice de uma corresponde ao da outra.
 */
export async function atualizarAssinaturasParecer(
  _prevState: AssinaturasParecerState,
  formData: FormData,
): Promise<AssinaturasParecerState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Configuração inválida." };

  const nomes = formData.getAll("assinaturaNome").map(String);
  const cargos = formData.getAll("assinaturaCargo").map(String);
  const assinaturas = nomes.map((nome, i) => ({ nome: nome.trim(), cargo: (cargos[i] ?? "").trim() }));

  const supabase = createClient();
  const { error } = await supabase
    .from("configuracoes_parecer_captacao_base")
    .update({ assinaturas })
    .eq("id", id);
  if (error) return { error: `Não foi possível salvar. Tente novamente. (${error.message})` };

  revalidatePath("/base/captacao");
  return { success: "Assinaturas salvas." };
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
