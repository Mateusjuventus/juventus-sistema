import { AppShell } from "@/components/app-shell";
import { JuventusCrest } from "@/components/juventus-crest";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasProgramacao } from "@/lib/programacao/permissoes";
import { getModulosBasePermitidos, isMaster } from "@/lib/auth/role";
import { hojeBrasilia } from "@/lib/data-brasil";
import {
  buscarProximosJogos,
  buscarContratosAVencer,
  buscarAniversariantesDoMes,
  buscarAlertasCalendario,
  buscarAlertasCompeticao,
  buscarAlertasDocumentos,
  buscarAtletasEmDm,
  buscarSolicitacoesPendentes,
  buscarProgramacaoDeHoje,
} from "@/lib/dashboard/queries";
import { DashboardView, type DashboardViewProps } from "@/components/dashboard/dashboard-view";

/**
 * Início do Futebol de Base — Dashboard/Painel principal desde 14/11/2026 (ver docs/superpowers/
 * specs/2026-11-14-dashboard-principal-design.md, pedido do Mateus). Até essa data este conteúdo
 * era a Programação Semanal, Home da Base desde 30/08 (ver histórico em `app/base/programacao/
 * page.tsx`, pra onde ela se mudou) — o item da sidebar "Programação" continua existindo, só
 * deixou de ser a Home. O brasão + "Futebol de Base" (identidade visual de entrada no
 * departamento) se mudam junto, pra continuar sendo a primeira coisa que aparece.
 *
 * 7 blocos (ver `components/dashboard/dashboard-view.tsx`), cada um já filtrado por módulo
 * liberado (`getModulosBasePermitidos`, NUNCA checagem só no client) e pelas categorias que o
 * usuário pode ver (`getCategoriasProgramacao` — as 7, ou só a(s) do treinador) — mesma régua que
 * `app/atletas/page.tsx`/`app/base/jogos/page.tsx` já usam, nenhuma nova.
 */
export default async function BasePage() {
  const supabase = createClient();
  const categorias = await getCategoriasProgramacao(supabase);

  if (categorias.length === 0) {
    return (
      <AppShell departamento="futebol_base" breadcrumb="Início">
        <div className="mt-2 flex flex-col items-center gap-2 text-center">
          <JuventusCrest className="h-14 w-auto" />
          <h1 className="text-3xl font-bold text-grena-escuro">Futebol de Base</h1>
        </div>
        <div className="card mx-auto mt-6 max-w-md p-8 text-center text-neutral-500">
          Você não tem acesso a nenhum módulo do Futebol de Base ainda. Fale com o responsável pelo
          seu cadastro.
        </div>
      </AppShell>
    );
  }

  const hojeStr = hojeBrasilia();

  const [modulosBasePermitidos, master, { data: userData }] = await Promise.all([
    getModulosBasePermitidos(supabase),
    isMaster(supabase),
    supabase.auth.getUser(),
  ]);
  const userId = userData.user?.id ?? null;

  const podeJogos = modulosBasePermitidos.includes("jogos");
  const podeAtletas = modulosBasePermitidos.includes("atletas");
  const podeComissao = modulosBasePermitidos.includes("comissao_tecnica");
  const podeAniversariantes = podeAtletas || podeComissao;
  const podeCompeticoes = modulosBasePermitidos.includes("competicoes");
  const podeTermos = false; // Termos de Retirada não é um módulo da Base hoje (ver lib/auth/modulos-base.ts).
  const podeDm = modulosBasePermitidos.includes("departamento_medico");
  const podeSolicitacoes = modulosBasePermitidos.includes("solicitacoes");

  const [
    jogos,
    contratos,
    aniversariantesTodos,
    alertasCalendario,
    alertasCompeticao,
    alertasDocumentos,
    atletasDm,
    solicitacoes,
    programacaoHoje,
  ] = await Promise.all([
    podeJogos ? buscarProximosJogos(supabase, categorias, hojeStr) : Promise.resolve(null),
    podeAtletas ? buscarContratosAVencer(supabase, categorias, hojeStr) : Promise.resolve(null),
    podeAniversariantes ? buscarAniversariantesDoMes(supabase, categorias, hojeStr) : Promise.resolve(null),
    buscarAlertasCalendario(supabase, hojeStr),
    podeCompeticoes ? buscarAlertasCompeticao(supabase, "base", categorias, hojeStr) : Promise.resolve([]),
    podeTermos ? buscarAlertasDocumentos(supabase, hojeStr) : Promise.resolve([]),
    podeDm ? buscarAtletasEmDm(supabase, categorias) : Promise.resolve(null),
    podeSolicitacoes ? buscarSolicitacoesPendentes(supabase, "solicitacoes_base", master, userId) : Promise.resolve(null),
    buscarProgramacaoDeHoje(supabase, categorias, hojeStr),
  ]);

  const aniversariantes = podeAniversariantes
    ? {
        itens: (aniversariantesTodos ?? []).filter(
          (a) => (a.origem === "atleta" && podeAtletas) || (a.origem === "comissao_tecnica" && podeComissao),
        ),
      }
    : null;

  const dashboardProps: DashboardViewProps = {
    jogos: jogos ? { itens: jogos, href: "/base/jogos" } : null,
    contratos: contratos ? { itens: contratos } : null,
    aniversariantes,
    alertas: {
      itens: [...alertasCalendario, ...alertasCompeticao, ...alertasDocumentos].sort(
        (a, b) => a.diasRestantes - b.diasRestantes,
      ),
    },
    atletasDm: atletasDm ? { itens: atletasDm, href: "/atletas" } : null,
    solicitacoes: solicitacoes ? { itens: solicitacoes, href: "/base/solicitacoes" } : null,
    programacaoHoje: { itens: programacaoHoje, href: "/base/programacao" },
  };

  return (
    <AppShell departamento="futebol_base" breadcrumb="Início">
      <div className="mt-2 flex flex-col items-center gap-2 text-center">
        <JuventusCrest className="h-14 w-auto" />
        <h1 className="text-3xl font-bold text-grena-escuro">Futebol de Base</h1>
      </div>

      <div className="mt-6">
        <DashboardView {...dashboardProps} />
      </div>
    </AppShell>
  );
}
