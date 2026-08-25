"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { fichaCadastroAtletaBaseSchema } from "@/lib/validation/schemas";
import { normalizeCPF } from "@/lib/validation/cpf";

/**
 * Ficha de Cadastro pública de Atleta (link sem login, ver app/cadastro-atleta-base/page.tsx e
 * docs/superpowers/specs/2026-08-19-captacao-atletas-separacao-design.md). Cria DIRETO em
 * `atletas_base`, com `status: "liberado"` fixado no servidor — sem relação nenhuma com a Captação
 * (esse link não passa por lá). Desde 25/08 (docs/superpowers/specs/
 * 2026-08-25-atleta-contrato-posicao-cpf-design.md) TODOS os campos são obrigatórios, inclusive
 * RG/CPF; campos administrativos do clube (número de camisa/CBF/FPF, tipo de contrato, datas de
 * contrato) continuam de fora do formulário — o Mateus completa depois pela tela interna.
 *
 * Roda inteiro com o cliente admin (service_role) — mesma razão de `cadastrarStaffPublicoBase`:
 * quem preenche não tem sessão. Precisa do GRANT em `atletas_base` pro service_role, que nasceu
 * junto na migração 0077.
 */
export interface CadastroAtletaPublicoState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
  success?: boolean;
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
    telefone: String(formData.get("telefone") ?? ""),
    cidadeNatal: String(formData.get("cidadeNatal") ?? ""),
    ufNatal: String(formData.get("ufNatal") ?? ""),
    alojado: formData.get("alojado") === "on",
    escola: String(formData.get("escola") ?? ""),
    agencia: String(formData.get("agencia") ?? ""),
    empresarioNome: String(formData.get("empresarioNome") ?? ""),
    empresarioTelefone: String(formData.get("empresarioTelefone") ?? ""),
    maeNome: String(formData.get("maeNome") ?? ""),
    maeTelefone: String(formData.get("maeTelefone") ?? ""),
    paiNome: String(formData.get("paiNome") ?? ""),
    paiTelefone: String(formData.get("paiTelefone") ?? ""),
    // EnderecoFields manda o número do endereço no campo "numero" (ver o mesmo comentário em
    // app/base/atletas/actions.ts).
    cep: String(formData.get("cep") ?? ""),
    logradouro: String(formData.get("logradouro") ?? ""),
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    uf: String(formData.get("uf") ?? ""),
  };

  const result = fichaCadastroAtletaBaseSchema.safeParse(raw);
  return { raw: { ...raw, alojado: raw.alojado ? "on" : "" }, result };
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
    return { error: "A Ficha de Cadastro está fechada no momento. Fale com o responsável do Futebol de Base." };
  }

  const data = result.data;
  const { error } = await admin.from("atletas_base").insert({
    id: randomUUID(),
    categoria: data.categoria,
    nome_completo: data.nomeCompleto,
    apelido: data.apelido,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    posicao: data.posicao,
    telefone: data.telefone,
    cidade_natal: data.cidadeNatal,
    uf_natal: data.ufNatal.toUpperCase(),
    status: "liberado",
    alojado: data.alojado,
    escola: data.escola,
    agencia: data.agencia,
    empresario_nome: data.empresarioNome,
    empresario_telefone: data.empresarioTelefone,
    mae_nome: data.maeNome,
    mae_telefone: data.maeTelefone,
    pai_nome: data.paiNome,
    pai_telefone: data.paiTelefone,
    cep: data.cep,
    logradouro: data.logradouro,
    numero: data.numero,
    complemento: data.complemento,
    bairro: data.bairro,
    cidade: data.cidade,
    uf: data.uf.toUpperCase(),
  });

  if (error) return { error: `Não foi possível enviar o cadastro: ${error.message}` };

  revalidatePath("/base/atletas");
  return { success: true };
}
