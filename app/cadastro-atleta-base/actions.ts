"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadFotoRedimensionada } from "@/lib/supabase/storage";
import { fichaCadastroAtletaBaseSchema } from "@/lib/validation/schemas";
import { normalizeCPF } from "@/lib/validation/cpf";

/**
 * Ficha de Cadastro pública de Atleta (link sem login, ver app/cadastro-atleta-base/page.tsx e
 * docs/superpowers/specs/2026-08-19-captacao-atletas-separacao-design.md). Cria DIRETO em
 * `atletas_base`, com `status: "liberado"` fixado no servidor — sem relação nenhuma com a Captação
 * (esse link não passa por lá). Desde 25/08 (docs/superpowers/specs/
 * 2026-08-25-atleta-contrato-posicao-cpf-design.md) TODOS os campos são obrigatórios, inclusive
 * RG/CPF; campos administrativos do clube (número de camisa/CBF/FPF, tipo de contrato, "Data de
 * início do contrato") continuam de fora do formulário — o Mateus completa depois pela tela
 * interna. Desde 25/08 (docs/superpowers/specs/2026-08-25-atleta-telefone-alergia-foto-design.md)
 * a foto também é obrigatória aqui — mesmo padrão de `app/cadastro-comissao-tecnica/actions.ts` —
 * e o telefone do atleta/mãe/pai exige o formato válido de celular (só o do empresário continua
 * livre). Terceira rodada de 25/08: pé dominante e "Data de início no clube" (distinta de "Data de
 * início do contrato" — essa segunda continua fora daqui) também passaram a ser obrigatórios.
 *
 * Roda inteiro com o cliente admin (service_role) — mesma razão de `cadastrarStaffPublicoBase`:
 * quem preenche não tem sessão. Precisa do GRANT em `atletas_base` pro service_role, que nasceu
 * junto na migração 0077.
 *
 * O CPF já é único no banco (`atletas_base_cpf_unique`, ver 0031_futebol_base_infra_atletas.sql) —
 * `friendlyDbError` só troca o erro cru do banco por uma mensagem que explica o que aconteceu, pedido
 * de 25/08 ("não permitir duas respostas"): impedir que a mesma pessoa envie a ficha duas vezes sem
 * entender por quê ela não foi salva de novo.
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
    peDominante: String(formData.get("peDominante") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    cidadeNatal: String(formData.get("cidadeNatal") ?? ""),
    ufNatal: String(formData.get("ufNatal") ?? ""),
    alojado: formData.get("alojado") === "on",
    escola: String(formData.get("escola") ?? ""),
    dataInicioClube: String(formData.get("dataInicioClube") ?? ""),
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
    possuiAlergiaMedicamento: String(formData.get("possuiAlergiaMedicamento") ?? ""),
    alergiaMedicamentoQual: String(formData.get("alergiaMedicamentoQual") ?? ""),
  };

  const result = fichaCadastroAtletaBaseSchema.safeParse(raw);
  return { raw: { ...raw, alojado: raw.alojado ? "on" : "" }, result };
}

function friendlyDbError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("cpf")) {
      return "Já existe um cadastro com este CPF. Se você já enviou essa ficha antes, não precisa enviar de novo.";
    }
    if (error.message.includes("rg")) {
      return "Já existe um cadastro com este RG. Se você já enviou essa ficha antes, não precisa enviar de novo.";
    }
    return "Já existe um cadastro com esses dados.";
  }
  return "Não foi possível enviar o cadastro. Tente novamente.";
}

async function uploadFoto(
  admin: ReturnType<typeof createAdminClient>,
  formData: FormData,
  id: string,
): Promise<{ path?: string; error?: string }> {
  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) return {};

  const { path, error } = await uploadFotoRedimensionada(admin, file, "atletas-base", id);

  if (error) return { error: "Não foi possível enviar a foto. O restante do cadastro não foi salvo." };
  return { path };
}

export async function cadastrarAtletaPublicoBase(
  _prevState: CadastroAtletaPublicoState,
  formData: FormData,
): Promise<CadastroAtletaPublicoState> {
  const { raw, result } = parseForm(formData);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    // Bug reportado em 25/08: quem preenche esse formulário longo e clica em "Enviar" já rolado lá
    // embaixo não via NADA acontecer quando um campo lá em cima tinha erro — o erro só aparecia do
    // lado do campo, fora da tela. Esse `error` genérico aparece perto do botão (ver o formulário),
    // e o formulário rola pro primeiro campo com erro sozinho — ver atleta-publico-form.tsx.
    return {
      error: "Existem campos com erro. Revise os campos destacados em vermelho acima.",
      fieldErrors,
      values: raw,
    };
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

  const fotoFile = formData.get("foto");
  const temFotoNova = fotoFile instanceof File && fotoFile.size > 0;
  if (!temFotoNova) {
    return {
      error: "Existem campos com erro. Revise os campos destacados em vermelho acima.",
      fieldErrors: { foto: "A foto é obrigatória." },
      values: raw,
    };
  }

  const data = result.data;
  const id = randomUUID();
  const { error: uploadError, path: fotoPath } = await uploadFoto(admin, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const { error } = await admin.from("atletas_base").insert({
    id,
    categoria: data.categoria,
    nome_completo: data.nomeCompleto,
    apelido: data.apelido,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    posicao: data.posicao,
    pe_dominante: data.peDominante,
    telefone: data.telefone,
    foto_path: fotoPath ?? null,
    cidade_natal: data.cidadeNatal,
    uf_natal: data.ufNatal.toUpperCase(),
    status: "liberado",
    alojado: data.alojado,
    escola: data.escola,
    data_inicio_clube: data.dataInicioClube,
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
    possui_alergia_medicamento: data.possuiAlergiaMedicamento === "sim",
    alergia_medicamento_qual: data.possuiAlergiaMedicamento === "sim" ? data.alergiaMedicamentoQual || null : null,
  });

  if (error) return { error: friendlyDbError(error), values: raw };

  revalidatePath("/base/atletas");
  return { success: true };
}
