"use server";

import { createClient } from "@/lib/supabase/server";

/** Guarda a inscrição de push que o navegador da pessoa acabou de gerar (`PushManager.subscribe`,
 * ver `components/push-opt-in.tsx`) — uma por aparelho/navegador, várias por usuário. */
export async function salvarInscricaoPush(inscricao: {
  endpoint: string;
  chaveP256dh: string;
  chaveAuth: string;
}): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      usuario_id: user.id,
      endpoint: inscricao.endpoint,
      chave_p256dh: inscricao.chaveP256dh,
      chave_auth: inscricao.chaveAuth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { error: error.message };
  return {};
}

export async function removerInscricaoPush(endpoint: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
