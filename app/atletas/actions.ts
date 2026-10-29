"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadFotoRedimensionada } from "@/lib/supabase/storage";
import { atletaAnotacaoSchema, atletaContatoEmergenciaSchema, atletaSchema } from "@/lib/validation/schemas";
import { normalizeCPF } from "@/lib/validation/cpf";
import { hojeBrasilia } from "@/lib/data-brasil";
import { registrarStatusAtleta } from "@/lib/futebol/status-historico";
import { nomeDaContaAtual } from "@/lib/auth/perfis";
import { isMaster } from "@/lib/auth/role";
import type { AtletaStatus } from "@/lib/supabase/types";

/**
 * Cadastro de Atleta — ações únicas pro Futebol Profissional e pro Futebol de Base desde a
 * unificação de 28/10/2026 (ver docs/superpowers/specs/2026-10-28-unificacao-atletas-design.md).
 * Até então existiam `app/atletas/actions.ts` (Profissional) e `app/base/atletas/actions.ts`
 * (Base) quase idênticos, gravando na mesma tabela `atletas` desde a migração 0150 — a separação
 * de verdade estava só no roteamento (categoria no path) e nos campos extras da Base. Como a
 * listagem/cadastro agora vivem todos sob `/atletas` (a categoria vira query string, não path —
 * ver `app/atletas/page.tsx`), redirecionar/revalidar não precisa mais de nenhuma lógica
 * condicional por categoria: toda ação volta pra `/atletas?categoria=<categoria do atleta>` ou
 * `/atletas/<id>/...`, direto.
 */
export interface AtletaFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

function parseForm(formData: FormData) {
  const raw = {
    categoria: String(formData.get("categoria") ?? ""),
    nomeCompleto: String(formData.get("nomeCompleto") ?? ""),
    apelido: String(formData.get("apelido") ?? ""),
    rg: String(formData.get("rg") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    dataNascimento: String(formData.get("dataNascimento") ?? ""),
    posicao: String(formData.get("posicao") ?? ""),
    numeroCamisa: String(formData.get("numeroCamisa") ?? "") || undefined,
    numeroCbf: String(formData.get("numeroCbf") ?? "") || undefined,
    peDominante: String(formData.get("peDominante") ?? "") || undefined,
    telefone: String(formData.get("telefone") ?? ""),
    email: String(formData.get("email") ?? ""),
    cidadeNatal: String(formData.get("cidadeNatal") ?? ""),
    ufNatal: String(formData.get("ufNatal") ?? ""),
    enderecoAtual: String(formData.get("enderecoAtual") ?? ""),
    cep: String(formData.get("cep") ?? ""),
    logradouro: String(formData.get("logradouro") ?? ""),
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    uf: String(formData.get("uf") ?? ""),
    origemCep: String(formData.get("origem_cep") ?? ""),
    origemLogradouro: String(formData.get("origem_logradouro") ?? ""),
    origemNumero: String(formData.get("origem_numero") ?? ""),
    origemComplemento: String(formData.get("origem_complemento") ?? ""),
    origemBairro: String(formData.get("origem_bairro") ?? ""),
    origemCidade: String(formData.get("origem_cidade") ?? ""),
    origemUf: String(formData.get("origem_uf") ?? ""),
    dataInicioClube: String(formData.get("dataInicioClube") ?? ""),
    empresarioNome: String(formData.get("empresarioNome") ?? ""),
    empresarioTelefone: String(formData.get("empresarioTelefone") ?? ""),
    empresarioEmail: String(formData.get("empresarioEmail") ?? ""),
    tamanhoUniforme: String(formData.get("tamanhoUniforme") ?? "") || undefined,
    status: String(formData.get("status") ?? "liberado"),
    classificacao: String(formData.get("classificacao") ?? "") || undefined,
    possuiAlergiaMedicamento: formData.get("possuiAlergiaMedicamento") === "on",
    alergiaMedicamentoQual: String(formData.get("alergiaMedicamentoQual") ?? ""),
    // Campos exibidos no formulário só pra categoria de Base (ver `AtletaForm`), mas existem no
    // schema/banco pra qualquer categoria — ver comentário em `atletaSchema`.
    emailPai: String(formData.get("emailPai") ?? ""),
    emailMae: String(formData.get("emailMae") ?? ""),
    alojado: formData.get("alojado") === "on",
    valorAjudaCusto: String(formData.get("valorAjudaCusto") ?? "") || undefined,
    agencia: String(formData.get("agencia") ?? ""),
    maeNome: String(formData.get("maeNome") ?? ""),
    maeTelefone: String(formData.get("maeTelefone") ?? ""),
    paiNome: String(formData.get("paiNome") ?? ""),
    paiTelefone: String(formData.get("paiTelefone") ?? ""),
    escola: String(formData.get("escola") ?? ""),
  };

  const result = atletaSchema.safeParse(raw);
  return {
    raw: {
      ...raw,
      possuiAlergiaMedicamento: raw.possuiAlergiaMedicamento ? "on" : "",
      alojado: raw.alojado ? "on" : "",
    },
    result,
  };
}

function friendlyDbError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("cpf")) return "Já existe um atleta cadastrado com este CPF.";
    if (error.message.includes("rg")) return "Já existe um atleta cadastrado com este RG.";
    return "Já existe um registro com esses dados.";
  }
  return "Não foi possível salvar. Tente novamente.";
}

