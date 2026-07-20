"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildPhotoPath, ENTITY_PHOTOS_BUCKET } from "@/lib/supabase/storage";
import { atletaBaseSchema } from "@/lib/validation/schemas";
import { normalizeCPF } from "@/lib/validation/cpf";

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
    peDominante: String(formData.get("peDominante") ?? "") || undefined,
    telefone: String(formData.get("telefone") ?? ""),
    cidadeNatal: String(formData.get("cidadeNatal") ?? ""),
    ufNatal: String(formData.get("ufNatal") ?? ""),
    enderecoAtual: String(formData.get("enderecoAtual") ?? ""),
    dataInicioClube: String(formData.get("dataInicioClube") ?? ""),
    empresarioNome: String(formData.get("empresarioNome") ?? ""),
    status: String(formData.get("status") ?? "liberado"),
    dataFimContrato: String(formData.get("dataFimContrato") ?? ""),
  };

  const result = atletaBaseSchema.safeParse(raw);
  return { raw, result };
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

  const path = buildPhotoPath("atletas-base", atletaId, file.name);
  const { error } = await supabase.storage.from(ENTITY_PHOTOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

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

  const { error } = await supabase.from("atletas_base").insert({
    id,
    categoria: data.categoria,
    nome_completo: data.nomeCompleto,
    apelido: data.apelido || null,
    rg: data.rg,
    cpf: normalizeCPF(data.cpf),
    data_nascimento: data.dataNascimento,
    posicao: data.posicao,
    numero_camisa: data.numeroCamisa ?? null,
    pe_dominante: data.peDominante ?? null,
    telefone: data.telefone || null,
    cidade_natal: data.cidadeNatal || null,
    uf_natal: data.ufNatal ? data.ufNatal.toUpperCase() : null,
    endereco_atual: data.enderecoAtual || null,
    data_inicio_clube: data.dataInicioClube || null,
    empresario_nome: data.empresarioNome || null,
    foto_path: fotoPath ?? null,
    status: data.status,
    data_fim_contrato: data.dataFimContrato || null,
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
    pe_dominante: data.peDominante ?? null,
    telefone: data.telefone || null,
    cidade_natal: data.cidadeNatal || null,
    uf_natal: data.ufNatal ? data.ufNatal.toUpperCase() : null,
    endereco_atual: data.enderecoAtual || null,
    data_inicio_clube: data.dataInicioClube || null,
    empresario_nome: data.empresarioNome || null,
    status: data.status,
    data_fim_contrato: data.dataFimContrato || null,
  };
  if (fotoPath) updatePayload.foto_path = fotoPath;

  const { error } = await supabase.from("atletas_base").update(updatePayload).eq("id", id);

  if (error) {
    return { error: friendlyDbError(error), values: raw };
  }

  revalidatePath("/base/atletas");
  redirect(`/base/atletas/${data.categoria}`);
}

/** Antes de excluir, lê a categoria da linha pra revalidar a lista certa (a rota de excluir é
 * chamada a partir da lista de uma categoria, mas o `DeleteButton` só manda o `id`). */
export async function deleteAtletaBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();

  const { data } = await supabase.from("atletas_base").select("categoria").eq("id", id).maybeSingle();
  const categoria = (data as { categoria?: string } | null)?.categoria;

  await supabase.from("atletas_base").delete().eq("id", id);

  revalidatePath("/base/atletas");
  if (categoria) revalidatePath(`/base/atletas/${categoria}`);
}
