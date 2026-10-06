import type { ReactNode } from "react";
import { logout } from "@/app/actions";
import { AppSidebar, type SidebarIconKey, type SidebarNavItem } from "@/components/app-sidebar";
import { ProxisMark } from "@/components/proxis-brand";
import { DemandasFlutuante } from "@/components/demandas/demandas-flutuante";
import { createClient } from "@/lib/supabase/server";
import {
  getDemandasAcompanhado,
  getModulosPermitidos,
  getModulosBasePermitidos,
  getDepartamentosPermitidos,
  isMaster,
} from "@/lib/auth/role";
import { MODULOS, type ModuloChave } from "@/lib/auth/modulos";
import { MODULOS_BASE } from "@/lib/auth/modulos-base";
import { buscarNotificacoes } from "@/lib/notificacoes/actions";

/**
 * `nav="full"` (padrão) monta a sidebar com os módulos do departamento atual que o usuário logado
 * tem liberados (ver `lib/auth/modulos.ts`/`lib/auth/modulos-base.ts`) — usado dentro do
 * departamento. A lista vem de `MODULOS`/`MODULOS_BASE` (fonte única de módulo → rota/label,
 * mesma usada pelo middleware) filtrada por permissão, não mais de uma lista solta duplicada
 * aqui — foi assim que "Usuários" e "Relatório Avulso" ficaram de fora da navegação por um tempo
 * (ver a spec do redesign visual).
 *
 * `nav="none"` mostra só a logo, sem sidebar — usado na tela inicial de escolha de departamento,
 * onde ainda não faz sentido menu de módulos de um departamento específico.
 *
 * `departamento` decide qual departamento está "ativo" nesta página — de que lista de módulos usar
 * e pra onde aponta "Início". Todas as páginas de `/base/*` passam `departamento="futebol_base"`;
 * o resto do sistema usa o padrão (`"futebol_profissional"`). Avisos só existe pro Futebol
 * Profissional ainda.
 *
 * O e-mail do usuário logado é sempre buscado aqui (independente de `nav`) pra alimentar o rodapé
 * da sidebar (`components/perfil-menu.tsx`).
 */
