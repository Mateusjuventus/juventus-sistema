import * as React from "react";
import { createClient as criarClientePadrao, type createClient } from "@/lib/supabase/server";
import type { PerfilRole } from "@/lib/supabase/types";

// `React.cache` só existe na versão de "react" que o Next.js usa por baixo dos panos pra
// Server Components (o `react` 18.3 instalado como dependência comum não exporta isso) — nos
// testes (vitest, fora do pipeline de build do Next) `React.cache` vem `undefined`. Em vez de
// quebrar a suíte de teste inteira por causa disso, cai pra uma versão sem cache nenhum (chama a
// função direto, toda vez) quando `cache` não existir — só perde a otimização de deduplicar a
// query por request, não quebra nada.
const cache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof React.cache === "function" ? React.cache : (fn) => fn;
import { TODOS_MODULOS, type ModuloChave } from "@/lib/auth/modulos";
import { TODOS_MODULOS_BASE, type ModuloBaseChave } from "@/lib/auth/modulos-base";
import { TODOS_DEPARTAMENTOS, type DepartamentoChave } from "@/lib/auth/departamentos";
import { TODAS_TAREFA_CATEGORIAS } from "@/lib/auth/tarefas-categorias";
import { TODAS_ESTOQUE_CATEGORIAS } from "@/lib/auth/estoque-categorias";

export interface PerfilPermissoes {
  role: PerfilRole;
  modulos_permitidos: string[] | null;
  modulos_base_permitidos: string[] | null;
  departamentos_permitidos: string[] | null;
  tarefas_categorias_visiveis: string[] | null;
  estoque_categorias_permitidas: string[] | null;
  categorias_treinador: string[] | null;
}

/** Uma única leitura de `perfis` com tudo que as funções abaixo precisam — evita repetir a mesma
 * query quando mais de uma checagem é feita na mesma página. Exportada pra módulos que precisam
 * combinar mais de um campo de uma vez (ex.: `lib/programacao/permissoes.ts`) sem repetir a
 * query uma vez por campo.
 *
 * A busca de verdade (`buscarPerfilPermissoes` abaixo) é memoizada por request com `cache()` do
 * React — o AppShell, o middleware^ e a própria página muitas vezes checam permissão mais de uma
 * vez na mesma navegação (cada `get*Permitidos`/`isMaster`/`getCategoriasProgramacao` chama isto
 * por baixo), e sem memoizar isso vira uma query em `perfis` repetida 4-5x por carregamento de
 * tela — parte do que deixava o sistema "lento em geral" (ver auditoria de performance de
 * 01/09/2026). Por isso ignoramos de propósito o `supabase` recebido aqui e criamos um cliente
 * novo por dentro: `cache()` do React só deduplica quando os argumentos são os mesmos, e cada
 * Server Component que chama `createClient()` ganha uma instância nova — usar sempre a mesma
 * função sem argumento (que lê os cookies da request, iguais em qualquer client criado durante o
 * mesmo request) é o que faz a deduplicação funcionar de verdade.
 * ^ (o middleware roda em Edge, fora do escopo de `cache()` do React — lá a otimização é outra,
 * ver o comentário em `lib/supabase/middleware.ts`.)
 */
export async function getPerfilPermissoes(
  _supabase: ReturnType<typeof createClient>,
): Promise<PerfilPermissoes | null> {
  return buscarPerfilPermissoes();
}

const buscarPerfilPermissoes = cache(async (): Promise<PerfilPermissoes | null> => {
  const supabase = criarClientePadrao();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("perfis")
    .select(
      "role, modulos_permitidos, modulos_base_permitidos, departamentos_permitidos, tarefas_categorias_visiveis, estoque_categorias_permitidas, categorias_treinador",
    )
    .eq("id", user.id)
    .maybeSingle();

  return data as PerfilPermissoes | null;
});

/**
 * Papel do usuário atualmente logado. Se não estiver logado, ou não tiver uma linha em `perfis`
 * por algum motivo (não deveria acontecer em uso normal), trata como "regular" — nunca assume
 * "master" por padrão, já que essa checagem é o que decide quem pode excluir Entrada/Saída do
 * Estoque e acessar /usuarios.
 */
export async function getUserRole(supabase: ReturnType<typeof createClient>): Promise<PerfilRole> {
  const perfil = await getPerfilPermissoes(supabase);
  return perfil?.role ?? "regular";
}

export async function isMaster(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  return (await getUserRole(supabase)) === "master";
}

/**
 * Categorias que o Treinador logado pode ver/agir na Captação — vazio se não estiver logado, ou
 * se o papel não for "treinador" (evita um "regular" acidentalmente cair em telas de Treinador só
 * porque `categorias_treinador` ficou preenchida de um uso anterior do perfil). Ver
 * docs/superpowers/specs/2026-08-19-parecer-final-treinador-design.md.
 */
