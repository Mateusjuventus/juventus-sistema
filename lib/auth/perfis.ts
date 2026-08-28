import type { createClient } from "@/lib/supabase/server";

export interface PerfilParaSelecao {
  id: string;
  rotulo: string;
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
