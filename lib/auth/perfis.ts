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

export interface ComissaoTecnicaParaSelecao {
  id: string;
  rotulo: string;
  /** Só presente na versão "Base" — categorias da pessoa vinculada, exibidas como referência
   * quando um login é vinculado a ela (ver docs/superpowers/specs/2026-09-13-acesso-por-categoria-
   * comissao-tecnica-design.md). */
  categorias?: string[];
}

/**
 * Lista da Comissão Técnica do Futebol Profissional, pra popular o `<select>` de "Vincular a
 * alguém da Comissão Técnica" no cadastro de usuário (`/usuarios`) — ver docs/superpowers/specs/
 * 2026-09-13-acesso-por-categoria-comissao-tecnica-design.md. Vincular faz o login passar a usar o
 * nome/função de lá (ao vivo) na hora de assinar documentos.
 */
export async function buscarComissaoTecnicaParaSelecao(
  supabase: ReturnType<typeof createClient>,
): Promise<ComissaoTecnicaParaSelecao[]> {
  const { data } = await supabase
    .from("comissao_tecnica")
    .select("id, nome_completo, funcao")
    .order("nome_completo", { ascending: true });
  return ((data ?? []) as { id: string; nome_completo: string; funcao: string }[]).map((p) => ({
    id: p.id,
    rotulo: `${p.nome_completo} — ${p.funcao}`,
  }));
}

/**
 * Mesma coisa que `buscarComissaoTecnicaParaSelecao`, mas pra Comissão Técnica do Futebol de Base —
 * aqui o vínculo também decide as categorias que o login pode ver/acessar (ver
 * `getCategoriasBasePermitidas` em `lib/auth/role.ts`), por isso retorna `categorias` também.
 */
export async function buscarComissaoTecnicaBaseParaSelecao(
  supabase: ReturnType<typeof createClient>,
): Promise<ComissaoTecnicaParaSelecao[]> {
  const { data } = await supabase
    .from("comissao_tecnica_base")
    .select("id, nome_completo, funcao, categorias")
    .order("nome_completo", { ascending: true });
  return ((data ?? []) as { id: string; nome_completo: string; funcao: string; categorias: string[] }[]).map(
    (p) => ({
      id: p.id,
      rotulo: `${p.nome_completo} — ${p.funcao}`,
      categorias: p.categorias,
    }),
  );
}
