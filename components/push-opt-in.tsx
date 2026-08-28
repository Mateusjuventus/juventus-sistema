"use client";

import { useEffect, useState } from "react";
import { salvarInscricaoPush } from "@/lib/push/inscricao-actions";

// Conversão padrão da chave pública VAPID (base64url) pro formato que `PushManager.subscribe`
// espera (Uint8Array) — não tem isso pronto na API do navegador, é sempre esse mesmo trechinho em
// qualquer implementação de Web Push.
function base64UrlParaUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(base64);
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)));
}

/**
 * Convite pra ativar push no aparelho (ver docs/superpowers/specs/
 * 2026-08-28-assinatura-digital-notificacoes-design.md) — some sozinho se o navegador não suporta,
 * se a pessoa já ativou, ou se já recusou antes (não fica insistindo). No iPhone, só funciona depois
 * de instalar o site na Tela de Início — o aviso abaixo do botão deixa isso claro.
 */
export function PushOptIn() {
  const [estado, setEstado] = useState<"verificando" | "pode_ativar" | "ativando" | "ativado" | "indisponivel">(
    "verificando",
  );
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function verificar() {
      const suportado =
        typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!suportado || Notification.permission === "denied") {
        setEstado("indisponivel");
        return;
      }
      const registro = await navigator.serviceWorker.register("/sw.js");
      const inscricaoExistente = await registro.pushManager.getSubscription();
      setEstado(inscricaoExistente ? "ativado" : "pode_ativar");
    }
    verificar().catch(() => setEstado("indisponivel"));
  }, []);

  async function ativar() {
    const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!chavePublica) {
      setErro("Notificação por push ainda não está configurada no servidor.");
      return;
    }
    setEstado("ativando");
    setErro(null);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado("indisponivel");
        return;
      }
      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlParaUint8Array(chavePublica) as BufferSource,
      });
      const chaves = inscricao.toJSON().keys;
      const resultado = await salvarInscricaoPush({
        endpoint: inscricao.endpoint,
        chaveP256dh: chaves?.p256dh ?? "",
        chaveAuth: chaves?.auth ?? "",
      });
      if (resultado.error) {
        setErro(resultado.error);
        setEstado("pode_ativar");
        return;
      }
      setEstado("ativado");
    } catch {
      setErro("Não foi possível ativar as notificações agora.");
      setEstado("pode_ativar");
    }
  }

  if (estado === "verificando" || estado === "indisponivel" || estado === "ativado") return null;

  return (
    <div className="rounded-md border border-dourado/40 bg-dourado/10 px-3 py-2 text-xs">
      <p className="text-neutral-700">Receba um aviso no celular quando tiver algo pra assinar.</p>
      <button
        type="button"
        onClick={() => void ativar()}
        disabled={estado === "ativando"}
        className="mt-1 font-semibold text-grena hover:underline disabled:opacity-50"
      >
        {estado === "ativando" ? "Ativando..." : "Ativar notificações"}
      </button>
      {erro ? <p className="mt-1 text-red-700">{erro}</p> : null}
      <p className="mt-1 text-neutral-400">No iPhone, só funciona depois de instalar (Adicionar à Tela de Início).</p>
    </div>
  );
}
