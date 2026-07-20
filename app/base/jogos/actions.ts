"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildPhotoPath, ENTITY_PHOTOS_BUCKET } from "@/lib/supabase/storage";
import { jogoBaseSchema } from "@/lib/validation/schemas";

/**
 * Espelha `app/jogos/actions.ts`, mas grava em `jogos_base` (tabela totalmente independente — ver
 * docs/superpowers/specs/2026-07-20-futebol-de-base-design.md) e inclui `categoria`. Mesmo padrão
 * de `app/base/atletas/actions.ts`: a categoria pode ser trocada no formulário, então tanto criar
 * quanto editar redirecionam pra lista da categoria que veio do formulário.
 */
export interface JogoBaseFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

function parseForm(formData: FormData) {
  const raw = {
    categoria: String(formData.get("categoria") ?? ""),
    competicao: String(formData.get("competicao") ?? ""),
    rodadaFase: String(formData.get("rodadaFase") ?? ""),
    adversarioNome: String(formData.get("adversarioNome") ?? ""),
    dataJogo: String(formData.get("dataJogo") ?? ""),
    horario: String(formData.get("horario") ?? ""),
    localEstadio: String(formData.get("localEstadio") ?? ""),
    endereco: String(formData.get("endereco") ?? ""),
    mandante: formData.get("mandante") === "on",
    golsPro: String(formData.get("golsPro") ?? "") || undefined,
    golsContra: String(formData.get("golsContra") ?? "") || undefined,
  };

  const result = jogoBaseSchema.safeParse(raw);
  return {
    raw: {
      ...raw,
      mandante: raw.mandante ? "on" : "",
      golsPro: raw.golsPro ?? "",
      golsContra: raw.golsContra ?? "",
    },
    result,
  };
}

async function uploadLogoIfPresent(
  supabase: ReturnType<typeof createClient>,
  formData: FormData,
  id: string,
): Promise<{ path?: string | null; error?: string }> {
  const file = formData.get("adversarioLogo");
  if (!(file instanceof File) || file.size === 0) return {};

  const path = buildPhotoPath("jogos-base", id, file.name, "adversario-logo");
  const { error } = await supabase.storage.from(ENTITY_PHOTOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) return { error: "Não foi possível enviar o logo. O restante dos dados não foi salvo." };
  return { path };
}

export async function createJogoBase(
  _prevState: JogoBaseFormState,
  formData: FormData,
): Promise<JogoBaseFormState> {
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const id = randomUUID();
  const data = result.data;

  const { error: uploadError, path: logoPath } = await uploadLogoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const { error } = await supabase.from("jogos_base").insert({
    id,
    categoria: data.categoria,
    competicao: data.competicao,
    rodada_fase: data.rodadaFase || null,
    adversario_nome: data.adversarioNome,
    adversario_logo_path: logoPath ?? null,
    data_jogo: data.dataJogo,
    horario: data.horario || null,
    local_estadio: data.localEstadio || null,
    endereco: data.endereco || null,
    mandante: data.mandante,
    gols_pro: data.golsPro ?? null,
    gols_contra: data.golsContra ?? null,
  });

  if (error) return { error: "Não foi possível salvar o jogo. Tente novamente.", values: raw };

  revalidatePath("/base/jogos");
  redirect(`/base/jogos/${data.categoria}`);
}

export async function updateJogoBase(
  _prevState: JogoBaseFormState,
  formData: FormData,
): Promise<JogoBaseFormState> {
  const id = String(formData.get("id") ?? "");
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  const { error: uploadError, path: logoPath } = await uploadLogoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const updatePayload: Record<string, unknown> = {
    categoria: data.categoria,
    competicao: data.competicao,
    rodada_fase: data.rodadaFase || null,
    adversario_nome: data.adversarioNome,
    data_jogo: data.dataJogo,
    horario: data.horario || null,
    local_estadio: data.localEstadio || null,
    endereco: data.endereco || null,
    mandante: data.mandante,
    gols_pro: data.golsPro ?? null,
    gols_contra: data.golsContra ?? null,
  };
  if (logoPath) updatePayload.adversario_logo_path = logoPath;

  const { error } = await supabase.from("jogos_base").update(updatePayload).eq("id", id);

  if (error) return { error: "Não foi possível salvar o jogo. Tente novamente.", values: raw };

  revalidatePath("/base/jogos");
  redirect(`/base/jogos/${data.categoria}`);
}

/** Antes de excluir, lê a categoria da linha pra revalidar a lista certa. */
export async function deleteJogoBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();

  const { data } = await supabase.from("jogos_base").select("categoria").eq("id", id).maybeSingle();
  const categoria = (data as { categoria?: string } | null)?.categoria;

  await supabase.from("jogos_base").delete().eq("id", id);

  revalidatePath("/base/jogos");
  if (categoria) revalidatePath(`/base/jogos/${categoria}`);
}