async function uploadFotoIfPresent(
  supabase: ReturnType<typeof createClient>,
  formData: FormData,
  atletaId: string,
): Promise<{ path?: string | null; error?: string }> {
  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) return {};

  const { path, error } = await uploadFotoRedimensionada(supabase, file, "atletas", atletaId);

  if (error) return { error: "Não foi possível enviar a foto. O restante dos dados não foi salvo." };
  return { path };
}

export async function createAtleta(
  _prevState: AtletaFormState,
  formData: FormData,
): Promise<AtletaFormState> {
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const id = randomUUID();
  const data = result.data;

  const { error: uploadError, path: fotoPath } = await uploadFotoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const { error } = await supabase.from("atletas").insert({
    id,
    categoria: data.categoria,
    nome_completo: data.nomeCompleto,
    apelido: data.apelido || null,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    posicao: data.posicao,
    numero_camisa: data.numeroCamisa ?? null,
    numero_cbf: data.numeroCbf ?? null,
    pe_dominante: data.peDominante ?? null,
    telefone: data.telefone || null,
    email: data.email || null,
    email_pai: data.emailPai || null,
    email_mae: data.emailMae || null,
    cidade_natal: data.cidadeNatal || null,
    uf_natal: data.ufNatal ? data.ufNatal.toUpperCase() : null,
    endereco_atual: data.enderecoAtual || null,
    cep: data.cep || null,
    logradouro: data.logradouro || null,
    numero: data.numero || null,
    complemento: data.complemento || null,
    bairro: data.bairro || null,
    cidade: data.cidade || null,
    uf: data.uf ? data.uf.toUpperCase() : null,
    origem_cep: data.origemCep || null,
    origem_logradouro: data.origemLogradouro || null,
    origem_numero: data.origemNumero || null,
    origem_complemento: data.origemComplemento || null,
    origem_bairro: data.origemBairro || null,
    origem_cidade: data.origemCidade || null,
    origem_uf: data.origemUf ? data.origemUf.toUpperCase() : null,
    data_inicio_clube: data.dataInicioClube || null,
    empresario_nome: data.empresarioNome || null,
    empresario_telefone: data.empresarioTelefone || null,
    empresario_email: data.empresarioEmail || null,
    tamanho_uniforme: data.tamanhoUniforme || null,
    foto_path: fotoPath ?? null,
    status: data.status,
    classificacao: data.classificacao ?? null,
    possui_alergia_medicamento: data.possuiAlergiaMedicamento,
    alergia_medicamento_qual: data.possuiAlergiaMedicamento ? data.alergiaMedicamentoQual || null : null,
    alojado: data.alojado,
    valor_ajuda_custo: data.valorAjudaCusto ?? null,
    agencia: data.agencia || null,
    mae_nome: data.maeNome || null,
    mae_telefone: data.maeTelefone || null,
    pai_nome: data.paiNome || null,
    pai_telefone: data.paiTelefone || null,
    escola: data.escola || null,
  });

  if (error) {
    return { error: friendlyDbError(error), values: raw };
  }

  // Semeia a primeira linha da linha do tempo de status (ver docs/superpowers/specs/
  // 2026-10-01-departamento-medico-historico-status-design.md, seção 3) — sem isso, um atleta
  // cadastrado direto com status "Depto. Médico"/"Transição"/"Dispensado" apareceria sem nenhum
  // lançamento no histórico até a próxima mudança.
  await registrarStatusAtleta(supabase, id, data.status, hojeBrasilia());

  revalidatePath("/atletas");
  redirect(`/atletas?categoria=${data.categoria}`);
}

