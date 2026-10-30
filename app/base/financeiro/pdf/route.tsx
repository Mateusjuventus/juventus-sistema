export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getAssinaturasFinanceiroBase } from "@/lib/pdf/assinaturas";
import {
  RelatorioFinanceiroDocument,
  type RelatorioPdfCategoria,
  type RelatorioPdfJogo,
} from "@/lib/pdf/relatorio-financeiro-document";
import type { GastoJogoComCategoriaRow, JogoRow } from "@/lib/supabase/types";
import { TODAS_CATEGORIAS_BASE } from "@/lib/auth/categorias-base";

/** Espelha `app/financeiro/pdf/route.tsx` para o Futebol de Base. */
export async function GET() {
  const supabase = createClient();

  const [{ data: jogosData }, { assinatura1, assinatura2 }] = await Promise.all([
    supabase.from("jogos").select("*").in("categoria", TODAS_CATEGORIAS_BASE).order("data_jogo", { ascending: false }),
    getAssinaturasFinanceiroBase(supabase),
  ]);
  const jogos = (jogosData ?? []) as JogoRow[];
  const jogoIds = jogos.map((j) => j.id);

  // Desde a unificação de Jogos/Convocação (30/10/2026) `gastos_jogo` guarda os dois departamentos
  // juntos — filtra pelos jogos da Base buscados acima.
  const { data: gastosData } = jogoIds.length
    ? await supabase.from("gastos_jogo").select("*, categoria:categorias_gasto(nome)").in("jogo_id", jogoIds)
    : { data: [] };
  const gastos = (gastosData ?? []) as GastoJogoComCategoriaRow[];

  if (gastos.length === 0) {
    return new NextResponse("Ainda não há gastos lançados em nenhum jogo.", { status: 400 });
  }

  const totalPrevisto = gastos.reduce((soma, g) => soma + g.valor_previsto, 0);
  const totalEfetuado = gastos.reduce((soma, g) => soma + (g.valor_efetuado ?? 0), 0);

  const porCategoria = new Map<string, { previsto: number; efetuado: number }>();
  for (const g of gastos) {
    const nome = g.categoria?.nome ?? "Outros";
    const atual = porCategoria.get(nome) ?? { previsto: 0, efetuado: 0 };
    atual.previsto += g.valor_previsto;
    atual.efetuado += g.valor_efetuado ?? 0;
    porCategoria.set(nome, atual);
  }
  const categorias: RelatorioPdfCategoria[] = Array.from(porCategoria.entries())
    .map(([nome, valores]) => ({ nome, ...valores }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const gastosPorJogo = new Map<string, GastoJogoComCategoriaRow[]>();
  for (const g of gastos) {
    const lista = gastosPorJogo.get(g.jogo_id) ?? [];
    lista.push(g);
    gastosPorJogo.set(g.jogo_id, lista);
  }
  const jogosPdf: RelatorioPdfJogo[] = jogos
    .filter((j) => gastosPorJogo.has(j.id))
    .map((j) => {
      const gastosDoJogo = gastosPorJogo.get(j.id) ?? [];
      const previsto = gastosDoJogo.reduce((soma, g) => soma + g.valor_previsto, 0);
      const efetuado = gastosDoJogo.reduce((soma, g) => soma + (g.valor_efetuado ?? 0), 0);
      return {
        confronto: j.mandante ? `Juventus x ${j.adversario_nome}` : `${j.adversario_nome} x Juventus`,
        competicao: j.competicao,
        data: j.data_jogo,
        previsto,
        efetuado,
      };
    });

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <RelatorioFinanceiroDocument
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
      totalPrevisto={totalPrevisto}
      totalEfetuado={totalEfetuado}
      categorias={categorias}
      jogos={jogosPdf}
      despesasAvulsas={[]}
      assinatura1={assinatura1}
      assinatura2={assinatura2}
      departamento="base"
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="relatorio-prestacao-de-contas-base.pdf"',
    },
  });
}
