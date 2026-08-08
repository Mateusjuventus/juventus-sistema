"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PersonIcon } from "@/components/department-icon";

/** Dropdown com "Minha Conta"/"Sair", compartilhado pelas duas variantes abaixo — cada uma só
 * muda o gatilho (botão redondo vs. rodapé da sidebar) e onde o menu se ancora. */
function useMenuSuspenso() {
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

  return { aberto, setAberto, containerRef };
}

function IniciaisDoEmail(email: string | null): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "";
  const partes = local.split(/[._-]+/).filter(Boolean);
  const iniciais = partes.length >= 2 ? partes[0][0] + partes[1][0] : local.slice(0, 2);
  return iniciais.toUpperCase();
}

/**
 * Menu suspenso de "Minha Conta" — variante compacta (círculo com ícone de pessoa), usada em
 * lugares fora da sidebar principal. Reúne "Minha Conta" e "Sair" num lugar só.
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
  const { aberto, setAberto, containerRef } = useMenuSuspenso();

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

/**
 * Variante do menu "Minha Conta" pro rodapé da sidebar (ver `components/app-sidebar.tsx`) — linha
 * inteira com avatar (iniciais do e-mail) + e-mail, em vez do círculo compacto. O sistema não
 * guarda nome de exibição do usuário (só `perfis.email`, ver `lib/supabase/types.ts`), então o
 * avatar e o texto usam o e-mail mesmo — igual à variante compacta.
 */
export function PerfilMenuSidebar({
  email,
  logoutAction,
}: {
  email: string | null;
  logoutAction: () => Promise<void>;
}) {
  const { aberto, setAberto, containerRef } = useMenuSuspenso();

  return (
    <div ref={containerRef} className="relative border-t border-white/10 p-3">
      {aberto ? (
        <div className="absolute bottom-full left-3 z-20 mb-1 w-56 overflow-hidden rounded-md border border-neutral-200 bg-white text-left shadow-lg">
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

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-white/5"
        aria-label="Minha conta"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dourado text-xs font-bold text-grena-escuro">
          {IniciaisDoEmail(email)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">
          {email ?? "Minha conta"}
        </span>
      </button>
    </div>
  );
}
