import type { ReactNode } from "react";
import { logout } from "@/app/actions";
import { AppSidebar, type SidebarIconKey, type SidebarNavItem } from "@/components/app-sidebar";
import { createClient } from "@/lib/supabase/server";
import { getModulosPermitidos, getModulosBasePermitidos, isMaster } from "@/lib/auth/role";
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
  /** Nome da página atual, mostrado como "Início / {breadcrumb}" numa barra fina no topo do
   * conteúdo — troca os links soltos "← Voltar"/"← Início" que cada página desenhava por conta
   * própria. Opcional: por ora só `/profissional` e `/financeiro` passam isso (ver a spec do
   * redesign visual) — as demais páginas continuam com seu próprio link de volta até serem
   * tocadas. */
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
  if (nav === "full") {
    if (departamento === "futebol_base") {
      const modulosBasePermitidos = await getModulosBasePermitidos(supabase);
      navItems = MODULOS_BASE.filter((m) => modulosBasePermitidos.includes(m.chave)).map((m) => ({
        href: m.prefixo,
        label: m.label,
        icone: m.chave as SidebarIconKey,
      }));
    } else {
      const [modulosPermitidos, master] = await Promise.all([
        getModulosPermitidos(supabase),
        isMaster(supabase),
      ]);
      navItems = MODULOS.filter((m) => modulosPermitidos.includes(m.chave)).map((m) => ({
        href: m.prefixo,
        label: m.label,
        icone: m.chave,
        // Bloco recolhível da sidebar, quando o módulo pertence a um (ver `lib/auth/modulos.ts`).
        grupo: m.grupo,
      }));
      // Só quem é master vê Usuários — é onde se cadastra/gerencia outras contas. Não é um
      // ModuloChave liberável por checkbox, por isso entra fora do filtro acima.
      if (master) {
        navItems.push({ href: "/usuarios", label: "Usuários", icone: "usuarios" });
      }
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const notificacoes = nav === "full" ? await buscarNotificacoes() : [];

  const homeHref = departamento === "futebol_base" ? "/base" : "/profissional";
  const homeTitle =
    departamento === "futebol_base" ? "Início do Futebol de Base" : "Início do Futebol Profissional";
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
        departamentoLabel={departamentoLabel}
        navItems={navItems}
        showAvisos={departamento !== "futebol_base"}
        email={user?.email ?? null}
        logoutAction={logout}
        notificacoes={notificacoes}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {breadcrumb ? (
          <div className="flex h-12 shrink-0 items-center border-b border-linha bg-white px-4 sm:h-14 sm:px-6 lg:px-8">
            <p className="text-sm text-neutral-500">
              Início <span className="mx-1 text-neutral-300">/</span>
              <span className="font-semibold text-grena-escuro">{breadcrumb}</span>
            </p>
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
    </div>
  );
}
