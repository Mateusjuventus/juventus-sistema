"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadFotoRedimensionada } from "@/lib/supabase/storage";
import { comissaoTecnicaUnificadaSchema } from "@/lib/validation/schemas";
import { normalizeCPF } from "@/lib/validation/cpf";
import { normalizeTelefone } from "@/lib/validation/telefone";

/** Comissão Técnica já unificada (Profissional + Base, "profissional" tratado como mais uma
 * categoria — ver docs/superpowers/specs/2026-10-28-unificacao-comissao-tecnica-design.md). Estas
 * actions substituem as separadas que existiam antes (`app/base/comissao-tecnica/actions.ts`
 * virou redirect). */
export interface ComissaoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
  categoriasSelecionadas?: string[];
}

function parseForm(formData: FormData) {
  const categorias = formData.getAll("categorias").map(String);
  const raw = {
    nomeCompleto: String(formData.get("nomeCompleto") ?? ""),
    apelido: String(formData.get("apelido") ?? ""),
    rg: String(formData.get("rg") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    dataNascimento: String(formData.get("dataNascimento") ?? ""),
    funcao: String(formData.get("funcao") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    email: String(formData.get("email") ?? ""),
    tipoContrato: String(formData.get("tipoContrato") ?? ""),
    valorSalario: String(formData.get("valorSalario") ?? "") || undefined,
    dataInicio: String(formData.get("dataInicio") ?? ""),
    // Endereço estruturado único, Setor e Dados de empresa/pagamento — pedido de 14/11/2026 (ver
    // docs/superpowers/specs/2026-11-04-atletas-desativacao-transicao-pagamento-design.md, item 8,
    // e o comentário de `comissaoTecnicaSchema` em lib/validation/schemas.ts).
    cep: String(formData.get("cep") ?? ""),
    logradouro: String(formData.get("logradouro") ?? ""),
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    uf: String(formData.get("uf") ?? ""),
    setor: String(formData.get("setor") ?? "") || undefined,
    chavePixTipo: String(formData.get("chavePixTipo") ?? ""),
    chavePix: String(formData.get("chavePix") ?? ""),
    banco: String(formData.get("banco") ?? ""),
    agencia: String(formData.get("agencia") ?? ""),
    conta: String(formData.get("conta") ?? ""),
    empresaNome: String(formData.get("empresaNome") ?? ""),
    empresaCnpj: String(formData.get("empresaCnpj") ?? ""),
    empresaChavePixTipo: String(formData.get("empresaChavePixTipo") ?? ""),
    empresaChavePix: String(formData.get("empresaChavePix") ?? ""),
  };

  const result = comissaoTecnicaUnificadaSchema.safeParse({ ...raw, categorias });
  return { raw, categorias, result };
}

function friendlyDbError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("cpf")) return "Já existe uma pessoa cadastrada com este CPF.";
    if (error.message.includes("rg")) return "Já existe uma pessoa cadastrada com este RG.";
    return "Já existe um registro com esses dados.";
  }
  return "Não foi possível salvar. Tente novamente.";
}

async function uploadFotoIfPresent(
  supabase: ReturnType<typeof createClient>,
  formData: FormData,
  id: string,
): Promise<{ path?: string | null; error?: string }> {
  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) return {};

  const { path, error } = await uploadFotoRedimensionada(supabase, file, "comissao", id);

  if (error) return { error: "Não foi possível enviar a foto. O restante dos dados não foi salvo." };
  return { path };
}

export async function createComissao(
  _prevState: ComissaoFormState,
  formData: FormData,
): Promise<ComissaoFormState> {
  const { raw, categorias, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw, categoriasSelecionadas: categorias };
  }

  const supabase = createClient();
  const id = randomUUID();
  const data = result.data;

  const { error: uploadError, path: fotoPath } = await uploadFotoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw, categoriasSelecionadas: categorias };

  const { error } = await supabase.from("comissao_tecnica").insert({
    id,
    categorias: data.categorias,
    nome_completo: data.nomeCompleto,
    apelido: data.apelido || null,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    funcao: data.funcao,
    telefone: data.telefone ? normalizeTelefone(data.telefone) : null,
    email: data.email || null,
    foto_path: fotoPath ?? null,
    tipo_contrato: data.tipoContrato || null,
    valor_salario: data.valorSalario ?? null,
    data_inicio: data.dataInicio || null,
    cep: data.cep || null,
    logradouro: data.logradouro || null,
    numero: data.numero || null,
    complemento: data.complemento || null,
    bairro: data.bairro || null,
    cidade: data.cidade || null,
    uf: data.uf || null,
    setor: data.setor || null,
    chave_pix_tipo: data.tipoContrato === "clt" ? data.chavePixTipo || null : null,
    chave_pix: data.tipoContrato === "clt" ? data.chavePix || null : null,
    banco: data.tipoContrato === "clt" ? data.banco || null : null,
    agencia: data.tipoContrato === "clt" ? data.agencia || null : null,
    conta: data.tipoContrato === "clt" ? data.conta || null : null,
    empresa_nome: data.tipoContrato === "pj" ? data.empresaNome || null : null,
    empresa_cnpj: data.tipoContrato === "pj" ? data.empresaCnpj || null : null,
    empresa_chave_pix_tipo: data.tipoContrato === "pj" ? data.empresaChavePixTipo || null : null,
    empresa_chave_pix: data.tipoContrato === "pj" ? data.empresaChavePix || null : null,
  });

  if (error) return { error: friendlyDbError(error), values: raw, categoriasSelecionadas: categorias };

  revalidatePath("/comissao-tecnica");
  redirect("/comissao-tecnica");
}

