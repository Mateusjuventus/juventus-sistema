"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ATLETA_DOCUMENTOS_BUCKET, buildDocumentoPath } from "@/lib/supabase/storage";

export interface DocumentoFormState {
  error?: string;
  success?: boolean;
}

/** Adiciona um documento ao atleta — nome livre + arquivo, sem categoria/validade (ver a spec).
 * Faz o upload pro bucket `atleta-documentos` usando o id do documento como pasta, então cada
 * envio é um arquivo novo e independente (nunca substitui um documento já existente). */
export async function adicionarDocumento(
  _prevState: DocumentoFormState,
  formData: FormData,
): Promise<DocumentoFormState> {
  const atletaId = String(formData.get("atletaId") ?? "");
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

  const { error: insertError } = await supabase.from("atleta_documentos").insert({
    id: documentoId,
    atleta_id: atletaId,
    nome,
    arquivo_path: path,
  });

  if (insertError) {
    await supabase.storage.from(ATLETA_DOCUMENTOS_BUCKET).remove([path]);
    return { error: "Não foi possível salvar o documento. Tente novamente." };
  }

  revalidatePath(`/atletas/${atletaId}/documentacao`);
  return { success: true };
}

/** Remove um documento — apaga o arquivo do Storage e a linha do banco. Mesmo padrão do
 * `DeleteButton` compartilhado (só recebe o `id`), busca o atleta/path por trás antes de excluir. */
export async function removerDocumento(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const { data: documento } = await supabase
    .from("atleta_documentos")
    .select("atleta_id, arquivo_path")
    .eq("id", id)
    .single();

  if (!documento) return;

  await supabase.from("atleta_documentos").delete().eq("id", id);
  await supabase.storage.from(ATLETA_DOCUMENTOS_BUCKET).remove([documento.arquivo_path]);

  revalidatePath(`/atletas/${documento.atleta_id}/documentacao`);
}
