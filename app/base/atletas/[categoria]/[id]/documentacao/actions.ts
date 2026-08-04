"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ATLETA_DOCUMENTOS_BUCKET, buildDocumentoPath } from "@/lib/supabase/storage";

/** Espelha `app/atletas/[id]/documentacao/actions.ts` para o Futebol de Base — mesmo bucket
 * `atleta-documentos` (cada documento já tem um id único, não precisa de path separado por
 * departamento), tabela `atleta_documentos_base`. */

export interface DocumentoFormState {
  error?: string;
  success?: boolean;
}

export async function adicionarDocumentoBase(
  _prevState: DocumentoFormState,
  formData: FormData,
): Promise<DocumentoFormState> {
  const atletaId = String(formData.get("atletaId") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const arquivo = formData.get("arquivo");

  if (!atletaId) return { error: "Atleta não identificado. Recarregue a página e tente novamente." };
  if (!nome) return { error: "Informe um nome pro documento." };
  if (!(arquivo instanceof File) || arquivo.size === 0) return { error: "Selecione um arquivo." };

  const supabase = createClient();
  const documentoId = randomUUID();
  const path = buildDocumentoPath(documentoId, arquivo.name);

  const { error: uploadError } = await supabase.storage
    .from(ATLETA_DOCUMENTOS_BUCKET)
    .upload(path, arquivo, { contentType: arquivo.type || undefined });

  if (uploadError) return { error: "Não foi possível enviar o arquivo. Tente novamente." };

  const { error: insertError } = await supabase.from("atleta_documentos_base").insert({
    id: documentoId,
    atleta_id: atletaId,
    nome,
    arquivo_path: path,
  });

  if (insertError) {
    await supabase.storage.from(ATLETA_DOCUMENTOS_BUCKET).remove([path]);
    return { error: "Não foi possível salvar o documento. Tente novamente." };
  }

  revalidatePath(`/base/atletas/${categoria}/${atletaId}/documentacao`);
  return { success: true };
}

export async function removerDocumentoBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const { data: documento } = await supabase
    .from("atleta_documentos_base")
    .select("atleta_id, arquivo_path")
    .eq("id", id)
    .single();

  if (!documento) return;

  await supabase.from("atleta_documentos_base").delete().eq("id", id);
  await supabase.storage.from(ATLETA_DOCUMENTOS_BUCKET).remove([documento.arquivo_path]);

  const { data: atleta } = await supabase
    .from("atletas_base")
    .select("categoria")
    .eq("id", documento.atleta_id)
    .single();
  if (atleta) revalidatePath(`/base/atletas/${atleta.categoria}/${documento.atleta_id}/documentacao`);
}
