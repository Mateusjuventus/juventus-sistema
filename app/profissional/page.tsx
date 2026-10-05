import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasProgramacaoProfissional } from "@/lib/programacao/permissoes";
import { buscarSemana, buscarCatalogo, buscarJogosParaSelecao } from "@/lib/programacao/queries";
import { buscarMicrocicloTexto } from "@/lib/programacao/microciclo-data";
import { inicioDaSemana } from "@/lib/programacao/semana";
import { hojeBrasilia } from "@/lib/data-brasil";
import { ProgramacaoView } from "@/components/programacao/programacao-view";

/**
 * Início do Futebol Profissional — desde 05/10 é a Programação Semanal (ver docs/superpowers/
 * specs/2026-10-05-programacao-profissional-design.md), mesmo componente (`ProgramacaoView`) que a
 * Base já usa, tratando o time Profissional como uma única "categoria": `"profissional"` (ver
 * `lib/programacao/categoria-programacao.ts`). Sem abas de categoria (só uma opção, `ProgramacaoView`
 * já esconde a fileira sozinha quando `categoriasDisponiveis.length === 1`).
 *
 * Pedido do Mateus: "essa parte do inicio, ali fica a programação - Coloca Programação" — depois
 * confirmado (perguntas de clarificação) que a Programação SUBSTITUI o Início, e o antigo painel
 * (calendário + mural + próximo jogo + contratos vencendo + números-resumo) muda de lugar, virando
 * a tela "Calendário" (`app/profissional/calendario/page.tsx`), só com o calendário em si — os
 * outros widgets saem de circulação (ver a spec; o código continua no histórico do git).
 *
 * Catálogo de subatividades do Profissional começa vazio (nenhuma pré-cadastrada) — o Mateus
 * cadastra pelo próprio "+ Nova Subatividade" conforme for precisando, igual uma categoria nova da
 * Base começaria. `jogosParaSelecao` também vem sempre vazio (jogos do Profissional moram em
 * `jogos`, não em `jogos_base`, e não têm o conceito de "categoria" — ver a spec, "Fora de
 * escopo"): as atividades de tipo Jogo Oficial/Jogo Treino são preenchidas manualmente aqui, sem o
 * atalho de selecionar um jogo já cadastrado que a Base tem.
 */
export default async function ProfissionalPage({
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
        basePath="/profissional"
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
