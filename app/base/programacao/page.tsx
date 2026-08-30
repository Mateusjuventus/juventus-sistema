import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasProgramacao } from "@/lib/programacao/permissoes";
import { buscarSemana, buscarCatalogo, buscarJogosParaSelecao } from "@/lib/programacao/queries";
import { inicioDaSemana } from "@/lib/programacao/semana";
import { hojeBrasilia } from "@/lib/data-brasil";
import { ehCategoriaBaseValida, TODAS_CATEGORIAS_BASE, type CategoriaBase } from "@/lib/auth/categorias-base";
import { ProgramacaoView } from "@/components/programacao/programacao-view";

/**
 * Programação Semanal do lado da Base — mesmo componente de `/treinador` (`ProgramacaoView`), só
 * trocando o container (`AppShell` em vez do cabeçalho próprio do treinador) e a lista de categorias
 * disponíveis: aqui é sempre as 7, com acesso total de edição, sem a trava de `categorias_treinador`
 * (ver docs/superpowers/specs/2026-08-30-area-treinador-programacao-design.md, item 5 do escopo).
 * `getCategoriasProgramacao()` já devolve as 7 pra quem chega até aqui (master, ou regular com o
 * módulo "Programação" liberado — middleware barra o resto antes de renderizar) — mas resolvemos de
 * novo explicitamente aqui em vez de confiar cegamente nisso, pro dia em que o módulo virar algo
 * mais granular não vazar categoria nenhuma por engano.
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
      <AppShell departamento="futebol_base">
        <Link href="/base" className="text-sm font-medium text-grena hover:underline">
          ← Voltar
        </Link>
        <div className="card mt-4 p-8 text-center text-neutral-500">
          Você não tem permissão para acessar a Programação.
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

  const [atividades, catalogo, jogosParaSelecao] = await Promise.all([
    buscarSemana(supabase, categoriaAtiva, inicioSemana),
    buscarCatalogo(supabase, categoriaAtiva),
    buscarJogosParaSelecao(supabase, categoriaAtiva),
  ]);

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>

      <h1 className="mb-4 mt-2 text-2xl font-bold text-grena-escuro">Programação Semanal</h1>

      <ProgramacaoView
        basePath="/base/programacao"
        categoriaAtiva={categoriaAtiva}
        categoriasDisponiveis={categorias}
        inicioSemana={inicioSemana}
        atividades={atividades}
        jogosParaSelecao={jogosParaSelecao}
        catalogo={catalogo}
      />
    </AppShell>
  );
}
