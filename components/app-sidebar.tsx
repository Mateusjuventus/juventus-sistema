"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { ChecklistIcon, HomeIcon } from "@/components/department-icon";
import {
  IconAlojamento,
  IconAssinaturaPendente,
  IconAtletas,
  IconCaptacao,
  IconComissao,
  IconCompeticoes,
  IconEstoque,
  IconFinanceiro,
  IconHotel,
  IconJogos,
  IconProgramacao,
  IconRelatorio,
  IconSolicitacoes,
  IconStaff,
  IconTermos,
  IconUsuarios,
  IconVeiculo,
} from "@/components/module-icons";
import { PerfilMenuSidebar } from "@/components/perfil-menu";
import { SinoNotificacoes, type NotificacaoResumo } from "@/components/sino-notificacoes";
import { PushOptIn } from "@/components/push-opt-in";
import { PRIORIDADE_MOBILE, type ModuloChave } from "@/lib/auth/modulos";

/** Chave de ícone que o item carrega — string simples, serializável na fronteira Server→Client
 * Component (ver comentário abaixo). "usuarios" não é um `ModuloChave` de verdade (ver
 * `components/app-shell.tsx`), assim como "captacao"/"alojamento"/"programacao" só existem em
 * `ModuloBaseChave` (módulos exclusivos do Futebol de Base) — por isso o tipo aceita essas à parte.
 * IMPORTANTE: todo `ModuloBaseChave` novo precisa ganhar uma entrada aqui E em `ICONES` logo
 * abaixo — sem isso, `ICONES[item.icone]` fica `undefined` e o React quebra em produção (erro #130,
 * "element type is invalid") assim que alguém com aquele módulo liberado carrega a sidebar. O
 * `as SidebarIconKey` em `app-shell.tsx` (necessário pra reaproveitar `MODULOS_BASE.map` sem
 * duplicar a lista) não pega esse tipo de furo em tempo de compilação — só em runtime. */
export type SidebarIconKey = ModuloChave | "usuarios" | "captacao" | "alojamento" | "programacao";

export interface SidebarNavItem {
  href: string;
  label: string;
  icone: SidebarIconKey;
  /** Nome do bloco recolhível a que o item pertence (ver `grupo` em `lib/auth/modulos.ts`). Item
   * sem `grupo` fica solto na lista principal. */
  grupo?: string;
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
  programacao: IconProgramacao,
  solicitacoes: IconSolicitacoes,
  estoque: IconEstoque,
  termos_retirada: IconTermos,
  hoteis: IconHotel,
  veiculos: IconVeiculo,
  financeiro: IconFinanceiro,
  relatorios_avulso: IconRelatorio,
  usuarios: IconUsuarios,
  captacao: IconCaptacao,
  alojamento: IconAlojamento,
};

/** Rótulos da sidebar são escritos por extenso ("Comissão Técnica / Diretoria") e não cabem embaixo
 * de um ícone de 22px. Aqui eles viram a versão curta — só na barra inferior; a gaveta e o desktop
 * continuam com o nome completo. */
const ROTULO_CURTO: Record<string, string> = {
  "Comissão Técnica / Diretoria": "Comissão",
  "Staff Operacional": "Staff",
  "Termos de Retirada": "Termos",
  "Veículos / Placas": "Veículos",
  "Relatório Avulso": "Relatório",
  "Jogos / Competições": "Jogos",
  "Captação/Avaliação": "Captação",
};

function rotuloCurto(label: string): string {
  return ROTULO_CURTO[label] ?? label;
}

function ItemLink({
  item,
  ativo,
  classe,
  recuado,
}: {
  item: SidebarNavItem;
  ativo: boolean;
  classe: (ativo: boolean) => string;
  recuado?: boolean;
}) {
  const Icone = ICONES[item.icone];
  return (
    <Link href={item.href} className={`${classe(ativo)}${recuado ? " pl-6" : ""}`}>
      <Icone className="h-[18px] w-[18px] shrink-0" />
      {item.label}
    </Link>
  );
}

/**
 * Bloco de módulos que abre e fecha numa setinha (ver `grupo` em `lib/auth/modulos.ts`).
 *
 * Começa ABERTO quando a página atual está dentro dele — senão, ao entrar em Hotéis o usuário veria
 * um bloco fechado e nenhum item destacado, sem pista de onde está. Fora isso começa fechado, que é
 * o motivo do agrupamento existir: encurtar a barra.
 *
 * O estado é por montagem (não fica guardado entre páginas) de propósito: guardar em localStorage
 * é proibido nos artefatos do sistema, e cookie/servidor pra lembrar um menu aberto seria peso
 * demais pro que a tela ganha.
 */
