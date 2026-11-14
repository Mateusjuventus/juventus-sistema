import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasProgramacao } from "@/lib/programacao/permissoes";
import { buscarSemana, buscarCatalogo, buscarJogosParaSelecao } from "@/lib/programacao/queries";
import { buscarMicrocicloTexto } from "@/lib/programacao/microciclo-data";
import { inicioDaSemana } from "@/lib/programacao/semana";
import { hojeBrasilia } from "@/lib/data-brasil";
import { ehCategoriaBaseValida, TODAS_CATEGORIAS_BASE, type CategoriaBase } from "@/lib/auth/categorias-base";
import { ProgramacaoView } from "@/components/programacao/programacao-view";

/**
 * Programação Semanal do Futebol de Base — ver docs/superpowers/specs/2026-08-30-area-treinador-
 * programacao-design.md pra origem desta tela. Até 14/11/2026 este conteúdo vivia em
 * `app/base/page.tsx` (era a Home do departamento, desde 30/08); o pedido do Mateus nessa data (ver
 * docs/superpowers/specs/2026-11-14-dashboard-principal-design.md) trocou a Home pelo Dashboard/
 * Painel principal, e a Programação se mudou pra esta rota própria — mesmo componente
 * (`ProgramacaoView`), mesmas consultas, só o container que muda. Continua acessível pela sidebar
 * como item fixo "Programação" (ver `components/app-shell.tsx`).
 *
 * A Programação deixou de ser um módulo com checkbox próprio em `/usuarios` (ver histórico de
 * `lib/auth/modulos-base.ts`) — `getCategoriasProgramacao()` já garante as 7 categorias pra
 * qualquer pessoa com o departamento Futebol de Base liberado, sem permissão extra.
 */
export default async function BaseProgramacaoPage({
  searchParams,
}: {
  searchParams: { semana?: string; categoria?: string };
}) {
  const supabase = createClient();
  const categorias = await getCategoriasProgramacao(supabase);

  if (categorias.length === 0) {
    return (
      <AppShell departamento="futebol_base" breadcrumb="Programação">
        <div className="card mx-auto mt-6 max-w-md p-8 text-center text-neutral-500">
          Você não tem acesso a nenhum módulo do Futebol de Base ainda. Fale com o responsável pelo
          seu cadastro.
        </div>
      </AppShell>
    );
  }

  const categoriaAtiva: CategoriaBase =
    searchParams.categoria && ehCategoriaBaseValida(searchParams.categoria) && categorias.includes(searchParams.categoria)
      ? searchParams.categoria
      : TODAS_CATEGORIAS_BASE[0];

  const inicioSemana = searchParams.semana && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.semana)
    ? inicioDaSemana(searchParams.semana)
    : inicioDaSemana(hojeBrasilia());

  const [atividades, catalogo, jogosParaSelecao, microcicloTexto] = await Promise.all([
    buscarSemana(supabase, categoriaAtiva, inicioSemana),
    buscarCatalogo(supabase, categoriaAtiva),
    buscarJogosParaSelecao(supabase, categoriaAtiva),
    buscarMicrocicloTexto(supabase, categoriaAtiva),
  ]);

  return (
    <AppShell departamento="futebol_base" breadcrumb="Programação">
      <ProgramacaoView
        basePath="/base/programacao"
        categoriaAtiva={categoriaAtiva}
        categoriasDisponiveis={categorias}
        inicioSemana={inicioSemana}
        atividades={atividades}
        jogosParaSelecao={jogosParaSelecao}
        catalogo={catalogo}
        microcicloTexto={microcicloTexto}
        permitirProgramacaoGeral
      />
    </AppShell>
  );
}
