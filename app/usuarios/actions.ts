"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMaster } from "@/lib/auth/role";
import type { PerfilRole } from "@/lib/supabase/types";

export interface UsuarioFormState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

function parseRole(formData: FormData): PerfilRole {
  return formData.get("role") === "master" ? "master" : "regular";
}

/**
 * Cria o login de um novo usuário (e-mail + senha provisória, sem depender de envio de e-mail) e
 * já grava o papel dele em `perfis`. Só pode ser chamada por quem já é master — checa isso antes
 * de qualquer coisa. O e-mail/senha precisam ser repassados pra pessoa por fora do sistema (ex.:
 * WhatsApp); ela consegue trocar a senha depois, uma vez logada.
 */
export async function criarUsuario(
  _prevState: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const role = parseRole(formData);
  const raw = { email, role };

  const fieldErrors: Record<string, string> = {};
  if (!email) fieldErrors.email = "E-mail é obrigatório";
  if (senha.length < 6) fieldErrors.senha = "A senha provisória precisa ter pelo menos 6 caracteres";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values: raw };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (error || !data.user) {
    const jaExiste = error?.message?.toLowerCase().includes("already") ?? false;
    return {
      error: jaExiste ? "Já existe um usuário cadastrado com esse e-mail." : "Não foi possível criar o usuário. Tente novamente.",
      values: raw,
    };
  }

  const { error: perfilError } = await admin
    .from("perfis")
    .insert({ id: data.user.id, email, role });
  if (perfilError) {
    return {
      error: "O login foi criado, mas houve um problema ao salvar o papel dele. Tente novamente ou avise o suporte.",
      values: raw,
    };
  }

  revalidatePath("/usuarios");
  return { success: `Usuário ${email} criado com sucesso.`, values: {} };
}

/** Troca o papel (master/regular) de um usuário já existente. Só master pode chamar. */
export async function atualizarPapel(formData: FormData): Promise<void> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const role = parseRole(formData);

  const admin = createAdminClient();
  await admin.from("perfis").update({ role }).eq("id", id);

  revalidatePath("/usuarios");
}
