import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPhotoPath, ENTITY_PHOTOS_BUCKET } from "@/lib/supabase/storage";

/**
 * Envia a foto de um item de solicitação (Compra) pro bucket compartilhado de fotos. Usado tanto
 * ao criar a solicitação com itens já preenchidos (app/solicitacoes/actions.ts) quanto ao
 * adicionar um item depois, na tela de edição (app/solicitacoes/[id]/itens/actions.ts).
 */
export async function uploadItemFotoIfPresent(
  supabase: SupabaseClient,
  file: FormDataEntryValue | null,
  itemId: string,
): Promise<{ path?: string | null; error?: string }> {
  if (!(file instanceof File) || file.size === 0) return {};

  const path = buildPhotoPath("solicitacao-itens", itemId, file.name);
  const { error } = await supabase.storage.from(ENTITY_PHOTOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) return { error: "Não foi possível enviar a foto de um dos itens." };
  return { path };
}
