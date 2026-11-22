"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  // Acesso pausado (perfis.ativo = false, ver app/usuarios/actions.ts) — pedido do Mateus em
  // 22/11/2026, SEM revelar que a conta foi desativada (mensagem neutra, não "conta pausada"). Desloga
  // de novo antes de recusar — senão a pessoa ficaria com uma sessão válida por um instante mesmo
  // barrada daqui (o middleware ainda cortaria no próximo request, mas só nesta tela dá pra avisar
  // sem criar sessão nenhuma).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("perfis")
    .select("ativo")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  if ((perfil as { ativo: boolean } | null)?.ativo === false) {
    await supabase.auth.signOut();
    return { error: "Não foi possível entrar. Fale com o administrador." };
  }

  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}
