import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/actions";

const NAV_LINKS = [
  { href: "/", label: "Início" },
  { href: "/atletas", label: "Atletas" },
  { href: "/comissao-tecnica", label: "Comissão Técnica" },
  { href: "/staff-operacional", label: "Staff Operacional" },
  { href: "/jogos", label: "Jogos" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="bg-grena-escuro text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-wide">
            Sistema Juventus
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <form action={logout}>
              <button
                type="submit"
                className="ml-2 rounded-md border border-white/30 px-3 py-1.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
              >
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
