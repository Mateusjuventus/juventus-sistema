import type { SupabaseClient } from "@supabase/supabase-js";

export const ENTITY_PHOTOS_BUCKET = "entity-photos";

/**
 * Gera uma signed URL temporária (1h) para uma foto/logo guardado no bucket
 * privado. Nunca usamos URL pública — o bucket é privado por padrão
 * (ver supabase/migrations/0001_init.sql).
 */
export async function getSignedPhotoUrl(
  supabase: SupabaseClient,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(ENTITY_PHOTOS_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Monta o path de storage padronizado para a foto/logo de uma entidade, ex:
 * atletas/<id>/foto.jpg ou jogos/<id>/adversario-logo.png. Usa sempre o mesmo
 * nome de arquivo por entidade (baseName fixo) para que um novo upload
 * substitua o anterior (upsert) em vez de acumular arquivos órfãos.
 */
export function buildPhotoPath(
  prefixo: string,
  entidadeId: string,
  fileName: string,
  baseName: string = "foto",
): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
  return `${prefixo}/${entidadeId}/${baseName}.${safeExt}`;
}