export async function AppShell({
  children,
  nav = "full",
  departamento = "futebol_profissional",
  breadcrumb,
  largura = "padrao",
}: {
  children: ReactNode;
  nav?: "full" | "none";
  departamento?: "futebol_profissional" | "futebol_base";
  /** Nome da página atual, mostrado numa barra fina no topo do conteúdo, com a marca da Proxis ao
   * lado (ver docs/superpowers/specs/2026-10-05-barra-topo-todas-as-telas-design.md) — troca os
   * links soltos "← Voltar"/"← Início" que cada página desenhava por conta própria. Sem o prefixo
   * "Início /": só o nome da tela, já que repetir "Início" não ajudava em nada (pedido do Mateus,
   * 05/10). Praticamente toda tela do sistema passa isso hoje (Base e Profissional); as únicas
   * exceções são a Área do Treinador (chrome próprio) e `app/base/comissao-tecnica/organograma`
   * (ainda não migrada). */
  breadcrumb?: string;
  /** "padrao" (default) mantém a largura de conteúdo de sempre (`max-w-6xl`, ~40 telas do sistema).
   * "total" usa a largura inteira disponível — pra telas que realmente precisam de mais espaço
   * horizontal bruto (não é o caso de diagramas que já encolhem sozinhos pra caber, como o
   * Organograma da Base: dar mais largura só aumenta o card em torno de um desenho que continua do
   * mesmo tamanho, sobrando vazio nas laterais — ver `calcularEscalaOrganograma` em
   * `lib/futebol/organograma.ts`). Opt-in por tela, não muda nada nas demais; nenhuma tela usa hoje. */
  largura?: "padrao" | "total";
}) {
  const supabase = createClient();

  let navItems: SidebarNavItem[] = [];
  // Preenchido só quando o usuário tem acesso aos dois departamentos — alimenta o atalho de troca
  // rápida na sidebar (ver `outroDepartamento` em `components/app-sidebar.tsx`). `null` quando só
  // tem um (não há "outro" pra trocar) ou quando `nav === "none"` (tela de escolha, que já é o
  // próprio lugar de trocar).
  let outroDepartamento: { href: string; label: string } | null = null;
  // Preenchidos só quando `nav === "full"` (ver abaixo) — alimentam os links condicionais "Minhas
  // Demandas"/"Demandas" no grupo "Geral" da sidebar (ver docs/superpowers/specs/2026-10-05-
  // assistencia-social-e-demandas-design.md, Parte 2).
  let mostrarMinhasDemandas = false;
  let mostrarPainelDemandas = false;
  if (nav === "full") {
    if (departamento === "futebol_base") {
      const [modulosBasePermitidos, master, departamentosPermitidos, demandasAcompanhado] = await Promise.all([
        getModulosBasePermitidos(supabase),
        isMaster(supabase),
        getDepartamentosPermitidos(supabase),
        getDemandasAcompanhado(supabase),
      ]);
      navItems = MODULOS_BASE.filter((m) => modulosBasePermitidos.includes(m.chave)).map((m) => ({
        href: m.prefixo,
        // `subLabel` só existe quando o nome do link precisa ser diferente do nome da permissão
        // (ver `departamento_medico` em `lib/auth/modulos-base.ts`) — os demais módulos caem pra
        // `label`. Mesmo raciocínio do branch do Profissional, abaixo.
        label: m.subLabel ?? m.label,
        icone: m.chave as SidebarIconKey,
        subItens: m.subItens,
      }));
      // Usuários precisa aparecer pro master em qualquer departamento — não é uma opção "do
      // Profissional" nem "da Base", é administração de contas do sistema inteiro. Antes só
      // entrava na lista do Profissional (ver histórico desta mudança), então o master que
      // estivesse navegando pela Base precisava voltar pro Profissional só pra achar essa tela.
      if (master) {
        navItems.push({ href: "/usuarios", label: "Usuários", icone: "usuarios" });
      }
      if (departamentosPermitidos.includes("futebol_profissional")) {
        outroDepartamento = { href: "/profissional", label: "Futebol Profissional" };
      }
      mostrarMinhasDemandas = demandasAcompanhado;
      mostrarPainelDemandas = master;
    } else {
      const [modulosPermitidos, master, departamentosPermitidos, demandasAcompanhado] = await Promise.all([
        getModulosPermitidos(supabase),
        isMaster(supabase),
        getDepartamentosPermitidos(supabase),
        getDemandasAcompanhado(supabase),
      ]);
      navItems = MODULOS.filter((m) => modulosPermitidos.includes(m.chave)).map((m) => ({
        href: m.prefixo,
        // `subLabel` só existe quando o nome do link precisa ser diferente do nome da permissão
        // (ver `departamento_medico` em `lib/auth/modulos.ts`) — os demais módulos caem pra `label`.
        label: m.subLabel ?? m.label,
        icone: m.chave,
        // Bloco recolhível da sidebar, quando o módulo pertence a um (ver `lib/auth/modulos.ts`).
        grupo: m.grupo,
        subItens: m.subItens,
      }));
      // Só quem é master vê Usuários — é onde se cadastra/gerencia outras contas. Não é um
      // ModuloChave liberável por checkbox, por isso entra fora do filtro acima. Vale pros dois
      // departamentos (ver comentário acima, no branch da Base).
      if (master) {
        navItems.push({ href: "/usuarios", label: "Usuários", icone: "usuarios" });
      }
      if (departamentosPermitidos.includes("futebol_base")) {
        outroDepartamento = { href: "/base", label: "Futebol de Base" };
      }
      mostrarMinhasDemandas = demandasAcompanhado;
      mostrarPainelDemandas = master;
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const notificacoes = nav === "full" ? await buscarNotificacoes() : [];

  const homeHref = departamento === "futebol_base" ? "/base" : "/profissional";
  // O Início do Profissional virou a Programação Semanal em 05/10 (ver docs/superpowers/specs/
  // 2026-10-05-programacao-profissional-design.md) — o item da sidebar passa a se chamar
  // "Programação" (não mais "Início"), com um ícone próprio e um item extra "Calendário" logo
  // abaixo (o antigo painel de calendário/mural/próximo jogo/contratos, que só mostra o
  // calendário agora). A Base ganhou o mesmo nome em 06/10 (ver docs/superpowers/specs/
  // 2026-10-06-reorganizacao-sidebar-design.md) — a home dela (`app/base/page.tsx`) já era a
  // grade de programação desde 30/08, só o rótulo da sidebar que ainda dizia "Início"; o item
  // extra "Calendário" continua só do Profissional (a Base não tem essa tela separada).
  const homeTitle = departamento === "futebol_base" ? "Programação do Futebol de Base" : "Programação do Futebol Profissional";
  const homeLabel = "Programação";
  const itemExtra =
    departamento === "futebol_base" ? undefined : { href: "/profissional/calendario", label: "Calendário" };
  const departamentoLabel = departamento === "futebol_base" ? "Futebol de Base" : "Futebol Profissional";

  if (nav === "none") {
    // Só a tela de escolha de departamento usa `nav="none"` hoje (ver app/page.tsx) — por isso o
    // fundo grená cobre a tela inteira aqui, sem cabeçalho separado: a própria tela já abre com o
    // brasão e "Juventus - SAF" em destaque, então repetir isso numa barra fininha no topo era
    // redundante. É a mesma cor de preenchimento grande da sidebar/login, só que ocupando a
    // primeira tela inteira.
    return (
      <div className="min-h-screen bg-grena">
        <main className="mx-auto max-w-6xl px-4">{children}</main>
      </div>
    );
  }

  return (
    // `flex-col` no celular / `flex-row` no desktop: o `AppSidebar` renderiza uma barra de topo com
    // o botão de menu (que precisa ficar ACIMA do conteúdo) e, do `lg` pra cima, a barra lateral de
    // sempre (que precisa ficar AO LADO). A mesma direção de flex serve pros dois casos.
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AppSidebar
        homeHref={homeHref}
        homeTitle={homeTitle}
        homeLabel={homeLabel}
        homeIconeProgramacao
        itemExtra={itemExtra}
        departamentoLabel={departamentoLabel}
        departamentoAtual={departamento}
        outroDepartamento={outroDepartamento}
        navItems={navItems}
        mostrarMinhasDemandas={mostrarMinhasDemandas}
        mostrarPainelDemandas={mostrarPainelDemandas}
        showAvisos={departamento !== "futebol_base"}
        email={user?.email ?? null}
        logoutAction={logout}
        notificacoes={notificacoes}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {breadcrumb ? (
          <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-linha bg-white px-4 sm:h-14 sm:px-6 lg:px-8">
            <ProxisMark className="h-6 w-6 shrink-0" />
            <p className="text-sm font-semibold text-grena-escuro">{breadcrumb}</p>
          </div>
        ) : null}
        {/* `max-w-6xl mx-auto` reproduz a mesma largura de conteúdo que a barra horizontal antiga
            já usava — mantém as ~40 telas do sistema com a mesma proporção de layout que já
            tinham, sem precisar tocar em cada uma só por causa da troca de topo pra sidebar.
            `min-w-0` no wrapper impede que uma tabela larga estique a página inteira no celular:
            sem ele, a rolagem horizontal da tabela vira rolagem da tela toda. */}
        {/* `pb-24` no celular reserva a altura da barra inferior fixa — sem isso o último botão de
            cada tela ficava escondido atrás dela. */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-6 lg:pt-6">
          <div className={`min-w-0 ${largura === "total" ? "" : "mx-auto max-w-6xl"}`}>{children}</div>
        </main>
      </div>
      {/* Flutuante em cima de qualquer tela (não só a Home) — pedido do Mateus em 05/10, ver
          `DemandasFlutuante`. Some sozinho pra quem não está marcado "Acompanhar". */}
      <DemandasFlutuante />
    </div>
  );
}
