"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { captacaoPublicaSchema } from "@/lib/validation/schemas";

/**
 * Cadastro público de um candidato novo pro Futebol de Base (link sem login, ver
 * app/cadastro-atleta-base/page.tsx e docs/superpowers/specs/2026-08-19-captacao-base-design.md).
 * Cria sempre em `captacao_base` com `status: "avaliacao"` e `origem: "publico"` — decidido aqui no
 * servidor, nunca pelo formulário. Não cria Atleta nenhum: isso só acontece quando o Mateus aprova
 * o candidato pela tela interna (ver `app/base/captacao/actions.ts`).
 *
 * Roda inteiro com o cliente admin (service_role) — mesma razão de `cadastrarStaffPublicoBase`:
 * quem preenche não tem sessão.
 */
export interface CadastroAtletaPublicoState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
  success?: boolean;
}

function parseForm(formData: FormData) {
  const raw = {
    nomeCompleto: String(formData.get("nomeCompleto") ?? ""),
    dataNascimento: String(formData.get("dataNascimento") ?? ""),
    posicao: String(formData.get("posicao") ?? ""),
    categoria: String(formData.get("categoria") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    desejaAlojamento: formData.get("desejaAlojamento") === "on",
    maeNome: String(formData.get("maeNome") ?? ""),
    maeTelefone: String(formData.get("maeTelefone") ?? ""),
    paiNome: String(formData.get("paiNome") ?? ""),
    paiTelefone: String(formData.get("paiTelefone") ?? ""),
    empresarioNome: String(formData.get("empresarioNome") ?? ""),
    empresarioTelefone: String(formData.get("empresarioTelefone") ?? ""),
    agencia: String(formData.get("agencia") ?? ""),
    escola: String(formData.get("escola") ?? ""),
    cep: String(formData.get("cep") ?? ""),
    logradouro: String(formData.get("logradouro") ?? ""),
    // EnderecoFields manda o número do endereço no campo "numero" (ver o mesmo comentário em
    // app/base/captacao/actions.ts).
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    uf: String(formData.get("uf") ?? ""),
  };

  const result = captacaoPublicaSchema.safeParse(raw);
  return { raw: { ...raw, desejaAlojamento: raw.desejaAlojamento ? "on" : "" }, result };
}

export async function cadastrarAtletaPublicoBase(
  _prevState: CadastroAtletaPublicoState,
  formData: FormData,
): Promise<CadastroAtletaPublicoState> {
  const { raw, result } = parseForm(formData);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const admin = createAdminClient();

  const { data: configData } = await admin
    .from("configuracoes_cadastro_atleta_base")
    .select("cadastro_publico_ativo")
    .limit(1)
    .maybeSingle();
  if (!configData?.cadastro_publico_ativo) {
    return { error: "O cadastro público está fechado no momento. Fale com o responsável do Futebol de Base." };
  }

  const data = result.data;
  const { error } = await admin.from("captacao_base").insert({
    nome_completo: data.nomeCompleto,
    data_nascimento: data.dataNascimento,
    posicao: data.posicao,
    categoria: data.categoria,
    telefone: data.telefone || null,
    deseja_alojamento: data.desejaAlojamento,
    mae_nome: data.maeNome || null,
    mae_telefone: data.maeTelefone || null,
    pai_nome: data.paiNome || null,
    pai_telefone: data.paiTelefone || null,
    empresario_nome: data.empresarioNome || null,
    empresario_telefone: data.empresarioTelefone || null,
    agencia: data.agencia || null,
    escola: data.escola || null,
    cep: data.cep || null,
    logradouro: data.logradouro || null,
    numero_endereco: data.numero || null,
    complemento: data.complemento || null,
    bairro: data.bairro || null,
    cidade: data.cidade || null,
    uf: data.uf ? data.uf.toUpperCase() : null,
    status: "avaliacao",
    origem: "publico",
  });

  if (error) return { error: `Não foi possível enviar o cadastro: ${error.message}` };

  revalidatePath("/base/captacao");
  return { success: true };
}
