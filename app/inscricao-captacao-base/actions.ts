"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { captacaoInscricaoSchema } from "@/lib/validation/schemas";

/**
 * Inscrição pública pro teste/avaliação do Futebol de Base (link sem login, ver
 * app/inscricao-captacao-base/page.tsx e docs/superpowers/specs/
 * 2026-08-19-captacao-atletas-separacao-design.md). Cria sempre em `captacao_base` com
 * `status: "inscricao"` e `origem: "publico"` — decidido aqui no servidor, nunca pelo formulário.
 * Cai na fila de "Aprovações" (`/base/captacao/aprovacoes`); só quando o Mateus aprova e informa a
 * Data de Início é que passa a "Em avaliação". Não tem relação nenhuma com o cadastro de Atletas
 * (esse é o link da Ficha de Cadastro, `/cadastro-atleta-base`, coisa totalmente separada).
 *
 * Roda inteiro com o cliente admin (service_role) — mesma razão de `cadastrarStaffPublicoBase`:
 * quem preenche não tem sessão.
 */
export interface InscricaoCaptacaoState {
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
    indicacao: String(formData.get("indicacao") ?? ""),
    clubeAnterior: String(formData.get("clubeAnterior") ?? ""),
    maeNome: String(formData.get("maeNome") ?? ""),
    maeTelefone: String(formData.get("maeTelefone") ?? ""),
    paiNome: String(formData.get("paiNome") ?? ""),
    paiTelefone: String(formData.get("paiTelefone") ?? ""),
    escola: String(formData.get("escola") ?? ""),
    cep: String(formData.get("cep") ?? ""),
    logradouro: String(formData.get("logradouro") ?? ""),
    // Mesmo padrão de app/base/captacao/actions.ts: o input de número do endereço vem como
    // name="numero" (EnderecoFields), e vira `numero_endereco` na hora de gravar.
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    uf: String(formData.get("uf") ?? ""),
  };

  const result = captacaoInscricaoSchema.safeParse(raw);
  return { raw, result };
}

export async function inscreverCaptacao(
  _prevState: InscricaoCaptacaoState,
  formData: FormData,
): Promise<InscricaoCaptacaoState> {
  const { raw, result } = parseForm(formData);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const admin = createAdminClient();

  const { data: configData } = await admin
    .from("configuracoes_inscricao_captacao_base")
    .select("cadastro_publico_ativo")
    .limit(1)
    .maybeSingle();
  if (!configData?.cadastro_publico_ativo) {
    return { error: "As inscrições estão fechadas no momento. Fale com o responsável do Futebol de Base." };
  }

  const data = result.data;
  const { error } = await admin.from("captacao_base").insert({
    nome_completo: data.nomeCompleto,
    data_nascimento: data.dataNascimento,
    posicao: data.posicao,
    categoria: data.categoria,
    telefone: data.telefone || null,
    indicacao: data.indicacao || null,
    clube_anterior: data.clubeAnterior || null,
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
    status: "inscricao",
    data_inicio: null,
    origem: "publico",
  });

  if (error) return { error: `Não foi possível enviar a inscrição: ${error.message}` };

  revalidatePath("/base/captacao");
  revalidatePath("/base/captacao/aprovacoes");
  return { success: true };
}
