export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getAssinaturasFinanceiro } from "@/lib/pdf/assinaturas";
import {
  RelatorioFinanceiroDocument,
  type RelatorioPdfCategoria,
  type RelatorioPdfJogo,
} from "@/lib/pdf/relatorio-financeiro-document";
import type { GastoJogoComCategoriaRow, JogoRow } from "@/lib/supabase/types";

export async function GET() {
  const supabase = createClient();

  const [{ data: jogosData }, { data: gastosData }, { assinatura1, assinatura2 }] = await Promise.all([
    supabase.from("jogos").select("*").order("data_jogo", { ascending: false }),
    supabase.from("gastos_jogo").select("*, categoria:categorias_gasto(nome)"),
    getAssinaturasFinanceiro(supabase),
  ]);

  const jogos = (jogosData ?? []) as JogoRow[];
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

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <RelatorioFinanceiroDocument
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
      totalPrevisto={totalPrevisto}
      totalEfetuado={totalEfetuado}
      categorias={categorias}
      jogos={jogosPdf}
      assinatura1={assinatura1}
      assinatura2={assinatura2}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="relatorio-prestacao-de-contas.pdf"',
    },
  });
}
