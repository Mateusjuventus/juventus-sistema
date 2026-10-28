import type { createClient } from "@/lib/supabase/server";
import { resolverNomeCargoParaAssinatura } from "@/lib/assinaturas/nome-cargo";
import type { CategoriaComissaoTecnica } from "@/lib/auth/categorias-base";

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
  /** Categorias da pessoa vinculada (desde a unificação — ver docs/superpowers/specs/2026-10-28-
   * unificacao-comissao-tecnica-design.md — toda pessoa da Comissão Técnica tem pelo menos uma:
   * "profissional" e/ou as da Base), exibidas como referência quando um login é vinculado a ela
   * (ver docs/superpowers/specs/2026-09-13-acesso-por-categoria-comissao-tecnica-design.md). */
  categorias: CategoriaComissaoTecnica[];
}

/**
 * Lista única da Comissão Técnica (Profissional + Base, já unificadas — ver docs/superpowers/specs/
 * 2026-10-28-unificacao-comissao-tecnica-design.md), pra popular o `<select>` de "Vincular a alguém
 * da Comissão Técnica" no cadastro de usuário (`/usuarios`) — ver docs/superpowers/specs/
 * 2026-09-13-acesso-por-categoria-comissao-tecnica-design.md. Vincular faz o login passar a usar o
 * nome/função de lá (ao vivo) na hora de assinar documentos; pra quem tem departamento da Base
 * liberado, também decide as categorias que o login pode ver/acessar (ver
 * `getCategoriasBasePermitidas` em `lib/auth/role.ts`).
 */
export async function buscarComissaoTecnicaParaSelecao(
  supabase: ReturnType<typeof createClient>,
): Promise<ComissaoTecnicaParaSelecao[]> {
  const { data } = await supabase
    .from("comissao_tecnica")
    .select("id, nome_completo, funcao, categorias")
    .order("nome_completo", { ascending: true });
  return (
    (data ?? []) as { id: string; nome_completo: string; funcao: string; categorias: CategoriaComissaoTecnica[] }[]
  ).map((p) => ({
    id: p.id,
    rotulo: `${p.nome_completo} — ${p.funcao}`,
    categorias: p.categorias,
  }));
}

export interface PessoaAcompanhadaParaSelecao {
  id: string;
  nome: string;
}

/**
 * Lista de quem está marcado "Acompanhar no painel de Demandas" (ver `/usuarios` e
 * `app/demandas/page.tsx`) — popula o `<select>` de "pra quem é essa demanda" que só o master vê
 * no painel flutuante (pedido do Mateus em 05/10: "eu como master posso colocar demanda pra eles
 * também"). Nome resolvido via `resolverNomeCargoParaAssinatura` — vínculo com a Comissão Técnica
 * (já unificada) quando existe, senão `perfis.nome`/e-mail.
 */
export async function buscarPessoasAcompanhadasParaSelecao(
  supabase: ReturnType<typeof createClient>,
): Promise<PessoaAcompanhadaParaSelecao[]> {
  const { data } = await supabase
    .from("perfis")
    .select("id, nome, email, comissao_tecnica_id")
    .eq("demandas_acompanhado", true)
    .order("email", { ascending: true });
  const perfis = (data ?? []) as {
    id: string;
    nome: string | null;
    email: string;
    comissao_tecnica_id: string | null;
  }[];
  return Promise.all(
    perfis.map(async (p) => {
      const { nome } = await resolverNomeCargoParaAssinatura(supabase, {
        nome: p.nome,
        cargo: null,
        comissao_tecnica_id: p.comissao_tecnica_id,
      });
      return { id: p.id, nome: nome ?? p.email };
    }),
  );
}
