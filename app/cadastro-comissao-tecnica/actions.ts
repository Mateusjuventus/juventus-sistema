"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cadastroPublicoComissaoTecnicaSchema } from "@/lib/validation/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPhotoPath, ENTITY_PHOTOS_BUCKET } from "@/lib/supabase/storage";
import { normalizeCPF } from "@/lib/validation/cpf";
import { normalizeTelefone } from "@/lib/validation/telefone";

/** Espelha `app/cadastro-staff-base/actions.ts`, mas grava em `comissao_tecnica` e confere
 * `configuracoes_cadastro_comissao_tecnica` — totalmente independente do fluxo de Staff Operacional.
 * Diferente de lá, TODOS os campos são obrigatórios aqui (ver
 * docs/superpowers/specs/2026-08-25-comissao-tecnica-cadastro-publico-design.md). */
export interface CadastroPublicoComissaoTecnicaFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
  success?: boolean;
}

function parseForm(formData: FormData) {
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
    valorSalario: String(formData.get("valorSalario") ?? ""),
    dataInicio: String(formData.get("dataInicio") ?? ""),
  };

  const result = cadastroPublicoComissaoTecnicaSchema.safeParse(raw);
  return { raw, result };
}

function friendlyDbError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("cpf")) return "Já existe uma pessoa cadastrada com este CPF.";
    if (error.message.includes("rg")) return "Já existe uma pessoa cadastrada com este RG.";
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

  const path = buildPhotoPath("comissao", id, file.name);
  const { error } = await admin.storage.from(ENTITY_PHOTOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) return { error: "Não foi possível enviar a foto. O restante do cadastro não foi salvo." };
  return { path };
}

/**
 * Cadastro público da Comissão Técnica/Diretoria — Futebol Profissional (link sem login, ver
 * app/cadastro-comissao-tecnica/page.tsx). Roda inteiro com o cliente admin (service_role) —
 * revalida a checagem de "cadastro ativo" de novo, mesmo que a página já tenha checado antes (a
 * pessoa pode ter deixado a aba aberta depois que o cadastro foi desativado). Sempre CRIA um
 * cadastro novo, nunca atualiza um existente — pra alguém que já está cadastrado e só falta
 * completar um dado, o Mateus edita direto pela tela de admin.
 */
export async function cadastrarComissaoTecnicaPublico(
  _prevState: CadastroPublicoComissaoTecnicaFormState,
  formData: FormData,
): Promise<CadastroPublicoComissaoTecnicaFormState> {
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const admin = createAdminClient();

  const { data: configData } = await admin
    .from("configuracoes_cadastro_comissao_tecnica")
    .select("cadastro_publico_ativo")
    .limit(1)
    .maybeSingle();
  if (!configData?.cadastro_publico_ativo) {
    return {
      error: "O cadastro público está fechado no momento. Fale com o responsável do Futebol Profissional.",
    };
  }

  const fotoFile = formData.get("foto");
  const temFotoNova = fotoFile instanceof File && fotoFile.size > 0;
  if (!temFotoNova) {
    return { fieldErrors: { foto: "A foto é obrigatória." }, values: raw };
  }

  const data = result.data;
  const id = randomUUID();
  const { error: uploadError, path: fotoPath } = await uploadFoto(admin, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const { error } = await admin.from("comissao_tecnica").insert({
    id,
    nome_completo: data.nomeCompleto,
    apelido: data.apelido,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    funcao: data.funcao,
    telefone: normalizeTelefone(data.telefone),
    email: data.email,
    foto_path: fotoPath ?? null,
    tipo_contrato: data.tipoContrato,
    valor_salario: data.valorSalario,
    data_inicio: data.dataInicio,
  });

  if (error) return { error: friendlyDbError(error), values: raw };

  revalidatePath("/comissao-tecnica");
  return { success: true };
}
