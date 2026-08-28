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
 * design.md) — hoje só avisa sobre documentos esperando assinatura. Diferente de "Avisos"
 * (`/avisos`, prazos de checklist/competições): isso aqui é um dropdown pequeno no rodapé da
 * sidebar, não uma tela própria — pensado pra pendência pessoal ("algo espera VOCÊ"), não pauta do
 * departamento inteiro.
 */
export function SinoNotificacoes({ notificacoes, caminhoAtual }: { notificacoes: NotificacaoResumo[]; caminhoAtual: string }) {
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
        <div className="absolute bottom-full left-0 z-20 mb-2 w-72 overflow-hidden rounded-md border border-neutral-200 bg-white text-left shadow-lg">
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
        </div>
      ) : null}
    </div>
  );
}