export async function getCategoriasTreinador(
  supabase: ReturnType<typeof createClient>,
): Promise<string[]> {
  const perfil = await getPerfilPermissoes(supabase);
  if (!perfil || perfil.role !== "treinador") return [];
  return perfil.categorias_treinador ?? [];
}

/**
 * Departamentos (Futebol Profissional / Futebol de Base) que o usuário logado pode ver/acessar.
 * "Master" sempre tem os dois. Usado pra filtrar os cartões da tela inicial (`app/page.tsx`) — a
 * checagem que de fato bloqueia o acesso é a do middleware.
 */
export async function getDepartamentosPermitidos(
  supabase: ReturnType<typeof createClient>,
): Promise<DepartamentoChave[]> {
  const perfil = await getPerfilPermissoes(supabase);
  if (!perfil) return [];
  if (perfil.role === "master") return TODOS_DEPARTAMENTOS;
  return (perfil.departamentos_permitidos ?? TODOS_DEPARTAMENTOS) as DepartamentoChave[];
}

/**
 * Módulos que o usuário logado pode ver/acessar dentro do Futebol Profissional. "Master" sempre
 * tem todos, independente do que está salvo em `modulos_permitidos` (mesma regra do middleware,
 * ver `lib/supabase/middleware.ts`). Quem não tem o departamento "futebol_profissional" liberado
 * não tem nenhum módulo, independente de `modulos_permitidos` — todos os módulos de hoje são desse
 * departamento. Usado pra filtrar os cartões da Home do departamento (`app/profissional/page.tsx`)
 * e o menu superior (`components/app-shell.tsx`).
 */
export async function getModulosPermitidos(
  supabase: ReturnType<typeof createClient>,
): Promise<ModuloChave[]> {
  const perfil = await getPerfilPermissoes(supabase);
  if (!perfil) return [];
  if (perfil.role === "master") return TODOS_MODULOS;

  const departamentos = perfil.departamentos_permitidos ?? TODOS_DEPARTAMENTOS;
  if (!departamentos.includes("futebol_profissional")) return [];

  return (perfil.modulos_permitidos ?? TODOS_MODULOS) as ModuloChave[];
}

/**
 * Módulos que o usuário logado pode ver/acessar dentro do Futebol de Base. Espelha
 * `getModulosPermitidos()`: "master" sempre tem todos; quem não tem o departamento
 * "futebol_base" liberado não tem nenhum módulo de Base, independente do que está salvo em
 * `modulos_base_permitidos`. Usado pra filtrar os cartões da Home do departamento
 * (`app/base/page.tsx`) e o menu superior (`components/app-shell.tsx`).
 */
export async function getModulosBasePermitidos(
  supabase: ReturnType<typeof createClient>,
): Promise<ModuloBaseChave[]> {
  const perfil = await getPerfilPermissoes(supabase);
  if (!perfil) return [];
  if (perfil.role === "master") return TODOS_MODULOS_BASE;

  const departamentos = perfil.departamentos_permitidos ?? TODOS_DEPARTAMENTOS;
  if (!departamentos.includes("futebol_base")) return [];

  return (perfil.modulos_base_permitidos ?? TODOS_MODULOS_BASE) as ModuloBaseChave[];
}

/**
 * Categorias de Tarefas (Logística, Registro, Financeiro, Solicitações, Gerais) que aparecem como
 * aba em `/tarefas` pra esse usuário. É só preferência de exibição — a lista de tarefas continua
 * compartilhada entre todo mundo, isto não bloqueia nada, só filtra o que aparece (ver
 * `lib/auth/tarefas-categorias.ts`).
 */
export async function getCategoriasTarefasVisiveis(
  supabase: ReturnType<typeof createClient>,
): Promise<string[]> {
  const perfil = await getPerfilPermissoes(supabase);
  if (!perfil) return TODAS_TAREFA_CATEGORIAS;
  return perfil.tarefas_categorias_visiveis ?? TODAS_TAREFA_CATEGORIAS;
}

/**
 * Ramificações do módulo Estoque (Esportivo / Medicamentos / Materiais) que o usuário logado pode acessar. Ao
 * contrário de `getCategoriasTarefasVisiveis`, isto É uma permissão de acesso de verdade — quem
 * não tiver uma delas aqui não entra em `/estoque/<categoria>` (ver
 * `lib/supabase/middleware.ts`). "Master" sempre tem as duas.
 */
export async function getEstoqueCategoriasPermitidas(
  supabase: ReturnType<typeof createClient>,
): Promise<string[]> {
  const perfil = await getPerfilPermissoes(supabase);
  if (!perfil) return [];
  if (perfil.role === "master") return TODAS_ESTOQUE_CATEGORIAS;
  return perfil.estoque_categorias_permitidas ?? TODAS_ESTOQUE_CATEGORIAS;
}
