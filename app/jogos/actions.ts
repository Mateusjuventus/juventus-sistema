"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildPhotoPath, ENTITY_PHOTOS_BUCKET } from "@/lib/supabase/storage";
import { jogoSchema } from "@/lib/validation/schemas";

export interface JogoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

function parseForm(formData: FormData) {
  const raw = {
    competicao: String(formData.get("competicao") ?? ""),
    rodadaFase: String(formData.get("rodadaFase") ?? ""),
    adversarioNome: String(formData.get("adversarioNome") ?? ""),
    dataJogo: String(formData.get("dataJogo") ?? ""),
    horario: String(formData.get("horario") ?? ""),
    localEstadio: String(formData.get("localEstadio") ?? ""),
    endereco: String(formData.get("endereco") ?? ""),
    mandante: formData.get("mandante") === "on",
  };

  const result = jogoSchema.safeParse(raw);
  return {
    raw: { ...raw, mandante: raw.mandante ? "on" : "" },
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

  const path = buildPhotoPath("jogos", id, file.name, "adversario-logo");
  const { error } = await supabase.storage.from(ENTITY_PHOTOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) return { error: "Não foi possível enviar o logo. O restante dos dados não foi salvo." };
  return { path };
}

export async function createJogo(
  _prevState: JogoFormState,
  formData: FormData,
): Promise<JogoFormState> {
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

  const { error } = await supabase.from("jogos").insert({
    id,
    competicao: data.competicao,
    rodada_fase: data.rodadaFase || null,
    adversario_nome: data.adversarioNome,
    adversario_logo_path: logoPath ?? null,
    data_jogo: data.dataJogo,
    horario: data.horario || null,
    local_estadio: data.localEstadio || null,
    endereco: data.endereco || null,
    mandante: data.mandante,
  });

  if (error) return { error: "Não foi possível salvar o jogo. Tente novamente.", values: raw };

  revalidatePath("/jogos");
  redirect("/jogos");
}

export async function updateJogo(
  id: string,
  _prevState: JogoFormState,
  formData: FormData,
): Promise<JogoFormState> {
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
    competicao: data.competicao,
    rodada_fase: data.rodadaFase || null,
    adversario_nome: data.adversarioNome,
    data_jogo: data.dataJogo,
    horario: data.horario || null,
    local_estadio: data.localEstadio || null,
    endereco: data.endereco || null,
    mandante: data.mandante,
  };
  if (logoPath) updatePayload.adversario_logo_path = logoPath;

  const { error } = await supabase.from("jogos").update(updatePayload).eq("id", id);

  if (error) return { error: "Não foi possível salvar o jogo. Tente novamente.", values: raw };

  revalidatePath("/jogos");
  redirect("/jogos");
}

export async function deleteJogo(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("jogos").delete().eq("id", id);
  revalidatePath("/jogos");
}
