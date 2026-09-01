import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const ENTITY_PHOTOS_BUCKET = "entity-photos";

/** Bucket privado separado do `entity-photos` — cada documento é um arquivo independente (não
 * substitui o anterior por upsert de nome fixo, ao contrário das fotos), ver aba "Documentação" do
 * perfil do atleta (docs/superpowers/specs/2026-08-04-estatisticas-atleta-design.md). */
export const ATLETA_DOCUMENTOS_BUCKET = "atleta-documentos";

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
 * Gera uma signed URL temporária (1h) pra um documento de atleta guardado no bucket
 * `atleta-documentos`. Mesmo espírito de `getSignedPhotoUrl`, bucket separado.
 */
export async function getSignedDocumentoUrl(
  supabase: SupabaseClient,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(ATLETA_DOCUMENTOS_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error || !data) return null;
  return data.signedUrl;
}

/** Monta o path de storage de um documento de atleta — cada documento tem seu próprio `id`
 * (gerado antes do upload), então o path é sempre novo, sem colidir com outros documentos. */
export function buildDocumentoPath(documentoId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "pdf";
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "pdf";
  return `atleta-documentos/${documentoId}/arquivo.${safeExt}`;
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

/**
 * Envia uma foto pro bucket `entity-photos` redimensionando antes (ponto único usado por todo
 * cadastro com foto — atleta, comissão técnica, staff, logo de adversário, item de solicitação
 * etc.). Foto de câmera de celular direto, sem redimensionar, costuma vir com vários MB; como o
 * sistema só mostra em avatar/card (nunca em tela cheia), 1600px no lado maior já é mais resolução
 * do que qualquer tela usa, e cortar pra JPEG qualidade 82 reduz bastante o peso sem perda visível
 * — isso deixa a lista de fotos (Campograma, Atletas etc.) mais rápida pra carregar, principalmente
 * no celular. `rotate()` sem argumento aplica a orientação EXIF antes de cortar o tamanho, senão
 * foto tirada com o celular "deitado" ficaria birada.
 *
 * Se o redimensionamento falhar por qualquer motivo (arquivo corrompido, formato que o `sharp` não
 * lê), envia o arquivo original sem cortar o cadastro por causa disso — melhor guardar a foto do
 * jeito que veio do que a pessoa perder o que preencheu.
 */
export async function uploadFotoRedimensionada(
  cliente: SupabaseClient,
  file: File,
  prefixo: string,
  entidadeId: string,
  baseName: string = "foto",
): Promise<{ path?: string; error?: boolean }> {
  try {
    const bufferOriginal = Buffer.from(await file.arrayBuffer());
    const bufferRedimensionado = await sharp(bufferOriginal)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();

    const path = buildPhotoPath(prefixo, entidadeId, "foto.jpg", baseName);
    const { error } = await cliente.storage
      .from(ENTITY_PHOTOS_BUCKET)
      .upload(path, bufferRedimensionado, { upsert: true, contentType: "image/jpeg" });
    return error ? { error: true } : { path };
  } catch {
    const path = buildPhotoPath(prefixo, entidadeId, file.name, baseName);
    const { error } = await cliente.storage
      .from(ENTITY_PHOTOS_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    return error ? { error: true } : { path };
  }
}

/** Bucket privado dos documentos de competição (regulamento + anexos) — ver
 * supabase/migrations/0063_competicoes.sql. Mesmo espírito do `atleta-documentos`: cada arquivo é
 * independente, com id próprio gerado antes do upload. */
export const COMPETICAO_DOCUMENTOS_BUCKET = "competicao-documentos";

export function buildCompeticaoDocumentoPath(documentoId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "pdf";
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "pdf";
  return `competicao-documentos/${documentoId}/arquivo.${safeExt}`;
}

/** Signed URL temporária (1h) pra um documento de competição — mesmo padrão dos demais buckets
 * privados. */
export async function getSignedCompeticaoDocumentoUrl(
  supabase: SupabaseClient,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(COMPETICAO_DOCUMENTOS_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error || !data) return null;
  return data.signedUrl;
}

/** Bucket privado dos anexos do Termo de Retirada — principalmente o termo ASSINADO, digitalizado
 * depois da impressão (o sistema não faz assinatura digital). Ver
 * supabase/migrations/0069_termo_retirada_anexos.sql. */
export const TERMO_DOCUMENTOS_BUCKET = "termo-documentos";

export function buildTermoDocumentoPath(anexoId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "pdf";
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "pdf";
  return `termo-documentos/${anexoId}/arquivo.${safeExt}`;
}

export async function getSignedTermoDocumentoUrl(
  supabase: SupabaseClient,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(TERMO_DOCUMENTOS_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error || !data) return null;
  return data.signedUrl;
}
