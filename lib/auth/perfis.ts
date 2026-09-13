import type { createClient } from "@/lib/supabase/server";

export interface PerfilParaSelecao {
  id: string;
  rotulo: string;
}

/**
 * Nome de exibição da conta atualmente logada — nome preenchido em `/minha-conta`, com o e-mail
 * como retrato se ainda não tiver nome. Usado pra travar o campo "Solicitante" nas Solicitações
 * (ver docs/superpowers/specs/2026-09-13-solicitacoes-autoria-visibilidade-design.md): quem não é
 * Master sempre aparece como o próprio Solicitante, sem poder digitar outro nome. Retorna `null`
 * sem sessão (não deveria acontecer nas telas que chamam isto, que já exigem login).
 */
export async function nomeDaContaAtual(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("perfis").select("nome, email").eq("id", user.id).maybeSingle();
  const perfil = data as { nome: string | null; email: string } | null;
  return perfil?.nome?.trim() ? perfil.nome : (perfil?.email ?? user.email ?? null);
}

/**
 * Lista todo mundo com login no sistema, pra popular um `<select>` de "vincule este assinante a um
 * usuário" (ver docs/superpowers/specs/2026-08-28-assinatura-digital-notificacoes-design.md, Fase
 * 2 — configuração das assinaturas do Financeiro e do Parecer Final). Rótulo é o nome (preenchido
 * em `/minha-conta`) quando existe, senão o e-mail — mesmo fallback usado na assinatura em si.
 */
export async function buscarPerfisParaSelecao(
  supabase: ReturnType<typeof createClient>,
): Promise<PerfilParaSelecao[]> {
  const { data } = await supabase.from("perfis").select("id, nome, email").order("email", { ascending: true });
  return ((data ?? []) as { id: string; nome: string | null; email: string }[]).map((p) => ({
    id: p.id,
    rotulo: p.nome?.trim() ? p.nome : p.email,
  }));
}
