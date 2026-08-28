"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PermissaoActionState } from "@/components/permissao-checkboxes-form";

/**
 * Nome/cargo da própria conta — usados na assinatura digital de documentos (ver docs/superpowers/
 * specs/2026-08-28-assinatura-digital-notificacoes-design.md): sem isso preenchido, a pessoa não
 * consegue assinar nada, já que o sistema não tinha nome de exibição nenhum até aqui (só e-mail).
 * Autoatendimento simples, igual ao resto de `/minha-conta` — sem aprovação de ninguém.
 */
export async function salvarMeuNomeCargo(
  _prevState: PermissaoActionState,
  formData: FormData,
): Promise<PermissaoActionState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const cargo = String(formData.get("cargo") ?? "").trim();
  if (!nome) return { error: "Preencha seu nome." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase
    .from("perfis")
    .update({ nome, cargo: cargo || null })
    .eq("id", user.id);
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/minha-conta");
  return { success: "Nome e cargo salvos." };
}

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
