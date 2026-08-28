"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TipoDocumento } from "./config";

export interface AssinarState {
  error?: string;
}

/**
 * Assina um papel de um documento (ver docs/superpowers/specs/2026-08-28-assinatura-digital-
 * notificacoes-design.md) — exige confirmar a senha de novo (reautenticação: garante que foi a
 * própria pessoa logada, não alguém com a sessão aberta no aparelho dela). Não desenha nada: o
 * registro em si (nome + cargo + data/hora) É a assinatura.
 *
 * `nome_no_momento`/`cargo_no_momento` são um retrato de `perfis.nome`/`cargo` no instante da
 * assinatura — precisam estar preenchidos ANTES (em `/minha-conta`), senão a ação recusa e explica
 * onde preencher, em vez de inventar um nome genérico.
 */
export async function assinarDocumento(
  tipoDocumento: TipoDocumento,
  documentoId: string,
  papel: string,
  caminhoRevalidar: string,
  _prevState: AssinarState,
  formData: FormData,
): Promise<AssinarState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sessão expirada. Faça login novamente." };

  const senha = String(formData.get("senha") ?? "");
  if (!senha) return { error: "Digite sua senha pra confirmar." };
  const { error: erroSenha } = await supabase.auth.signInWithPassword({ email: user.email, password: senha });
  if (erroSenha) return { error: "Senha incorreta." };

  const { data: perfil } = await supabase.from("perfis").select("nome, cargo").eq("id", user.id).maybeSingle();
  if (!perfil?.nome) {
    return { error: "Preencha seu nome em Minha Conta antes de assinar." };
  }

  const { error } = await supabase.from("assinaturas_documento").upsert(
    {
      tipo_documento: tipoDocumento,
      documento_id: documentoId,
      papel,
      usuario_id: user.id,
      nome_no_momento: perfil.nome,
      cargo_no_momento: perfil.cargo,
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
  assinadoEm: string;
}

export async function buscarAssinaturas(tipoDocumento: TipoDocumento, documentoId: string): Promise<AssinaturaResumo[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("assinaturas_documento")
    .select("papel, usuario_id, nome_no_momento, cargo_no_momento, assinado_em")
    .eq("tipo_documento", tipoDocumento)
    .eq("documento_id", documentoId);
  return (data ?? []).map((a) => ({
    papel: a.papel,
    usuarioId: a.usuario_id,
    nomeNoMomento: a.nome_no_momento,
    cargoNoMomento: a.cargo_no_momento,
    assinadoEm: a.assinado_em,
  }));
}

/** Registra a assinatura de quem acabou de CRIAR o documento, sem pedir senha de novo (a pessoa já
 * acabou de se autenticar preenchendo e enviando o formulário na mesma sessão — pedir senha de
 * novo no mesmo instante seria só atrito). Usado dentro de outras Server Actions (ex.: ao salvar o
 * Relatório de Dispensa). Se a pessoa ainda não tiver nome salvo em `/minha-conta`, grava mesmo
 * assim usando o e-mail como retrato — melhor que travar a criação do documento por causa disso;
 * ela ainda pode ir em `/minha-conta` depois e a assinatura permanece com o retrato antigo.
 */
export async function autoAssinarComoCreator(
  tipoDocumento: TipoDocumento,
  documentoId: string,
  papel: string,
  usuarioId: string,
): Promise<void> {
  const supabase = createClient();
  const { data: perfil } = await supabase.from("perfis").select("nome, cargo, email").eq("id", usuarioId).maybeSingle();
  await supabase.from("assinaturas_documento").upsert(
    {
      tipo_documento: tipoDocumento,
      documento_id: documentoId,
      papel,
      usuario_id: usuarioId,
      nome_no_momento: perfil?.nome ?? perfil?.email ?? "—",
      cargo_no_momento: perfil?.cargo ?? null,
      assinado_em: new Date().toISOString(),
    },
    { onConflict: "tipo_documento,documento_id,papel" },
  );
}
