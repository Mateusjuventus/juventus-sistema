import type { createClient } from "@/lib/supabase/server";
import type { PerfilRole } from "@/lib/supabase/types";

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
