import type { createClient } from "@/lib/supabase/server";
import { getPerfilPermissoes, type PerfilPermissoes } from "@/lib/auth/role";
import { TODAS_CATEGORIAS_BASE, type CategoriaBase } from "@/lib/auth/categorias-base";
import { TODOS_MODULOS_BASE } from "@/lib/auth/modulos-base";
import { TODOS_DEPARTAMENTOS } from "@/lib/auth/departamentos";

/**
 * Regra de categorias da Programação Semanal, separada da leitura em `perfis` só pra poder ser
 * testada sem precisar simular um client do Supabase (mesmo raciocínio de manter lógica pura
 * isolada de I/O usado no resto do projeto — ver `lib/programacao/permissoes.test.ts`).
 *
 * Treinador só enxerga a(s) categoria(s) em que atua (`perfis.categorias_treinador`); Base
 * (master, ou regular com o departamento Futebol de Base e o módulo "Programação" liberados)
 * enxerga as 7. Ver docs/superpowers/specs/2026-08-30-area-treinador-programacao-design.md,
 * "Permissões (RLS)" — esta função é a trava de verdade, chamada de novo em toda query/action
 * antes de ler/gravar; RLS nas tabelas `programacao_*` é só a mesma última linha de defesa
 * genérica que protege todas as outras tabelas `*_base` do sistema (policy única pra qualquer
 * usuário autenticado), não uma restrição por categoria.
 *
 * O módulo "Programação" (`/base/programacao`) já existe em `ModuloBaseChave` (ver
 * `lib/auth/modulos-base.ts`, Fase 8) — quem não é "master" só enxerga as 7 categorias depois de
 * ter esse módulo liberado em `/usuarios`.
 */
export function resolverCategoriasProgramacao(perfil: PerfilPermissoes | null): CategoriaBase[] {
  if (!perfil) return [];

  if (perfil.role === "treinador") {
    return (perfil.categorias_treinador ?? []) as CategoriaBase[];
  }

  if (perfil.role === "master") return TODAS_CATEGORIAS_BASE;

  const departamentos = perfil.departamentos_permitidos ?? TODOS_DEPARTAMENTOS;
  if (!departamentos.includes("futebol_base")) return [];

  const modulos = perfil.modulos_base_permitidos ?? TODOS_MODULOS_BASE;
  if (!(modulos as string[]).includes("programacao")) return [];

  return TODAS_CATEGORIAS_BASE;
}

/** Versão de `resolverCategoriasProgramacao` que já busca o perfil do usuário logado — usada pelas
 * queries/actions de verdade. */
export async function getCategoriasProgramacao(
  supabase: ReturnType<typeof createClient>,
): Promise<CategoriaBase[]> {
  const perfil = await getPerfilPermissoes(supabase);
  return resolverCategoriasProgramacao(perfil);
}
