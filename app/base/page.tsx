import { AppShell } from "@/components/app-shell";
import { ClubeEscudo } from "@/components/clube-escudo";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasProgramacao } from "@/lib/programacao/permissoes";
import { getDepartamentosPermitidos } from "@/lib/auth/role";
import { montarDashboard } from "@/lib/dashboard/montar-dashboard";
import { DashboardView } from "@/components/dashboard/dashboard-view";

/**
 * Início do Futebol de Base — Dashboard/Painel principal desde 14/11/2026 (ver docs/superpowers/
 * specs/2026-11-14-dashboard-principal-design.md, pedido do Mateus). Até essa data este conteúdo
 * era a Programação Semanal, Home da Base desde 30/08 (ver histórico em `app/base/programacao/
 * page.tsx`, pra onde ela se mudou) — o item da sidebar "Programação" continua existindo, só
 * deixou de ser a Home. O brasão + "Futebol de Base" (identidade visual de entrada no
 * departamento) se mudam junto, pra continuar sendo a primeira coisa que aparece.
 *
 * Revisão de 14/11/2026 (mesmo dia): mesma mudança de `app/profissional/page.tsx` — quem tem os
 * dois departamentos liberados (`getDepartamentosPermitidos`) vê aqui o MESMO conteúdo combinado
 * que vê em `/profissional` (`lib/dashboard/montar-dashboard.ts`, chamada pelas duas páginas); só
 * o cabeçalho continua sendo o diferencial desta rota (brasão + "Futebol de Base"). O guard de
 * acesso (`categorias.length === 0`, via `getCategoriasProgramacao` — já trata Treinador
 * restrito a categoria) não mudou.
 */
export default async function BasePage() {
  const supabase = createClient();
  const categorias = await getCategoriasProgramacao(supabase);

  if (categorias.length === 0) {
    return (
      <AppShell departamento="futebol_base" breadcrumb="Início">
        <div className="mt-2 flex flex-col items-center gap-2 text-center">
          <ClubeEscudo className="h-14 w-auto" />
          <h1 className="text-3xl font-bold text-grena-escuro">Futebol de Base</h1>
        </div>
        <div className="card mx-auto mt-6 max-w-md p-8 text-center text-neutral-500">
          Você não tem acesso a nenhum módulo do Futebol de Base ainda. Fale com o responsável pelo
          seu cadastro.
        </div>
      </AppShell>
    );
  }

  const departamentosPermitidos = await getDepartamentosPermitidos(supabase);
  const dashboardProps = await montarDashboard(supabase, departamentosPermitidos);

  return (
    <AppShell departamento="futebol_base" breadcrumb="Início">
      <div className="mt-2 flex flex-col items-center gap-2 text-center">
        <ClubeEscudo className="h-14 w-auto" />
        <h1 className="text-3xl font-bold text-grena-escuro">Futebol de Base</h1>
      </div>

      <div className="mt-6">
        <DashboardView {...dashboardProps} />
      </div>
    </AppShell>
  );
}
