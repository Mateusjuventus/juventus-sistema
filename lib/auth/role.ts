import type { createClient } from "@/lib/supabase/server";
import type { PerfilRole } from "@/lib/supabase/types";
import { TODOS_MODULOS, type ModuloChave } from "@/lib/auth/modulos";

/**
 * Papel do usuário atualmente logado. Se não estiver logado, ou não tiver uma linha em `perfis`
 * por algum motivo (não deveria acontecer em uso normal), trata como "regular" — nunca assume
 * "master" por padrão, já que essa checagem é o que decide quem pode excluir Entrada/Saída do
 * Estoque e acessar /usuarios.
 */
export async function getUserRole(supabase: ReturnType<typeof createClient>): Promise<PerfilRole> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "regular";

  const { data } = await supabase.from("perfis").select("role").eq("id", user.id).maybeSingle();
  return (data as { role: PerfilRole } | null)?.role ?? "regular";
}

export async function isMaster(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  return (await getUserRole(supabase)) === "master";
}

/**
 * Módulos que o usuário logado pode ver/acessar. "Master" sempre tem todos, independente do que
 * está salvo em `modulos_permitidos` (mesma regra do middleware, ver `lib/supabase/middleware.ts`).
 * Usado pra filtrar os cartões da Home (`app/profissional/page.tsx`) — a checagem que de fato
 * bloqueia o acesso é a do middleware, esta função só decide o que aparece na tela.
 */
export async function getModulosPermitidos(
  supabase: ReturnType<typeof createClient>,
): Promise<ModuloChave[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("perfis")
    .select("role, modulos_permitidos")
    .eq("id", user.id)
    .maybeSingle();

  const perfil = data as { role: PerfilRole; modulos_permitidos: string[] | null } | null;
  if (!perfil) return [];
  if (perfil.role === "master") return TODOS_MODULOS;
  return (perfil.modulos_permitidos ?? TODOS_MODULOS) as ModuloChave[];
}
