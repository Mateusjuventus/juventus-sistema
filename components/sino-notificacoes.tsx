"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellIcon } from "@/components/department-icon";
import { marcarNotificacaoComoLida, marcarTodasComoLidas } from "@/lib/notificacoes/actions";

export interface NotificacaoResumo {
  id: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  criadoEm: string;
}

function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/**
 * Sino de notificações (ver docs/superpowers/specs/2026-08-28-assinatura-digital-notificacoes-
 * design.md) — avisa sobre documentos esperando assinatura. Também dá acesso a "Avisos" (`/avisos`,
 * prazos de checklist/competições) via `linkAvisos` — antes era um link à parte na sidebar, mas
 * ficava um segundo sino do lado do sino de notificações pessoais (mesmo ícone, dois botões
 * parecidos e colados). Unificado num só sino (29/08): a lista de notificações pessoais continua
 * como estava, e "Ver quadro de avisos" vira uma linha no rodapé do dropdown.
 *
 * `abrirPara`: "cima" (padrão) é pro uso original, no rodapé da sidebar — "baixo" é pra quando o
 * sino fica no TOPO da tela (ex.: cabeçalho da área do Treinador, Fase 3), senão o dropdown
 * nasceria pra fora da tela.
 */
export function SinoNotificacoes({
  notificacoes,
  caminhoAtual,
  abrirPara = "cima",
  linkAvisos = false,
}: {
  notificacoes: NotificacaoResumo[];
  caminhoAtual: string;
  abrirPara?: "cima" | "baixo";
  /** Mostra "Ver quadro de avisos" no rodapé do dropdown, linkando pra `/avisos`. Só faz sentido
   * onde essa tela existe (Futebol Profissional, dentro do AppShell padrão) — por isso opcional. */
  linkAvisos?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Notificações"
        title="Notificações"
      >
        <BellIcon className="h-5 w-5" />
        {naoLidas > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-dourado px-1 text-[10px] font-bold text-grena-escuro">
            {naoLidas}
          </span>
        ) : null}
      </button>

      {aberto ? (
        <div
          className={`absolute left-0 z-20 w-72 overflow-hidden rounded-md border border-neutral-200 bg-white text-left shadow-lg ${
            abrirPara === "baixo" ? "top-full mt-2" : "bottom-full mb-2"
          }`}
        >
          <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Notificações</p>
            {naoLidas > 0 ? (
              <button
                type="button"
                onClick={() => void marcarTodasComoLidas(caminhoAtual)}
                className="text-xs font-medium text-grena hover:underline"
              >
                Marcar todas como lidas
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-neutral-400">Nenhuma notificação por aqui.</p>
            ) : (
              notificacoes.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "#"}
                  onClick={() => {
                    setAberto(false);
                    if (!n.lida) void marcarNotificacaoComoLida(n.id, caminhoAtual);
                  }}
                  className={`block border-b border-neutral-50 px-3 py-2 text-sm last:border-0 hover:bg-neutral-50 ${
                    n.lida ? "text-neutral-500" : "font-medium text-neutral-800"
                  }`}
                >
                  <p>{n.mensagem}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">{formatarDataHora(n.criadoEm)}</p>
                </Link>
              ))
            )}
          </div>
          {linkAvisos ? (
            <Link
              href="/avisos"
              onClick={() => setAberto(false)}
              className="block border-t border-neutral-100 px-3 py-2 text-center text-xs font-medium text-grena hover:underline"
            >
              Ver quadro de avisos
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
