import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a service_role key — ignora todas as políticas de RLS (linha a linha).
 *
 * Usos permitidos, e só estes dois:
 * 1. Fluxo de cadastro público de Staff Operacional (app/cadastro-staff), que precisa ler o
 *    catálogo de funções e gravar o cadastro sem uma sessão de usuário autenticado (a pessoa
 *    preenche o link sem fazer login).
 * 2. Gerenciamento de usuários (app/usuarios/actions.ts) — criar login de um novo usuário
 *    (supabase.auth.admin.createUser) e gravar/alterar o papel dele em `perfis`, já que essa
 *    tabela de propósito não tem política de insert/update para usuários autenticados comuns (só
 *    select) — a única forma seria mesmo por aqui. TODA ação que usa este cliente pra isso precisa
 *    primeiro conferir com `isMaster()` (lib/auth/role.ts) que quem está chamando é master.
 *
 * NÃO usar este cliente em nenhum outro lugar do sistema, e NUNCA importar este arquivo em um
 * componente "use client" — a service_role key só pode existir no servidor.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione essa variável de ambiente (painel do " +
        "Supabase → Project Settings → API → service_role) antes de usar o cadastro público.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
