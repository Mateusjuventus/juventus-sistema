import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/actions";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { BellIcon, ChecklistIcon, HomeIcon } from "@/components/department-icon";
import { createClient } from "@/lib/supabase/server";
import { getModulosPermitidos } from "@/lib/auth/role";
import type { ModuloChave } from "@/lib/auth/modulos";

const NAV_LINKS: { href: string; label: string; moduloChave: ModuloChave }[] = [
  { href: "/atletas", label: "Atletas", moduloChave: "atletas" },
  { href: "/comissao-tecnica", label: "Comissão Técnica", moduloChave: "comissao_tecnica" },
  { href: "/staff-operacional", label: "Staff Operacional", moduloChave: "staff_operacional" },
  { href: "/jogos", label: "Jogos", moduloChave: "jogos" },
];

/**
 * `nav="full"` (padrão) mostra os atalhos dos módulos do Futebol Profissional que o usuário
 * logado tem liberados (ver `lib/auth/modulos.ts`) — usado dentro do departamento. `nav="none"`
 * mostra só a logo e o botão Sair — usado na tela inicial de escolha de departamento, onde ainda
 * não faz sentido atalho pra módulos de um departamento específico.
 */
export async function AppShell({
  children,
  nav = "full",
}: {
  children: ReactNode;
  nav?: "full" | "none";
}) {
  let linksPermitidos: typeof NAV_LINKS = [];
  if (nav === "full") {
    const supabase = createClient();
    const modulosPermitidos = await getModulosPermitidos(supabase);
    linksPermitidos = NAV_LINKS.filter((link) => modulosPermitidos.includes(link.moduloChave));
  }

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
            {linksPermitidos.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
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
