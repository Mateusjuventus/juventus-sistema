import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/actions";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { AppSidebar, type SidebarNavItem } from "@/components/app-sidebar";
import { createClient } from "@/lib/supabase/server";
import { getModulosPermitidos, getModulosBasePermitidos, isMaster } from "@/lib/auth/role";
import { MODULOS, type ModuloChave } from "@/lib/auth/modulos";
import { MODULOS_BASE } from "@/lib/auth/modulos-base";

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
}: {
  children: ReactNode;
  nav?: "full" | "none";
  departamento?: "futebol_profissional" | "futebol_base";
}) {
  const supabase = createClient();

  let navItems: SidebarNavItem[] = [];
  if (nav === "full") {
    if (departamento === "futebol_base") {
      const modulosBasePermitidos = await getModulosBasePermitidos(supabase);
      navItems = MODULOS_BASE.filter((m) => modulosBasePermitidos.includes(m.chave)).map((m) => ({
        href: m.prefixo,
        label: m.label,
        icone: m.chave as ModuloChave,
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

  const homeHref = departamento === "futebol_base" ? "/base" : "/profissional";
  const homeTitle =
    departamento === "futebol_base" ? "Início do Futebol de Base" : "Início do Futebol Profissional";
  const departamentoLabel = departamento === "futebol_base" ? "Futebol de Base" : "Futebol Profissional";

  if (nav === "none") {
    return (
      <div className="min-h-screen">
        <header className="border-b border-linha bg-white">
          <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-wide text-grena-escuro">
              <JuventusCrestMark className="h-8 w-8" />
              Juventus - SAF
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        homeHref={homeHref}
        homeTitle={homeTitle}
        departamentoLabel={departamentoLabel}
        navItems={navItems}
        showAvisos={departamento !== "futebol_base"}
        email={user?.email ?? null}
        logoutAction={logout}
      />
      {/* `max-w-6xl mx-auto` reproduz a mesma largura de conteúdo que a barra horizontal antiga já
          usava — mantém as ~40 telas do sistema com a mesma proporção de layout que já tinham,
          sem precisar tocar em cada uma só por causa da troca de topo pra sidebar. */}
      <main className="min-w-0 flex-1 overflow-x-auto px-6 py-6 sm:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
