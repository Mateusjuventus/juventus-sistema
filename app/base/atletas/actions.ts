"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadFotoRedimensionada } from "@/lib/supabase/storage";
import { atletaAnotacaoSchema, atletaSchema, atletaContatoEmergenciaSchema } from "@/lib/validation/schemas";
// ÓRFÃO desde a unificação de Atletas (28/10/2026, ver docs/superpowers/specs/
// 2026-10-28-unificacao-atletas-design.md) — nenhuma tela mais importa deste arquivo (todas as
// rotas antigas que usavam `app/base/atletas/atleta-base-form.tsx` agora redirecionam pra
// `/atletas`, que usa `app/atletas/actions.ts`). `atletaBaseSchema` foi removido do colapso dos
// schemas; troquei pelo `atletaSchema` único só pra este arquivo morto continuar compilando até
// ser apagado (ver relatório de arquivos órfãos).
import { normalizeCPF } from "@/lib/validation/cpf";
import { nomeDaContaAtual } from "@/lib/auth/perfis";
import { isMaster } from "@/lib/auth/role";

/**
 * Espelha `app/atletas/actions.ts`, mas grava em `atletas_base` (tabela totalmente independente —
 * ver docs/superpowers/specs/2026-07-20-futebol-de-base-design.md) e inclui `categoria`. A
 * categoria pode ser trocada no próprio formulário (ex.: atleta subiu de categoria), então tanto
 * criar quanto editar redirecionam pra lista da categoria que veio do formulário, não
 * necessariamente a da URL de origem.
 */
export interface AtletaBaseFormState {
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
    dataInicioClube: String(formData.get("dataInicioClube") ?? ""),
    empresarioNome: String(formData.get("empresarioNome") ?? ""),
    empresarioTelefone: String(formData.get("empresarioTelefone") ?? ""),
    empresarioEmail: String(formData.get("empresarioEmail") ?? ""),
    tamanhoUniforme: String(formData.get("tamanhoUniforme") ?? "") || undefined,
    status: String(formData.get("status") ?? "liberado"),
    classificacao: String(formData.get("classificacao") ?? "") || undefined,
    possuiAlergiaMedicamento: formData.get("possuiAlergiaMedicamento") === "on",
    alergiaMedicamentoQual: String(formData.get("alergiaMedicamentoQual") ?? ""),
    // Campos pedidos em 18/08 (ver 0076_captacao_alojamento_base.sql): alojamento, responsáveis e
    // endereço estruturado.
    alojado: formData.get("alojado") === "on",
    valorAjudaCusto: String(formData.get("valorAjudaCusto") ?? "") || undefined,
    agencia: String(formData.get("agencia") ?? ""),
    maeNome: String(formData.get("maeNome") ?? ""),
    maeTelefone: String(formData.get("maeTelefone") ?? ""),
    emailMae: String(formData.get("emailMae") ?? ""),
    paiNome: String(formData.get("paiNome") ?? ""),
    paiTelefone: String(formData.get("paiTelefone") ?? ""),
    emailPai: String(formData.get("emailPai") ?? ""),
    escola: String(formData.get("escola") ?? ""),
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

  const { path, error } = await uploadFotoRedimensionada(supabase, file, "atletas-base", atletaId);

  if (error) return { error: "Não foi possível enviar a foto. O restante dos dados não foi salvo." };
  return { path };
}

export async function createAtletaBase(
  _prevState: AtletaBaseFormState,
  formData: FormData,
): Promise<AtletaBaseFormState> {
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
    cidade_natal: data.cidadeNatal || null,
    uf_natal: data.ufNatal ? data.ufNatal.toUpperCase() : null,
    endereco_atual: data.enderecoAtual || null,
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
    email_mae: data.emailMae || null,
    pai_nome: data.paiNome || null,
    pai_telefone: data.paiTelefone || null,
    email_pai: data.emailPai || null,
    escola: data.escola || null,
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
  });

  if (error) {
    return { error: friendlyDbError(error), values: raw };
  }

  revalidatePath("/base/atletas");
  redirect(`/base/atletas/${data.categoria}`);
}

export async function updateAtletaBase(
  _prevState: AtletaBaseFormState,
  formData: FormData,
): Promise<AtletaBaseFormState> {
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
    cidade_natal: data.cidadeNatal || null,
    uf_natal: data.ufNatal ? data.ufNatal.toUpperCase() : null,
    endereco_atual: data.enderecoAtual || null,
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
    email_mae: data.emailMae || null,
    pai_nome: data.paiNome || null,
    pai_telefone: data.paiTelefone || null,
    email_pai: data.emailPai || null,
    escola: data.escola || null,
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
  };
  if (fotoPath) updatePayload.foto_path = fotoPath;

  const { error } = await supabase.from("atletas").update(updatePayload).eq("id", id);

  if (error) {
    return { error: friendlyDbError(error), values: raw };
  }

  revalidatePath("/base/atletas");
  redirect(`/base/atletas/${data.categoria}`);
}

/** Antes de excluir, lê a categoria da linha pra revalidar a lista certa (a rota de excluir é
 * chamada a partir da lista de uma categoria, mas o `DeleteButton` só manda o `id`). */
export interface DeleteAtletaBaseState {
  error?: string;
}

