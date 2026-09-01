import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadFotoRedimensionada } from "@/lib/supabase/storage";

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

  const { path, error } = await uploadFotoRedimensionada(supabase, file, "solicitacao-itens", itemId);

  if (error) return { error: "Não foi possível enviar a foto de um dos itens." };
  return { path };
}
