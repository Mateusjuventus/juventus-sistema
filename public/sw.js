// Service worker do Juventus SAF — só existe pra receber push (ver docs/superpowers/specs/
// 2026-08-28-assinatura-digital-notificacoes-design.md). De propósito NÃO faz cache de nada (não é
// um app offline) — só fica "dormindo" em segundo plano no navegador esperando um push chegar,
// mesmo com o site fechado.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let dados;
  try {
    dados = event.data.json();
  } catch {
    dados = { title: "Juventus SAF", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(dados.title || "Juventus SAF", {
      body: dados.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { link: dados.link || "/" },
    }),
  );
});

// Clicar na notificação foca uma aba já aberta do sistema, se tiver, senão abre uma nova na página
// do documento que precisa de assinatura.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ("focus" in janela) {
          janela.navigate(link);
          return janela.focus();
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
