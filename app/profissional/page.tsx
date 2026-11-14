import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasProgramacaoProfissional } from "@/lib/programacao/permissoes";
import { getDepartamentosPermitidos } from "@/lib/auth/role";
import { montarDashboard } from "@/lib/dashboard/montar-dashboard";
import { DashboardView } from "@/components/dashboard/dashboard-view";

/**
 * Início do Futebol Profissional — Dashboard/Painel principal desde 14/11/2026 (ver
 * docs/superpowers/specs/2026-11-14-dashboard-principal-design.md, pedido do Mateus). Até essa
 * data este conteúdo era a Programação Semanal (ver histórico em `app/profissional/programacao/
 * page.tsx`, pra onde ela se mudou) — o item da sidebar "Programação" continua existindo, só
 * deixou de ser a Home.
 *
 * Revisão de 14/11/2026 (mesmo dia): o Mateus apontou que o painel tinha ficado "separado" de
 * novo, contrariando a unificação em andamento no resto do sistema — quem tem os dois
 * departamentos liberados (`getDepartamentosPermitidos`) agora vê o conteúdo COMBINADO de
 * Profissional + Base aqui (e em `app/base/page.tsx`, que monta exatamente o mesmo conteúdo —
 * só o cabeçalho continua diferente, crachá/brasão). Toda a lógica de busca+mescla por
 * departamento vive em `lib/dashboard/montar-dashboard.ts`, chamada pelas duas páginas; o que
 * muda de uma pra outra aqui é só o guard de acesso (`getCategoriasProgramacaoProfissional`) e o
 * cabeçalho — o `departamento` do `AppShell`/sidebar não muda, continua controlando o resto da
 * navegação (Atletas, Jogos etc.), departamentalizada como sempre foi.
 */
export default async function ProfissionalPage() {
  const supabase = createClient();
  const temAcessoProfissional = (await getCategoriasProgramacaoProfissional(supabase)).length > 0;

  if (!temAcessoProfissional) {
    return (
      <AppShell breadcrumb="Início">
        <div className="card mx-auto mt-6 max-w-md p-8 text-center text-neutral-500">
          Você não tem acesso ao Futebol Profissional ainda. Fale com o responsável pelo seu
          cadastro.
        </div>
      </AppShell>
    );
  }

  const departamentosPermitidos = await getDepartamentosPermitidos(supabase);
  const dashboardProps = await montarDashboard(supabase, departamentosPermitidos);

  return (
    <AppShell breadcrumb="Início">
      <h1 className="text-2xl font-bold text-grena-escuro">Painel Futebol Profissional</h1>
      <p className="mt-1 text-sm text-neutral-500">Um resumo do que precisa de atenção esta semana.</p>
      <div className="mt-4">
        <DashboardView {...dashboardProps} />
      </div>
    </AppShell>
  );
}
