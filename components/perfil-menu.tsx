"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PersonIcon } from "@/components/department-icon";

/**
 * Menu suspenso de "Minha Conta" — fica ao lado do brasão/"Juventus - SAF" no cabeçalho (ver
 * `components/app-shell.tsx`), em toda página do sistema. Reúne "Minha Conta" e "Sair" num lugar
 * só; o botão "Sair" que antes ficava solto à direita do cabeçalho foi removido de lá — agora só
 * existe aqui, evitando duplicidade.
 *
 * Client Component porque precisa de estado aberto/fechado e fechar ao clicar fora — o e-mail
 * exibido já vem resolvido do server component pai, então nenhuma chamada extra é feita aqui.
 */
export function PerfilMenu({
  email,
  logoutAction,
}: {
  email: string | null;
  logoutAction: () => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10 hover:text-white"
        title={email ?? "Minha conta"}
        aria-label="Minha conta"
      >
        <PersonIcon className="h-5 w-5" />
      </button>

      {aberto ? (
        <div className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-md border border-neutral-200 bg-white text-left shadow-lg">
          {email ? (
            <p className="truncate border-b border-neutral-100 px-3 py-2 text-xs text-neutral-500">{email}</p>
          ) : null}
          <Link
            href="/minha-conta"
            onClick={() => setAberto(false)}
            className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Minha Conta
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
            >
              Sair
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
