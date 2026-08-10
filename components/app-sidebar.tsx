"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { BellIcon, ChecklistIcon, HomeIcon } from "@/components/department-icon";
import {
  IconAtletas,
  IconComissao,
  IconCompeticoes,
  IconEstoque,
  IconFinanceiro,
  IconJogos,
  IconRelatorio,
  IconSolicitacoes,
  IconStaff,
  IconUsuarios,
} from "@/components/module-icons";
import { PerfilMenuSidebar } from "@/components/perfil-menu";
import type { ModuloChave } from "@/lib/auth/modulos";

/** Chave de ícone que o item carrega — string simples, serializável na fronteira Server→Client
 * Component (ver comentário abaixo). "usuarios" não é um `ModuloChave` de verdade (ver
 * `components/app-shell.tsx`), por isso o tipo aceita ela à parte. */
export type SidebarIconKey = ModuloChave | "usuarios";

export interface SidebarNavItem {
  href: string;
  label: string;
  icone: SidebarIconKey;
}

/** Mapa de ícone só existe aqui dentro do Client Component — um componente de ícone (função) não
 * é serializável cruzando a fronteira Server→Client (só Server Actions passam por essa fronteira
 * como função); por isso `AppShell` (server) manda só a `SidebarIconKey` (string) em `navItems`,
 * e a resolução pro componente de ícone de verdade acontece aqui dentro. */
const ICONES: Record<SidebarIconKey, (props: { className?: string }) => JSX.Element> = {
  atletas: IconAtletas,
  comissao_tecnica: IconComissao,
  competicoes: IconCompeticoes,
  staff_operacional: IconStaff,
  jogos: IconJogos,
  solicitacoes: IconSolicitacoes,
  estoque: IconEstoque,
  financeiro: IconFinanceiro,
  relatorios_avulso: IconRelatorio,
  usuarios: IconUsuarios,
};

/**
 * Sidebar fixa à esquerda (232px) — substitui a barra horizontal no topo que o sistema usava antes
 * (ver docs/superpowers/specs/2026-08-07-redesign-visual-painel-financeiro-design.md). Client
 * Component porque precisa de `usePathname()` pra destacar o item ativo — todo o resto (lista de
 * módulos já filtrada por permissão, e-mail do usuário) vem resolvido do `AppShell` (server).
 */
export function AppSidebar({
  homeHref,
  homeTitle,
  departamentoLabel,
  navItems,
  showAvisos,
  email,
  logoutAction,
}: {
  homeHref: string;
  homeTitle: string;
  departamentoLabel: string;
  navItems: SidebarNavItem[];
  showAvisos: boolean;
  email: string | null;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  // Início só fica ativo na própria rota (não em prefixo) — senão "/base" combinaria com
  // "/base/atletas" e ligaria os dois itens ao mesmo tempo.
  const homeAtivo = pathname === homeHref;
  const itemAtivo = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // O hex do inset shadow precisa ficar literal (classe arbitrária do Tailwind — o scanner do
  // JIT não executa JS, então não dá pra interpolar `juventusTheme.dourado` aqui). Mantém em
  // sincronia manualmente com `dourado` em lib/theme.ts se a cor mudar de novo.
  const linkClasse = (ativo: boolean) =>
    `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      ativo
        ? "bg-white/10 text-white shadow-[inset_3px_0_0_#B98F1E]"
        : "text-white/75 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col bg-grena text-white">
      <div className="px-4 pb-4 pt-5">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-bold tracking-wide">
          <JuventusCrestMark className="h-8 w-8 shrink-0" />
          <span>Juventus - SAF</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">
          {departamentoLabel}
        </p>
        <Link href={homeHref} title={homeTitle} className={linkClasse(homeAtivo)}>
          <HomeIcon className="h-[18px] w-[18px] shrink-0" />
          Início
        </Link>
        {navItems.map((item) => {
          const Icone = ICONES[item.icone];
          return (
            <Link key={item.href} href={item.href} className={linkClasse(itemAtivo(item.href))}>
              <Icone className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <p className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wide text-white/45">
          Geral
        </p>
        {showAvisos ? (
          <Link href="/avisos" className={linkClasse(itemAtivo("/avisos"))}>
            <BellIcon className="h-[18px] w-[18px] shrink-0" />
            Avisos
          </Link>
        ) : null}
        <Link href="/tarefas" className={linkClasse(itemAtivo("/tarefas"))}>
          <ChecklistIcon className="h-[18px] w-[18px] shrink-0" />
          Tarefas
        </Link>
      </nav>

      <PerfilMenuSidebar email={email} logoutAction={logoutAction} />
    </aside>
  );
}
