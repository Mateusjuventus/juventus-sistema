import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

let configurado = false;

/** Configura o `web-push` uma vez por processo — as 3 variáveis vêm do painel (ver `.env.example`).
 * Se não estiverem definidas (ex.: instalação nova ainda sem VAPID gerado), envio de push vira
 * um no-op silencioso — o sino continua funcionando normalmente de qualquer jeito. */
function garantirConfigurado(): boolean {
  if (configurado) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configurado = true;
  return true;
}

/**
 * Envia push (Web Push nativo do navegador, sem SaaS terceiro — ver docs/superpowers/specs/
 * 2026-08-28-assinatura-digital-notificacoes-design.md) pra TODAS as inscrições salvas daquele
 * usuário (pode ter mais de um aparelho/navegador). "Melhor esforço" de propósito: quem nunca
 * aceitou push simplesmente não tem inscrição salva (nada acontece, sem erro); uma inscrição
 * expirada/revogada (código 404/410 do navegador) é removida do banco pra não tentar de novo à
 * toa nas próximas vezes.
 */
export async function enviarPushParaUsuario(
  usuarioId: string,
  payload: { titulo: string; corpo: string; link?: string },
): Promise<void> {
  if (!garantirConfigurado()) return;

  const supabase = createClient();
  const { data: inscricoes } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, chave_p256dh, chave_auth")
    .eq("usuario_id", usuarioId);
  if (!inscricoes || inscricoes.length === 0) return;

  const corpoPush = JSON.stringify({ title: payload.titulo, body: payload.corpo, link: payload.link ?? "/" });

  await Promise.all(
    inscricoes.map(async (inscricao) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: inscricao.endpoint,
            keys: { p256dh: inscricao.chave_p256dh, auth: inscricao.chave_auth },
          },
          corpoPush,
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", inscricao.id);
        }
      }
    }),
  );
}
