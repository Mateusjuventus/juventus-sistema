import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { ehCategoriaBaseValida, type CategoriaBase } from "@/lib/auth/categorias-base";
import { TreinadorHeader } from "@/components/treinador/treinador-header";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { logout } from "@/app/actions";
import { buscarNotificacoes } from "@/lib/notificacoes/actions";
import { buscarSemana, buscarCatalogo, buscarJogosParaSelecao } from "@/lib/programacao/queries";
import { inicioDaSemana } from "@/lib/programacao/semana";
import { hojeBrasilia } from "@/lib/data-brasil";
import { ProgramacaoView } from "@/components/programacao/programacao-view";

/**
 * Início da Área do Treinador — a partir da Fase 4 do plano de implementação, deixou de ser a lista
 * de candidatos (que virou a aba "Atletas") e passa a ser a Programação Semanal (ver
 * docs/superpowers/specs/2026-08-30-area-treinador-programacao-design.md). Sempre abre na semana
 * atual; navegação de semana e seletor de categoria (quando o treinador atua em mais de uma) são
 * `Link`s com querystring, resolvidos aqui — `ProgramacaoView` só recebe os dados já carregados.
 */
export default async function TreinadorInicioPage({
  searchParams,
}: {
  searchParams: { semana?: string; categoria?: string };
}) {
  const supabase = createClient();
  const categorias = await getCategoriasTreinador(supabase);
  const notificacoes = await buscarNotificacoes();

  if (categorias.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-pagina px-4 py-10">
        <JuventusCrestMark className="h-12 w-12" />
        <p className="mt-4 max-w-sm text-center text-neutral-600">
          Você ainda não tem nenhuma categoria vinculada ao seu acesso. Fale com o responsável do
          Futebol de Base.
        </p>
        <form action={logout} className="mt-4">
          <button type="submit" className="btn-secondary btn-sm">
            Sair
          </button>
        </form>
      </main>
    );
  }

  const categoriaAtiva: CategoriaBase =
    searchParams.categoria && ehCategoriaBaseValida(searchParams.categoria) && categorias.includes(searchParams.categoria)
      ? searchParams.categoria
      : (categorias[0] as CategoriaBase);

  const inicioSemana = searchParams.semana && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.semana)
    ? inicioDaSemana(searchParams.semana)
    : inicioDaSemana(hojeBrasilia());

  const [atividades, catalogo, jogosParaSelecao] = await Promise.all([
    buscarSemana(supabase, categoriaAtiva, inicioSemana),
    buscarCatalogo(supabase, categoriaAtiva),
    buscarJogosParaSelecao(supabase, categoriaAtiva),
  ]);

  return (
    <div className="min-h-screen bg-pagina">
      <TreinadorHeader categorias={categorias} notificacoes={notificacoes} active="inicio" />

      <main className="mx-auto max-w-[1184px] px-4 py-6 sm:py-8">
        <ProgramacaoView
          basePath="/treinador"
          categoriaAtiva={categoriaAtiva}
          categoriasDisponiveis={categorias as CategoriaBase[]}
          inicioSemana={inicioSemana}
          atividades={atividades}
          jogosParaSelecao={jogosParaSelecao}
          catalogo={catalogo}
        />
      </main>
    </div>
  );
}