export async function deleteAtletaBase(
  _prevState: DeleteAtletaBaseState,
  formData: FormData,
): Promise<DeleteAtletaBaseState> {
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

  revalidatePath("/base/atletas");
  if (categoria) revalidatePath(`/base/atletas/${categoria}`);
  // Chamado agora de dentro do próprio cadastro (`/base/atletas/[categoria]/[id]`, ver DeleteButton
  // no fim do formulário de edição — a listagem virou um card só de foto, sem botão de excluir) —
  // sem o redirect, a pessoa ficava numa tela de um atleta que acabou de apagar (mesmo ajuste já
  // feito em `deleteJogo`, ver app/jogos/actions.ts).
  if (categoria) redirect(`/base/atletas/${categoria}`);
  redirect("/base/atletas");
}

/** Liga/desliga a Ficha de Cadastro pública (`/cadastro-atleta-base`) — desde o ajuste de 19/08 essa
 * tela mora aqui (Atletas), não mais na Captação: o link cria/edita atletas do clube direto, sem
 * relação nenhuma com a Captação (ver docs/superpowers/specs/
 * 2026-08-19-captacao-atletas-separacao-design.md). Mesmo formato de toggle já usado no resto do
 * sistema. */
export async function alternarFichaCadastroAtletaBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const novoValor = String(formData.get("novoValor") ?? "") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase.from("configuracoes_cadastro_atleta_base").update({ cadastro_publico_ativo: novoValor }).eq("id", id);

  revalidatePath("/base/atletas");
  revalidatePath("/cadastro-atleta-base");
}

/** Ativa/desativa um atleta da Base (ver 0098_atleta_ativo.sql) — independente do status esportivo
 * e diferente de "dispensado" (que é ligado ao Relatório de Dispensa formal, com motivo/notas/data
 * próprios). Mesmo padrão de `alternarAtletaAtivo` (Profissional)/`alternarStaffAtivo`: em vez de
 * excluir, o cadastro fica marcado como inativo e some da listagem por padrão. `categoria` chega
 * como campo escondido do formulário (ver `AtletaAtivoButton`/`camposExtras`) só pra saber qual
 * listagem revalidar — não muda de departamento nem nada assim. */
export async function alternarAtletaBaseAtivo(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const novoValor = String(formData.get("novoValor") ?? "") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase.from("atletas").update({ ativo: novoValor }).eq("id", id);

  revalidatePath("/base/atletas");
  if (categoria) {
    revalidatePath(`/base/atletas/${categoria}`);
    revalidatePath(`/base/atletas/${categoria}/${id}/ver`);
  }
}

export interface ContatoEmergenciaFormState {
  error?: string;
  success?: boolean;
}

/** Espelha `adicionarContatoEmergencia` (app/atletas/actions.ts), mas grava em
 * `atleta_base_contatos_emergencia`. Revalida `/base/atletas/[categoria]/[id]` — por isso recebe a
 * categoria junto (campo escondido do formulário), mesmo princípio de `alternarAtletaBaseAtivo`. */
export async function adicionarContatoEmergenciaBase(
  _prevState: ContatoEmergenciaFormState,
  formData: FormData,
): Promise<ContatoEmergenciaFormState> {
  const atletaId = String(formData.get("atletaId") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
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

  if (categoria) revalidatePath(`/base/atletas/${categoria}/${atletaId}`);
  return { success: true };
}

export async function removerContatoEmergenciaBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const { data: contato } = await supabase
    .from("atleta_contatos_emergencia")
    .select("atleta_id")
    .eq("id", id)
    .single();

  await supabase.from("atleta_contatos_emergencia").delete().eq("id", id);

  // O DeleteButton só manda o id — busca a categoria do atleta (via o atleta_id acima) só pra
  // revalidar o caminho certo, mesmo princípio de `deleteAtletaBase`.
  if (contato) {
    const atletaId = (contato as { atleta_id: string }).atleta_id;
    const { data: atleta } = await supabase
      .from("atletas")
      .select("categoria")
      .eq("id", atletaId)
      .maybeSingle();
    const categoria = (atleta as { categoria?: string } | null)?.categoria;
    if (categoria) revalidatePath(`/base/atletas/${categoria}/${atletaId}`);
  }
}

export interface AnotacaoFormState {
  error?: string;
  success?: boolean;
}

/** Espelha `adicionarAnotacao` (app/atletas/actions.ts), gravando em `atleta_base_anotacoes`. Usada
 * pela aba "Anotações" do cadastro interno — não pela página do Treinador, que tem a ação própria
 * `adicionarAnotacaoTreinador` em `app/treinador/atletas/actions.ts` (checagem de categoria
 * diferente). Ver docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-anotacoes-design.md. */
export async function adicionarAnotacaoBase(
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

  const categoria = String(formData.get("categoria") ?? "");
  if (categoria) revalidatePath(`/base/atletas/${categoria}/${atletaId}/anotacoes`);
  return { success: true };
}

/** Espelha `removerAnotacao` — só quem é "master" apaga, checagem feita de novo no servidor. */
export async function removerAnotacaoBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  if (!(await isMaster(supabase))) return;

  const { data: anotacao } = await supabase
    .from("atleta_anotacoes")
    .select("atleta_id")
    .eq("id", id)
    .single();

  await supabase.from("atleta_anotacoes").delete().eq("id", id);

  if (anotacao) {
    const atletaId = (anotacao as { atleta_id: string }).atleta_id;
    const { data: atleta } = await supabase
      .from("atletas")
      .select("categoria")
      .eq("id", atletaId)
      .maybeSingle();
    const categoria = (atleta as { categoria?: string } | null)?.categoria;
    if (categoria) revalidatePath(`/base/atletas/${categoria}/${atletaId}/anotacoes`);
  }
}