export async function updateAtleta(
  _prevState: AtletaFormState,
  formData: FormData,
): Promise<AtletaFormState> {
  const id = String(formData.get("id") ?? "");
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  // Status muda por fora do `updatePayload` abaixo (ver depois do update) — precisa do valor DE
  // ANTES pra saber se precisa lançar uma linha nova no histórico (ver docs/superpowers/specs/
  // 2026-10-01-departamento-medico-historico-status-design.md, seção 3): editar qualquer outro
  // campo do atleta não deve criar um lançamento repetido se o status não mudou.
  const { data: atletaAntes } = await supabase.from("atletas").select("status").eq("id", id).maybeSingle();
  const statusAntes = (atletaAntes as { status: AtletaStatus } | null)?.status;

  const { error: uploadError, path: fotoPath } = await uploadFotoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const updatePayload: Record<string, unknown> = {
    categoria: data.categoria,
    nome_completo: data.nomeCompleto,
    apelido: data.apelido || null,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    posicao: data.posicao,
    numero_camisa: data.numeroCamisa ?? null,
    numero_cbf: data.numeroCbf ?? null,
    pe_dominante: data.peDominante ?? null,
    telefone: data.telefone || null,
    email: data.email || null,
    email_pai: data.emailPai || null,
    email_mae: data.emailMae || null,
    cidade_natal: data.cidadeNatal || null,
    uf_natal: data.ufNatal ? data.ufNatal.toUpperCase() : null,
    endereco_atual: data.enderecoAtual || null,
    cep: data.cep || null,
    logradouro: data.logradouro || null,
    numero: data.numero || null,
    complemento: data.complemento || null,
    bairro: data.bairro || null,
    cidade: data.cidade || null,
    uf: data.uf ? data.uf.toUpperCase() : null,
    origem_cep: data.origemCep || null,
    origem_logradouro: data.origemLogradouro || null,
    origem_numero: data.origemNumero || null,
    origem_complemento: data.origemComplemento || null,
    origem_bairro: data.origemBairro || null,
    origem_cidade: data.origemCidade || null,
    origem_uf: data.origemUf ? data.origemUf.toUpperCase() : null,
    data_inicio_clube: data.dataInicioClube || null,
    empresario_nome: data.empresarioNome || null,
    empresario_telefone: data.empresarioTelefone || null,
    empresario_email: data.empresarioEmail || null,
    tamanho_uniforme: data.tamanhoUniforme || null,
    status: data.status,
    classificacao: data.classificacao ?? null,
    possui_alergia_medicamento: data.possuiAlergiaMedicamento,
    alergia_medicamento_qual: data.possuiAlergiaMedicamento ? data.alergiaMedicamentoQual || null : null,
    alojado: data.alojado,
    valor_ajuda_custo: data.valorAjudaCusto ?? null,
    agencia: data.agencia || null,
    mae_nome: data.maeNome || null,
    mae_telefone: data.maeTelefone || null,
    pai_nome: data.paiNome || null,
    pai_telefone: data.paiTelefone || null,
    escola: data.escola || null,
  };
  if (fotoPath) updatePayload.foto_path = fotoPath;

  const { error } = await supabase.from("atletas").update(updatePayload).eq("id", id);

  if (error) {
    return { error: friendlyDbError(error), values: raw };
  }

  // Lança uma linha no histórico só quando o status muda de verdade — editar qualquer outro campo
  // do cadastro não deve criar um lançamento repetido (ver comentário acima de `statusAntes`).
  if (statusAntes !== data.status) {
    await registrarStatusAtleta(supabase, id, data.status, hojeBrasilia());
  }

  revalidatePath("/atletas");
  revalidatePath(`/atletas/${id}`);
  redirect(`/atletas?categoria=${data.categoria}`);
}

export interface DeleteAtletaState {
  error?: string;
}

export async function deleteAtleta(
  _prevState: DeleteAtletaState,
  formData: FormData,
): Promise<DeleteAtletaState> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();

  const { data } = await supabase.from("atletas").select("categoria").eq("id", id).maybeSingle();
  const categoria = (data as { categoria?: string } | null)?.categoria;

  const { error } = await supabase.from("atletas").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        error: "Não é possível excluir: este atleta ainda está vinculado a outro registro do sistema.",
      };
    }
    return { error: "Não foi possível excluir. Tente novamente." };
  }

  revalidatePath("/atletas");
  // Chamado agora de dentro do próprio cadastro (`/atletas/[id]`, ver `DeleteButton` no fim do
  // formulário de edição — a listagem virou uma grade de cards só de foto, sem botão de excluir) —
  // sem o redirect, a pessoa ficava numa tela de um atleta que acabou de apagar.
  redirect(categoria ? `/atletas?categoria=${categoria}` : "/atletas");
}

/** Ativa/desativa um atleta (ver 0098_atleta_ativo.sql) — independente do status esportivo
 * (Liberado/Depto. Médico/Transição/Dispensado). Mesmo padrão de `alternarStaffAtivo`
 * (app/staff-operacional/actions.ts): em vez de excluir, o cadastro fica marcado como inativo e
 * some da listagem por padrão (checkbox "Mostrar inativos"). Botão fica na página "Ver atleta"
 * (`AtletaPerfilHeader`/`AtletaAtivoButton`). */
