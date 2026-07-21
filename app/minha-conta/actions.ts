"use server";

import { createClient } from "@/lib/supabase/server";
import type { PermissaoActionState } from "@/components/permissao-checkboxes-form";

/**
 * Troca a senha da PRÓPRIA conta de quem está logado — diferente de `redefinirSenha`
 * (`app/usuarios/actions.ts`), que usa o cliente admin pra mexer na senha de QUALQUER usuário e só
 * pode ser chamada por master. Aqui não precisa do cliente admin: `createClient()` já carrega a
 * sessão da própria pessoa (via cookies), e `supabase.auth.updateUser` só altera a conta dessa
 * sessão.
 */
export async function trocarMinhaSenha(
  _prevState: PermissaoActionState,
  formData: FormData,
): Promise<PermissaoActionState> {
  const novaSenha = String(formData.get("novaSenha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  if (novaSenha.length < 6) return { error: "A senha precisa ter pelo menos 6 caracteres." };
  if (novaSenha !== confirmarSenha) return { error: "As senhas digitadas não são iguais." };

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) return { error: `Não foi possível trocar a senha. Tente novamente. (${error.message})` };

  return { success: "Senha atualizada com sucesso." };
}
