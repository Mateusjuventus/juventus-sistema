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

/** Quanto tempo (ms) esperar por UM envio de push antes de desistir e seguir em frente. Curto de
 * propósito (era 8000 antes) — uma entrega de push de verdade normalmente termina bem abaixo de 1s;
 * esse limite só existe pra cobrir o caso raro de endpoint travado, então não precisa ser generoso a
 * ponto de virar ele mesmo o motivo de "salvar" demorar (pedido do Mateus de 16/09). */
export const TIMEOUT_ENVIO_PUSH_MS = 3000;

/**
 * Corre `promessa` contra um limite de tempo e resolve assim que UM dos dois terminar primeiro —
 * nunca rejeita por causa do timeout (só "desiste de esperar"). Extraído como função pura, testável
 * sem precisar simular o `web-push`/Supabase de verdade (mesmo raciocínio de
 * `resolverCategoriasBasePermitidas` em `lib/auth/role.ts`: separar a parte que dá pra testar sem
 * montar um client inteiro).
 *
 * Por que isso existe: `webpush.sendNotification` faz uma chamada HTTPS de verdade pro navegador/
 * sistema operacional de quem vai receber o push, sem nenhum timeout próprio — um endpoint lento,
 * inacessível ou com rede instável podia deixar essa promessa pendurada por muito tempo (minutos,
 * dependendo da rede). Como `criarNotificacao` é chamada de DENTRO de outras Server Actions (ex.:
 * `createSolicitacao` ao criar uma solicitação) e o código sempre esperou (`await`) o push terminar
 * antes de seguir pro resto do fluxo (gravar os itens, `redirect`...), esse pendurado travava a
 * ação inteira — parecia que "clicar em Cadastrar carrega e não salva", mesmo a solicitação já tendo
 * sido inserida no banco alguns passos antes. O comentário logo abaixo já dizia que envio de push é
 * "melhor esforço, nunca bloqueia" — faltava só isso aqui pra ser verdade de fato.
 */
export function comTimeout<T>(promessa: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    let resolvido = false;
    const finalizar = (valor?: T) => {
      if (resolvido) return;
      resolvido = true;
      resolve(valor);
    };
    promessa.then((valor) => finalizar(valor), () => finalizar(undefined));
    setTimeout(() => finalizar(undefined), ms);
  });
}

/**
 * Envia push (Web Push nativo do navegador, sem SaaS terceiro — ver docs/superpowers/specs/
 * 2026-08-28-assinatura-digital-notificacoes-design.md) pra TODAS as inscrições salvas daquele
 * usuário (pode ter mais de um aparelho/navegador). "Melhor esforço" de propósito: quem nunca
 * aceitou push simplesmente não tem inscrição salva (nada acontece, sem erro); uma inscrição
 * expirada/revogada (código 404/410 do navegador) é removida do banco pra não tentar de novo à
 * toa nas próximas vezes. Cada envio corre contra `TIMEOUT_ENVIO_PUSH_MS` (`comTimeout` acima) —
 * quem chamou nunca fica esperando mais que isso, mesmo que o envio em si (e a limpeza da inscrição
 * expirada, se for o caso) sigam rodando sozinhos em segundo plano depois disso.
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
      const envio = webpush
        .sendNotification(
          {
            endpoint: inscricao.endpoint,
            keys: { p256dh: inscricao.chave_p256dh, auth: inscricao.chave_auth },
          },
          corpoPush,
        )
        .catch(async (err) => {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", inscricao.id);
          }
        });
      await comTimeout(envio, TIMEOUT_ENVIO_PUSH_MS);
    }),
  );
}
