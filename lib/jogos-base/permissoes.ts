import type { createClient } from "@/lib/supabase/server";
import { getPerfilPermissoes, type PerfilPermissoes } from "@/lib/auth/role";
import { TODAS_CATEGORIAS_BASE, type CategoriaBase } from "@/lib/auth/categorias-base";
import { TODOS_MODULOS_BASE } from "@/lib/auth/modulos-base";
import { TODOS_DEPARTAMENTOS } from "@/lib/auth/departamentos";

/**
 * Categorias de `jogos_base` em que o usuário logado pode mexer na Convocação — mesmo raciocínio de
 * `lib/programacao/permissoes.ts` (RLS de `convocacoes_base`/`convocacao_atletas_base`/
 * `convocacao_comissao_base` é a policy genérica `authenticated_full_access`; a trava por categoria
 * é sempre em código, re-checada em toda action antes de gravar).
 *
 * Treinador só enxerga a(s) categoria(s) em que atua (`perfis.categorias_treinador`); Base (master,
 * ou regular com o departamento Futebol de Base e o módulo "Jogos" liberados) pode qualquer
 * categoria. Usado pela Server Action de convocação compartilhada entre `/base/jogos/[id]/
 * convocacao` e `/treinador/jogos/[id]/convocacao` (ver docs/superpowers/plans/2026-08-30-
 * treinador-programacao-plan.md, Fase 6).
 */
export function resolverCategoriasConvocacao(perfil: PerfilPermissoes | null): CategoriaBase[] {
  if (!perfil) return [];

  if (perfil.role === "treinador") {
    return (perfil.categorias_treinador ?? []) as CategoriaBase[];
  }

  if (perfil.role === "master") return TODAS_CATEGORIAS_BASE;

  const departamentos = perfil.departamentos_permitidos ?? TODOS_DEPARTAMENTOS;
  if (!departamentos.includes("futebol_base")) return [];

  const modulos = perfil.modulos_base_permitidos ?? TODOS_MODULOS_BASE;
  if (!(modulos as string[]).includes("jogos")) return [];

  return TODAS_CATEGORIAS_BASE;
}

/** Versão de `resolverCategoriasConvocacao` que já busca o perfil do usuário logado. */
export async function getCategoriasConvocacao(
  supabase: ReturnType<typeof createClient>,
): Promise<CategoriaBase[]> {
  const perfil = await getPerfilPermissoes(supabase);
  return resolverCategoriasConvocacao(perfil);
}