export async function updateComissao(
  _prevState: ComissaoFormState,
  formData: FormData,
): Promise<ComissaoFormState> {
  const id = String(formData.get("id") ?? "");
  const { raw, categorias, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw, categoriasSelecionadas: categorias };
  }

  const supabase = createClient();
  const data = result.data;

  const { error: uploadError, path: fotoPath } = await uploadFotoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw, categoriasSelecionadas: categorias };

  const updatePayload: Record<string, unknown> = {
    categorias: data.categorias,
    nome_completo: data.nomeCompleto,
    apelido: data.apelido || null,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    funcao: data.funcao,
    telefone: data.telefone ? normalizeTelefone(data.telefone) : null,
    email: data.email || null,
    tipo_contrato: data.tipoContrato || null,
    data_inicio: data.dataInicio || null,
    cep: data.cep || null,
    logradouro: data.logradouro || null,
    numero: data.numero || null,
    complemento: data.complemento || null,
    bairro: data.bairro || null,
    cidade: data.cidade || null,
    uf: data.uf || null,
    setor: data.setor || null,
    chave_pix_tipo: data.tipoContrato === "clt" ? data.chavePixTipo || null : null,
    chave_pix: data.tipoContrato === "clt" ? data.chavePix || null : null,
    banco: data.tipoContrato === "clt" ? data.banco || null : null,
    agencia: data.tipoContrato === "clt" ? data.agencia || null : null,
    conta: data.tipoContrato === "clt" ? data.conta || null : null,
    empresa_nome: data.tipoContrato === "pj" ? data.empresaNome || null : null,
    empresa_cnpj: data.tipoContrato === "pj" ? data.empresaCnpj || null : null,
    empresa_chave_pix_tipo: data.tipoContrato === "pj" ? data.empresaChavePixTipo || null : null,
    empresa_chave_pix: data.tipoContrato === "pj" ? data.empresaChavePix || null : null,
  };
  if (fotoPath) updatePayload.foto_path = fotoPath;
  // O campo "Salário mensal" some do formulário pra quem tem isso marcado como campo escondido
  // (ver docs/superpowers/specs/2026-10-02-campos-sensiveis-e-atletas-por-categoria-design.md) — e
  // por isso não chega no `formData`. Só grava `valor_salario` quando o campo veio preenchido no
  // envio, pra não zerar um valor já salvo quando quem está editando não pode nem ver o campo.
  if (formData.has("valorSalario")) updatePayload.valor_salario = data.valorSalario ?? null;

  const { error } = await supabase.from("comissao_tecnica").update(updatePayload).eq("id", id);

  if (error) return { error: friendlyDbError(error), values: raw, categoriasSelecionadas: categorias };

  revalidatePath("/comissao-tecnica");
  redirect("/comissao-tecnica");
}

export async function deleteComissao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();
  await supabase.from("comissao_tecnica").delete().eq("id", id);
  revalidatePath("/comissao-tecnica");
}

/**
 * Marca um cadastro como ativo/inativo (em vez de excluir) — mesmo padrão de `alternarStaffAtivo`
 * (app/staff-operacional/actions.ts). Pedido do Mateus em 14/11/2026: SEM motivo nem histórico
 * (diferente do que já existe pros atletas, `alternarAtletaAtivoComMotivo`/
 * `atletas_ativo_historico`) — ele recusou explicitamente esse padrão mais elaborado aqui.
 */
export async function alternarComissaoAtivo(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const novoValor = String(formData.get("novoValor") ?? "") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase.from("comissao_tecnica").update({ ativo: novoValor }).eq("id", id);
  revalidatePath("/comissao-tecnica");
}