function GrupoRecolhivel({
  titulo,
  itens,
  itemAtivo,
  linkClasse,
}: {
  titulo: string;
  itens: SidebarNavItem[];
  itemAtivo: (href: string) => boolean;
  linkClasse: (ativo: boolean) => string;
}) {
  const temAtivo = itens.some((item) => itemAtivo(item.href));
  const [aberto, setAberto] = useState(temAtivo);

  return (
    <div className="pt-3">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/45 transition-colors hover:text-white/75"
      >
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 shrink-0 transition-transform ${aberto ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4.5 2.5 8 6l-3.5 3.5" />
        </svg>
        {titulo}
        {/* Ponto dourado avisa que a página atual está aqui dentro quando o bloco está fechado —
            sem ele, fechar o grupo esconderia o único indicador de onde o usuário está. */}
        {!aberto && temAtivo ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-dourado" /> : null}
      </button>
      {aberto ? (
        <div className="space-y-0.5">
          {itens.map((item) => (
            <ItemLink key={item.href} item={item} ativo={itemAtivo(item.href)} classe={linkClasse} recuado />
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
  notificacoes,
}: {
  homeHref: string;
  homeTitle: string;
  departamentoLabel: string;
  navItems: SidebarNavItem[];
  showAvisos: boolean;
  email: string | null;
  logoutAction: () => Promise<void>;
  /** Pendências do sino (ver `components/sino-notificacoes.tsx`) — vazio se não estiver logado. */
  notificacoes: NotificacaoResumo[];
}) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const fechar = () => setMenuAberto(false);

  // Fecha a gaveta ao trocar de rota. Sem isto, tocar num item do menu no celular navegava mas
  // deixava a gaveta aberta por cima da tela nova.
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

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

  // Itens soltos primeiro (o que se usa toda semana), depois cada bloco recolhível na ordem em que
  // apareceu em `navItems` — que é a ordem de `MODULOS`, a fonte única de módulo → rota/label.
  const soltos = navItems.filter((item) => !item.grupo);
  const grupos: [string, SidebarNavItem[]][] = [];
  for (const item of navItems) {
    if (!item.grupo) continue;
    const existente = grupos.find(([titulo]) => titulo === item.grupo);
    if (existente) existente[1].push(item);
    else grupos.push([item.grupo, [item]]);
  }

  /* O mesmo conteúdo serve à barra fixa do desktop e à gaveta do celular — duplicar essa lista em
     dois lugares era garantia de um item novo aparecer só num deles. */
  const conteudo = (
    <>
      <div className="px-4 pb-4 pt-5">
        <Link href="/" onClick={fechar} className="flex items-center gap-2 text-[15px] font-bold tracking-wide">
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
        {soltos.map((item) => (
          <ItemLink key={item.href} item={item} ativo={itemAtivo(item.href)} classe={linkClasse} />
        ))}

        {grupos.map(([titulo, itens]) => (
          <GrupoRecolhivel
            key={titulo}
            titulo={titulo}
            itens={itens}
            itemAtivo={itemAtivo}
            linkClasse={linkClasse}
          />
        ))}

        <p className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wide text-white/45">
          Geral
        </p>
        <Link href="/tarefas" className={linkClasse(itemAtivo("/tarefas"))}>
          <ChecklistIcon className="h-[18px] w-[18px] shrink-0" />
          Tarefas
        </Link>
        <Link href="/documentos-pendentes" className={linkClasse(itemAtivo("/documentos-pendentes"))}>
          <IconAssinaturaPendente className="h-[18px] w-[18px] shrink-0" />
          Documentos Pendentes
        </Link>
      </nav>

      <div className="space-y-2 border-t border-white/10 px-3 py-2">
        <SinoNotificacoes notificacoes={notificacoes} caminhoAtual={pathname} linkAvisos={showAvisos} />
        <PushOptIn />
      </div>
      <PerfilMenuSidebar email={email} logoutAction={logoutAction} />
    </>
  );

  /* Barra inferior do celular: Início + 3 módulos + Menu. Cinco é o limite prático — com seis os
     rótulos começam a cortar em tela de 360px. Quem fica de fora continua acessível pelo Menu, que
     abre a mesma gaveta com a lista completa. */
  const itensMobile: SidebarNavItem[] = [];
  for (const chave of PRIORIDADE_MOBILE) {
    if (itensMobile.length === 3) break;
    const achado = navItems.find((item) => item.icone === chave);
    if (achado) itensMobile.push(achado);
  }
  // Usuário com permissões incomuns pode não ter nenhum dos prioritários — completa com o que ele
  // tem, pra a barra nunca aparecer pela metade.
  for (const item of navItems) {
    if (itensMobile.length === 3) break;
    if (!itensMobile.includes(item)) itensMobile.push(item);
  }

  const itemInferior = (ativo: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium leading-none transition-colors ${
      ativo ? "text-grena" : "text-neutral-500"
    }`;

  return (
    <>
      {/* Celular: barra inferior fixa, no alcance do polegar. Substitui a barra de topo — o topo
          gastava 56px de altura só com identidade visual, e a altura é justamente o que falta num
          telefone. `pb-[env(safe-area-inset-bottom)]` evita que o indicador de home do iPhone fique
          por cima dos rótulos. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-linha bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgba(0,0,0,0.06)] lg:hidden">
        <Link href={homeHref} className={itemInferior(homeAtivo)}>
          <HomeIcon className="h-[22px] w-[22px]" />
          <span className="w-full truncate text-center">Início</span>
        </Link>
        {itensMobile.map((item) => {
          const Icone = ICONES[item.icone];
          return (
            <Link key={item.href} href={item.href} className={itemInferior(itemAtivo(item.href))}>
              <Icone className="h-[22px] w-[22px]" />
              <span className="w-full truncate text-center">{rotuloCurto(item.label)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
          aria-expanded={menuAberto}
          className={itemInferior(menuAberto)}
        >
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <span className="w-full truncate text-center">Menu</span>
        </button>
      </nav>

      {/* Gaveta do celular. Fica sempre montada e só desliza pra fora da tela quando fechada, pra a
          abertura ser imediata em vez de piscar montando a lista inteira. */}
      <div className={`fixed inset-0 z-40 lg:hidden ${menuAberto ? "" : "pointer-events-none"}`}>
        <div
          onClick={fechar}
          aria-hidden
          className={`absolute inset-0 bg-black/50 transition-opacity ${menuAberto ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[264px] max-w-[85%] flex-col bg-grena text-white shadow-xl transition-transform duration-200 ${
            menuAberto ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar menu"
            className="absolute right-2 top-3 flex h-10 w-10 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          {conteudo}
        </aside>
      </div>

      {/* Desktop: a barra fixa de sempre. */}
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col bg-grena text-white lg:flex">
        {conteudo}
      </aside>
    </>
  );
}
