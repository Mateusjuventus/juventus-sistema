import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasProgramacaoProfissional } from "@/lib/programacao/permissoes";
import type { CategoriaProgramacao } from "@/lib/programacao/categoria-programacao";
import { getModulosPermitidos, isMaster } from "@/lib/auth/role";
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
 * Início do Futebol Profissional — Dashboard/Painel principal desde 14/11/2026 (ver
 * docs/superpowers/specs/2026-11-14-dashboard-principal-design.md, pedido do Mateus). Até essa
 * data este conteúdo era a Programação Semanal (ver histórico em `app/profissional/programacao/
 * page.tsx`, pra onde ela se mudou) — o item da sidebar "Programação" continua existindo, só
 * deixou de ser a Home.
 *
 * 7 blocos (ver `components/dashboard/dashboard-view.tsx`), cada um já filtrado por módulo
 * liberado (`getModulosPermitidos`, NUNCA checagem só no client) e pela categoria "profissional" —
 * mesma régua que `app/atletas/page.tsx`/`app/jogos/page.tsx` já usam, nenhuma nova.
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

  const categorias: CategoriaProgramacao[] = ["profissional"];
  const hojeStr = hojeBrasilia();

  const [modulosPermitidos, master, { data: userData }] = await Promise.all([
    getModulosPermitidos(supabase),
    isMaster(supabase),
    supabase.auth.getUser(),
  ]);
  const userId = userData.user?.id ?? null;

  const podeJogos = modulosPermitidos.includes("jogos");
  const podeAtletas = modulosPermitidos.includes("atletas");
  const podeComissao = modulosPermitidos.includes("comissao_tecnica");
  const podeAniversariantes = podeAtletas || podeComissao;
  const podeCompeticoes = modulosPermitidos.includes("competicoes");
  const podeTermos = modulosPermitidos.includes("termos_retirada");
  const podeDm = modulosPermitidos.includes("departamento_medico");
  const podeSolicitacoes = modulosPermitidos.includes("solicitacoes");

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
    // Uma chamada só, mesmo quando só uma das duas fontes (atleta/comissão técnica) está liberada —
    // ela sempre busca as duas juntas (ver `buscarAniversariantesDoMes`); o resultado é filtrado por
    // `origem` embaixo, conforme cada módulo liberado. Evita reimplementar a consulta em duas
    // versões só pra separar as fontes.
    podeAniversariantes ? buscarAniversariantesDoMes(supabase, categorias, hojeStr) : Promise.resolve(null),
    buscarAlertasCalendario(supabase, hojeStr),
    podeCompeticoes ? buscarAlertasCompeticao(supabase, "profissional", categorias, hojeStr) : Promise.resolve([]),
    podeTermos ? buscarAlertasDocumentos(supabase, hojeStr) : Promise.resolve([]),
    podeDm ? buscarAtletasEmDm(supabase, categorias) : Promise.resolve(null),
    podeSolicitacoes ? buscarSolicitacoesPendentes(supabase, "solicitacoes", master, userId) : Promise.resolve(null),
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
    jogos: jogos ? { itens: jogos, href: "/jogos" } : null,
    contratos: contratos ? { itens: contratos } : null,
    aniversariantes,
    alertas: {
      itens: [...alertasCalendario, ...alertasCompeticao, ...alertasDocumentos].sort(
        (a, b) => a.diasRestantes - b.diasRestantes,
      ),
    },
    atletasDm: atletasDm ? { itens: atletasDm, href: "/atletas" } : null,
    solicitacoes: solicitacoes ? { itens: solicitacoes, href: "/solicitacoes" } : null,
    programacaoHoje: { itens: programacaoHoje, href: "/profissional/programacao" },
  };

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
