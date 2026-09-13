"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSignedAssinaturaUrl } from "@/lib/supabase/storage";
import type { TipoDocumento } from "./config";

export interface AssinarState {
  error?: string;
}

/**
 * Confere se a conta já tem uma assinatura desenhada/anexada salva (ver docs/superpowers/specs/
 * 2026-09-13-assinatura-desenhada-design.md). Usada tanto pra travar a criação/envio dos
 * documentos que assinam sozinhos automaticamente (o Solicitante ao criar uma Solicitação, o
 * Treinador ao enviar o Relatório de Dispensa ou o Parecer de Captação) quanto dentro de
 * `assinarDocumento`, pra nunca deixar sair uma assinatura só de texto.
 */
export async function possuiAssinaturaCadastrada(
  supabase: ReturnType<typeof createClient>,
  usuarioId: string,
): Promise<boolean> {
  const { data } = await supabase.from("perfis").select("assinatura_path").eq("id", usuarioId).maybeSingle();
  return Boolean(data?.assinatura_path);
}

/**
 * Assina um papel de um documento (ver docs/superpowers/specs/2026-09-13-assinatura-desenhada-
 * design.md) — não pede mais senha: quem chega até aqui já passou pela trava de "quem pode
 * assinar" (`podeAssinarPapel`), então clicar em "Assinar" já é confirmação suficiente. A
 * assinatura de verdade é a imagem salva em `/minha-conta` (`perfis.assinatura_path`); sem ela, a
 * ação recusa e explica onde cadastrar, em vez de gravar só nome/cargo por escrito.
 *
 * `nome_no_momento`/`cargo_no_momento`/`assinatura_path` são um retrato do momento da assinatura —
 * precisam estar preenchidos ANTES (em `/minha-conta`), e trocar a assinatura salva depois não
 * muda esse retrato.
 */
export async function assinarDocumento(
  tipoDocumento: TipoDocumento,
  documentoId: string,
  papel: string,
  caminhoRevalidar: string,
  _prevState: AssinarState,
  _formData: FormData,
): Promise<AssinarState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sessão expirada. Faça login novamente." };

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, cargo, assinatura_path")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil?.nome) {
    return { error: "Preencha seu nome em Minha Conta antes de assinar." };
  }
  if (!perfil.assinatura_path) {
    return { error: "Cadastre sua assinatura em Minha Conta antes de assinar." };
  }

  const { error } = await supabase.from("assinaturas_documento").upsert(
    {
      tipo_documento: tipoDocumento,
      documento_id: documentoId,
      papel,
      usuario_id: user.id,
      nome_no_momento: perfil.nome,
      cargo_no_momento: perfil.cargo,
      assinatura_path: perfil.assinatura_path,
      assinado_em: new Date().toISOString(),
    },
    { onConflict: "tipo_documento,documento_id,papel" },
  );
  if (error) return { error: `Não foi possível assinar: ${error.message}` };

  revalidatePath(caminhoRevalidar);
  return {};
}

export interface AssinaturaResumo {
  papel: string;
  usuarioId: string;
  nomeNoMomento: string;
  cargoNoMomento: string | null;
  assinaturaPath: string | null;
  assinadoEm: string;
}

export async function buscarAssinaturas(tipoDocumento: TipoDocumento, documentoId: string): Promise<AssinaturaResumo[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("assinaturas_documento")
    .select("papel, usuario_id, nome_no_momento, cargo_no_momento, assinatura_path, assinado_em")
    .eq("tipo_documento", tipoDocumento)
    .eq("documento_id", documentoId);
  return (data ?? []).map((a) => ({
    papel: a.papel,
    usuarioId: a.usuario_id,
    nomeNoMomento: a.nome_no_momento,
    cargoNoMomento: a.cargo_no_momento,
    assinaturaPath: a.assinatura_path,
    assinadoEm: a.assinado_em,
  }));
}

export interface AssinaturaComImagem extends AssinaturaResumo {
  /** Signed URL (1h) da imagem salva em `assinaturaPath`, já resolvida — `null` quando o papel não
   * tem `assinaturaPath` (assinatura de antes desta mudança, mostra só texto). */
  assinaturaImagemSrc: string | null;
}

/** Resolve a signed URL de cada assinatura de uma vez (ver docs/superpowers/specs/2026-09-13-
 * assinatura-desenhada-design.md) — usada tanto pela tela (`BlocoAssinaturaDigital`) quanto pelos
 * PDFs, sempre logo depois de `buscarAssinaturas`, pra nenhum dos dois repetir essa resolução. */
export async function resolverImagensAssinaturas(
  supabase: ReturnType<typeof createClient>,
  assinaturas: AssinaturaResumo[],
): Promise<AssinaturaComImagem[]> {
  return Promise.all(
    assinaturas.map(async (a) => ({
      ...a,
      assinaturaImagemSrc: await getSignedAssinaturaUrl(supabase, a.assinaturaPath),
    })),
  );
}

/** Registra a assinatura de quem acabou de CRIAR o documento, sem pedir nenhuma confirmação (a
 * pessoa já acabou de preencher e enviar o formulário na mesma sessão). Usado dentro de outras
 * Server Actions (ex.: ao salvar o Relatório de Dispensa). As ações que chamam esta função já
 * travam a criação/envio ANTES disso quando a conta não tem assinatura cadastrada (ver
 * `possuiAssinaturaCadastrada`) — o `if` abaixo é uma segunda trava (defesa em profundidade): se
 * por qualquer motivo chegar aqui sem `assinatura_path`, a função não grava nada em vez de gravar
 * um registro só de texto, garantindo que nenhum caminho do sistema produz uma assinatura sem
 * imagem.
 */
export async function autoAssinarComoCreator(
  tipoDocumento: TipoDocumento,
  documentoId: string,
  papel: string,
  usuarioId: string,
): Promise<void> {
  const supabase = createClient();
  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, cargo, email, assinatura_path")
    .eq("id", usuarioId)
    .maybeSingle();
  if (!perfil?.assinatura_path) return;

  await supabase.from("assinaturas_documento").upsert(
    {
      tipo_documento: tipoDocumento,
      documento_id: documentoId,
      papel,
      usuario_id: usuarioId,
      nome_no_momento: perfil?.nome ?? perfil?.email ?? "—",
      cargo_no_momento: perfil?.cargo ?? null,
      assinatura_path: perfil.assinatura_path,
      assinado_em: new Date().toISOString(),
    },
    { onConflict: "tipo_documento,documento_id,papel" },
  );
}
