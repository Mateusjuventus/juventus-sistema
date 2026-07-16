import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/actions";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { BellIcon, ChecklistIcon, HomeIcon } from "@/components/department-icon";

const NAV_LINKS = [
  { href: "/atletas", label: "Atletas" },
  { href: "/comissao-tecnica", label: "Comissão Técnica" },
  { href: "/staff-operacional", label: "Staff Operacional" },
  { href: "/jogos", label: "Jogos" },
];

/**
 * `nav="full"` (padrão) mostra os atalhos dos módulos do Futebol Profissional — usado dentro do
 * departamento. `nav="none"` mostra só a logo e o botão Sair — usado na tela inicial de escolha de
 * departamento, onde ainda não faz sentido atalho pra módulos de um departamento específico.
 */
export function AppShell({
  children,
  nav = "full",
}: {
  children: ReactNode;
  nav?: "full" | "none";
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b-2 border-dourado bg-grena-escuro text-white shadow-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-wide">
            <JuventusCrestMark className="h-8 w-8" />
            Juventus - SAF
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {nav === "full" ? (
              <Link
                href="/profissional"
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                title="Início do Futebol Profissional"
              >
                <HomeIcon className="h-4 w-4" />
                Início
              </Link>
            ) : null}
            {nav === "full"
              ? NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-1.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))
              : null}
            <Link
              href="/avisos"
              className="ml-1 flex items-center gap-1.5 rounded-md border border-dourado/60 px-3 py-1.5 font-medium text-dourado transition-colors hover:bg-dourado/10"
            >
              <BellIcon className="h-4 w-4" />
              Avisos
            </Link>
            <Link
              href="/tarefas"
              className="flex items-center gap-1.5 rounded-md border border-dourado/60 px-3 py-1.5 font-medium text-dourado transition-colors hover:bg-dourado/10"
            >
              <ChecklistIcon className="h-4 w-4" />
              Tarefas
            </Link>
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
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
