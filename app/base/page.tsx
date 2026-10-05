import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { JuventusCrest } from "@/components/juventus-crest";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasProgramacao } from "@/lib/programacao/permissoes";
import { buscarSemana, buscarCatalogo, buscarJogosParaSelecao } from "@/lib/programacao/queries";
import { buscarMicrocicloTexto } from "@/lib/programacao/microciclo-data";
import { inicioDaSemana } from "@/lib/programacao/semana";
import { hojeBrasilia } from "@/lib/data-brasil";
import { ehCategoriaBaseValida, TODAS_CATEGORIAS_BASE, type CategoriaBase } from "@/lib/auth/categorias-base";
import { ProgramacaoView } from "@/components/programacao/programacao-view";

/**
 * Início do Futebol de Base — desde 30/08 é direto a Programação Semanal (ver docs/superpowers/
 * specs/2026-08-30-area-treinador-programacao-design.md), não mais uma grade de cartões por
 * módulo: os outros módulos (Atletas, Jogos, Financeiro etc.) continuam a um clique de distância
 * na barra lateral (`AppShell`), então a grade virou navegação duplicada. Mesmo componente
 * (`ProgramacaoView`) e mesmo raciocínio de `app/treinador/page.tsx` (onde a Programação já era o
 * Início), só trocando o container (`AppShell` em vez do cabeçalho do treinador) e a lista de
 * categorias disponíveis (aqui é sempre as 7).
 *
 * A Programação deixou de ser um módulo com checkbox próprio em `/usuarios` (ver histórico de
 * `lib/auth/modulos-base.ts`) — `getCategoriasProgramacao()` já garante as 7 categorias pra
 * qualquer pessoa com o departamento Futebol de Base liberado, sem permissão extra.
 */
export default async function BasePage({
  searchParams,
}: {
  searchParams: { semana?: string; categoria?: string };
}) {
  const supabase = createClient();
  const categorias = await getCategoriasProgramacao(supabase);

  if (categorias.length === 0) {
    return (
      <AppShell departamento="futebol_base">
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
    <AppShell departamento="futebol_base">
      <div className="mt-2 flex flex-col items-center gap-2 text-center">
        <JuventusCrest className="h-14 w-auto" />
        <h1 className="text-3xl font-bold text-grena-escuro">Futebol de Base</h1>
      </div>

      <div className="mt-6">
        <ProgramacaoView
          basePath="/base"
          categoriaAtiva={categoriaAtiva}
          categoriasDisponiveis={categorias}
          inicioSemana={inicioSemana}
          atividades={atividades}
          jogosParaSelecao={jogosParaSelecao}
          catalogo={catalogo}
          microcicloTexto={microcicloTexto}
          permitirProgramacaoGeral
        />
      </div>
    </AppShell>
  );
}
