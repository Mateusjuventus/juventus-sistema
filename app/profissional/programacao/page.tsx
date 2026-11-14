import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasProgramacaoProfissional } from "@/lib/programacao/permissoes";
import { buscarSemana, buscarCatalogo, buscarJogosParaSelecao } from "@/lib/programacao/queries";
import { buscarMicrocicloTexto } from "@/lib/programacao/microciclo-data";
import { inicioDaSemana } from "@/lib/programacao/semana";
import { hojeBrasilia } from "@/lib/data-brasil";
import { ProgramacaoView } from "@/components/programacao/programacao-view";

/**
 * Programação Semanal do Futebol Profissional — ver docs/superpowers/specs/2026-10-05-
 * programacao-profissional-design.md pra origem desta tela. Até 14/11/2026 este conteúdo vivia em
 * `app/profissional/page.tsx` (era a Home do departamento); o pedido do Mateus nessa data (ver
 * docs/superpowers/specs/2026-11-14-dashboard-principal-design.md) trocou a Home pelo Dashboard/
 * Painel principal, e a Programação se mudou pra esta rota própria — mesmo componente
 * (`ProgramacaoView`), mesmas consultas, só o container que muda de `app/profissional/page.tsx`
 * pra aqui. Continua acessível pela sidebar como item fixo "Programação" (ver `components/
 * app-shell.tsx`).
 *
 * Catálogo de subatividades do Profissional começa vazio (nenhuma pré-cadastrada) — o Mateus
 * cadastra pelo próprio "+ Nova Subatividade" conforme for precisando, igual uma categoria nova da
 * Base começaria. `jogosParaSelecao` também vem sempre vazio (jogos do Profissional moram em
 * `jogos`, não têm o conceito de "categoria" pra esse seletor — ver a spec original, "Fora de
 * escopo"): as atividades de tipo Jogo Oficial/Jogo Treino são preenchidas manualmente aqui, sem o
 * atalho de selecionar um jogo já cadastrado que a Base tem.
 */
export default async function ProfissionalProgramacaoPage({
  searchParams,
}: {
  searchParams: { semana?: string; categoria?: string };
}) {
  const supabase = createClient();
  const categorias = await getCategoriasProgramacaoProfissional(supabase);

  if (categorias.length === 0) {
    return (
      <AppShell breadcrumb="Programação">
        <div className="card mx-auto mt-6 max-w-md p-8 text-center text-neutral-500">
          Você não tem acesso ao Futebol Profissional ainda. Fale com o responsável pelo seu
          cadastro.
        </div>
      </AppShell>
    );
  }

  const categoriaAtiva = "profissional" as const;
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
    <AppShell breadcrumb="Programação">
      <ProgramacaoView
        basePath="/profissional/programacao"
        categoriaAtiva={categoriaAtiva}
        categoriasDisponiveis={categorias}
        inicioSemana={inicioSemana}
        atividades={atividades}
        jogosParaSelecao={jogosParaSelecao}
        catalogo={catalogo}
        microcicloTexto={microcicloTexto}
      />
    </AppShell>
  );
}
