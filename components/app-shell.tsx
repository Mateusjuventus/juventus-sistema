import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/actions";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { BellIcon, ChecklistIcon, HomeIcon } from "@/components/department-icon";
import { PerfilMenu } from "@/components/perfil-menu";
import { createClient } from "@/lib/supabase/server";
import { getModulosPermitidos, getModulosBasePermitidos } from "@/lib/auth/role";
import type { ModuloChave } from "@/lib/auth/modulos";
import type { ModuloBaseChave } from "@/lib/auth/modulos-base";

const NAV_LINKS: { href: string; label: string; moduloChave: ModuloChave }[] = [
  { href: "/atletas", label: "Atletas", moduloChave: "atletas" },
  { href: "/comissao-tecnica", label: "Comissão Técnica", moduloChave: "comissao_tecnica" },
  { href: "/staff-operacional", label: "Staff Operacional", moduloChave: "staff_operacional" },
  { href: "/jogos", label: "Jogos", moduloChave: "jogos" },
];

/** Mesma lista, pros módulos do Futebol de Base (ver `lib/auth/modulos-base.ts`) — agora com os 7
 * módulos completos (Fases 1-4). `getModulosBasePermitidos` ainda filtra pelo que a pessoa tem
 * liberado. */
const NAV_LINKS_BASE: { href: string; label: string; moduloChave: ModuloBaseChave }[] = [
  { href: "/base/atletas", label: "Atletas", moduloChave: "atletas" },
  { href: "/base/comissao-tecnica", label: "Comissão Técnica", moduloChave: "comissao_tecnica" },
  { href: "/base/staff-operacional", label: "Staff Operacional", moduloChave: "staff_operacional" },
  { href: "/base/jogos", label: "Jogos", moduloChave: "jogos" },
  { href: "/base/solicitacoes", label: "Solicitações", moduloChave: "solicitacoes" },
  { href: "/base/estoque", label: "Estoque", moduloChave: "estoque" },
  { href: "/base/financeiro", label: "Financeiro", moduloChave: "financeiro" },
];

/**
 * `nav="full"` (padrão) mostra os atalhos dos módulos do departamento atual que o usuário logado
 * tem liberados (ver `lib/auth/modulos.ts`/`lib/auth/modulos-base.ts`) — usado dentro do
 * departamento. `nav="none"` mostra só a logo — usado na tela inicial de escolha de departamento,
 * onde ainda não faz sentido atalho pra módulos de um departamento específico.
 *
 * `departamento` decide qual departamento está "ativo" nesta página — de que lista de módulos usar
 * e pra onde aponta o link "Início". Todas as páginas de `/base/*` passam
 * `departamento="futebol_base"`; o resto do sistema usa o padrão (`"futebol_profissional"`). O
 * link de Avisos só aparece no Futebol Profissional — não existe uma versão dele pro Futebol de
 * Base ainda (ver a spec).
 *
 * O e-mail do usuário logado é sempre buscado aqui (independente de `nav`) pra alimentar o menu
 * "Minha Conta" (`components/perfil-menu.tsx`), que fica ao lado da logo em toda página.
 */
export async function AppShell({
  children,
  nav = "full",
  departamento = "futebol_profissional",
}: {
  children: ReactNode;
  nav?: "full" | "none";
  departamento?: "futebol_profissional" | "futebol_base";
}) {
  const supabase = createClient();

  let linksPermitidos: { href: string; label: string }[] = [];
  if (nav === "full") {
    if (departamento === "futebol_base") {
      const modulosBasePermitidos = await getModulosBasePermitidos(supabase);
      linksPermitidos = NAV_LINKS_BASE.filter((link) => modulosBasePermitidos.includes(link.moduloChave));
    } else {
      const modulosPermitidos = await getModulosPermitidos(supabase);
      linksPermitidos = NAV_LINKS.filter((link) => modulosPermitidos.includes(link.moduloChave));
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const homeHref = departamento === "futebol_base" ? "/base" : "/profissional";
  const homeTitle =
    departamento === "futebol_base" ? "Início do Futebol de Base" : "Início do Futebol Profissional";

  return (
    <div className="min-h-screen">
      <header className="border-b-2 border-dourado bg-grena-escuro text-white shadow-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-wide">
              <JuventusCrestMark className="h-8 w-8" />
              Juventus - SAF
            </Link>
            <PerfilMenu email={user?.email ?? null} logoutAction={logout} />
          </div>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {nav === "full" ? (
              <Link
                href={homeHref}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                title={homeTitle}
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
            {departamento === "futebol_base" ? null : (
              <Link
                href="/avisos"
                className="ml-1 flex items-center gap-1.5 rounded-md border border-dourado/60 px-3 py-1.5 font-medium text-dourado transition-colors hover:bg-dourado/10"
              >
                <BellIcon className="h-4 w-4" />
                Avisos
              </Link>
            )}
            <Link
              href="/tarefas"
              className="flex items-center gap-1.5 rounded-md border border-dourado/60 px-3 py-1.5 font-medium text-dourado transition-colors hover:bg-dourado/10"
            >
              <ChecklistIcon className="h-4 w-4" />
              Tarefas
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
