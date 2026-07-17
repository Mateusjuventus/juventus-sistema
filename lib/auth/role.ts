import type { createClient } from "@/lib/supabase/server";
import type { PerfilRole } from "@/lib/supabase/types";
import { TODOS_MODULOS, type ModuloChave } from "@/lib/auth/modulos";
import { TODOS_DEPARTAMENTOS, type DepartamentoChave } from "@/lib/auth/departamentos";
import { TODAS_TAREFA_CATEGORIAS } from "@/lib/auth/tarefas-categorias";
import { TODAS_ESTOQUE_CATEGORIAS } from "@/lib/auth/estoque-categorias";

interface PerfilPermissoes {
  role: PerfilRole;
  modulos_permitidos: string[] | null;
  departamentos_permitidos: string[] | null;
  tarefas_categorias_visiveis: string[] | null;
  estoque_categorias_permitidas: string[] | null;
}

/** Uma única leitura de `perfis` com tudo que as funções abaixo precisam — evita repetir a mesma
 * query quando mais de uma checagem é feita na mesma página. */
async function getPerfilPermissoes(
  supabase: ReturnType<typeof createClient>,
): Promise<PerfilPermissoes | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("perfis")
    .select(
      "role, modulos_permitidos, departamentos_permitidos, tarefas_categorias_visiveis, estoque_categorias_permitidas",
    )
    .eq("id", user.id)
    .maybeSingle();

  return data as PerfilPermissoes | null;
}

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
 * Ramificações do módulo Estoque (Esportivo / Médico) que o usuário logado pode acessar. Ao
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