export async function alternarAtletaAtivo(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const novoValor = String(formData.get("novoValor") ?? "") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase.from("atletas").update({ ativo: novoValor }).eq("id", id);

  revalidatePath("/atletas");
  revalidatePath(`/atletas/${id}/ver`);
}

/** Liga/desliga a Ficha de Cadastro pública (`/cadastro-atleta-base`) — recurso só da Base (desde
 * o ajuste de 19/08, essa tela cria/edita atletas do clube direto pelo link público, sem relação
 * com a Captação — ver docs/superpowers/specs/2026-08-19-captacao-atletas-separacao-design.md).
 * Sem uso esperado fora da Base, mas a função em si não depende de categoria nenhuma. */
export async function alternarFichaCadastroAtletaBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const novoValor = String(formData.get("novoValor") ?? "") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase
    .from("configuracoes_cadastro_atleta_base")
    .update({ cadastro_publico_ativo: novoValor })
    .eq("id", id);

  revalidatePath("/atletas");
  revalidatePath("/cadastro-atleta-base");
}

export interface ContatoEmergenciaFormState {
  error?: string;
  success?: boolean;
}

/** Adiciona um contato de emergência (Nome/Parentesco/Contato) — lista, pode haver mais de um por
 * atleta (ver docs/superpowers/specs/2026-10-16-atleta-dados-pessoais-design.md). Mesmo padrão de
 * `adicionarDocumento` (app/atletas/[id]/documentacao/actions.ts), sem upload de arquivo. */
export async function adicionarContatoEmergencia(
  _prevState: ContatoEmergenciaFormState,
  formData: FormData,
): Promise<ContatoEmergenciaFormState> {
  const atletaId = String(formData.get("atletaId") ?? "");
  if (!atletaId) return { error: "Atleta não identificado. Recarregue a página e tente novamente." };

  const result = atletaContatoEmergenciaSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    parentesco: String(formData.get("parentesco") ?? ""),
    contato: String(formData.get("contato") ?? ""),
  });
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("atleta_contatos_emergencia").insert({
    atleta_id: atletaId,
    nome: result.data.nome,
    parentesco: result.data.parentesco || null,
    contato: result.data.contato || null,
  });

  if (error) return { error: "Não foi possível salvar o contato. Tente novamente." };

  revalidatePath(`/atletas/${atletaId}`);
  return { success: true };
}

export async function removerContatoEmergencia(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const { data: contato } = await supabase
    .from("atleta_contatos_emergencia")
    .select("atleta_id")
    .eq("id", id)
    .single();

  await supabase.from("atleta_contatos_emergencia").delete().eq("id", id);

  if (contato) revalidatePath(`/atletas/${(contato as { atleta_id: string }).atleta_id}`);
}

export interface AnotacaoFormState {
  error?: string;
  success?: boolean;
}

/** Adiciona uma anotação ao histórico do atleta (aba "Anotações") — texto livre, nunca editado
 * depois de criado. Autor nunca vem do formulário: sempre o perfil logado. Também escrita pelo
 * Treinador (ação própria, `adicionarAnotacaoTreinador` em `app/treinador/atletas/actions.ts`,
 * checagem de categoria diferente). Ver docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-
 * anotacoes-design.md. */
export async function adicionarAnotacao(
  _prevState: AnotacaoFormState,
  formData: FormData,
): Promise<AnotacaoFormState> {
  const atletaId = String(formData.get("atletaId") ?? "");
  if (!atletaId) return { error: "Atleta não identificado. Recarregue a página e tente novamente." };

  const result = atletaAnotacaoSchema.safeParse({ texto: String(formData.get("texto") ?? "") });
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Dados inválidos." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nomeAtual = await nomeDaContaAtual(supabase);

  const { error } = await supabase.from("atleta_anotacoes").insert({
    atleta_id: atletaId,
    texto: result.data.texto,
    criado_por_perfil_id: user?.id ?? null,
    criado_por_nome: nomeAtual,
  });

  if (error) return { error: "Não foi possível salvar a anotação. Tente novamente." };

  revalidatePath(`/atletas/${atletaId}/anotacoes`);
  return { success: true };
}

/** Apaga uma anotação — só quem é "master" (ver docs/superpowers/specs/2026-10-27-ficha-atleta-
 * dossie-anotacoes-design.md, "Exclusão"). A tela já esconde o botão pra quem não é master; esta
 * checagem no servidor é a que de fato impede a exclusão, não só a tela. */
export async function removerAnotacao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  if (!(await isMaster(supabase))) return;

  const { data: anotacao } = await supabase.from("atleta_anotacoes").select("atleta_id").eq("id", id).single();

  await supabase.from("atleta_anotacoes").delete().eq("id", id);

  if (anotacao) revalidatePath(`/atletas/${(anotacao as { atleta_id: string }).atleta_id}/anotacoes`);
}
