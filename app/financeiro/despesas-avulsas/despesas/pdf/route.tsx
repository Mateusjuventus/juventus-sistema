export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getAssinaturasFinanceiro } from "@/lib/pdf/assinaturas";
import {
  DespesasAvulsasRelatorioDocument,
  type DespesaAvulsaRelatorioPdfCategoria,
  type DespesaAvulsaRelatorioPdfItem,
} from "@/lib/pdf/despesas-avulsas-relatorio-document";
import type { DespesaAvulsaComCategoriaRow, JogoRow } from "@/lib/supabase/types";

function confrontoResumo(jogo: JogoRow): string {
  const nome = jogo.mandante ? `Juventus x ${jogo.adversario_nome}` : `${jogo.adversario_nome} x Juventus`;
  const [ano, mes, dia] = jogo.data_jogo.split("-");
  return `${nome} (${dia}/${mes})`;
}

/** PDF "Relatório de Despesas — Despesas Avulsas" (só efetuado) — mesmo espírito do PDF de
 * despesas de cada jogo (`/jogos/[id]/financeiro/despesas/pdf`), mesma rota aninhada
 * "despesas/pdf" ao lado do "Orçamento Previsto" em `/financeiro/despesas-avulsas/pdf`. */
export async function GET() {
  const supabase = createClient();

  const [{ data: despesasData }, { data: vinculosData }, { assinatura1, assinatura2 }] = await Promise.all([
    supabase.from("despesas_avulsas").select("*, categoria:categorias_gasto(nome)"),
    supabase
      .from("despesas_avulsas_jogos")
      .select("despesa_id, jogo:jogos(id, mandante, adversario_nome, data_jogo)"),
    getAssinaturasFinanceiro(supabase),
  ]);

  const despesas = ((despesasData ?? []) as DespesaAvulsaComCategoriaRow[]).filter(
    (d) => d.valor_efetuado !== null,
  );

  if (despesas.length === 0) {
    return new NextResponse("Ainda não há despesas avulsas efetuadas lançadas.", { status: 400 });
  }

  const jogosPorDespesa = new Map<string, string[]>();
  for (const v of (vinculosData ?? []) as unknown as { despesa_id: string; jogo: JogoRow | null }[]) {
    if (!v.jogo) continue;
    const lista = jogosPorDespesa.get(v.despesa_id) ?? [];
    lista.push(confrontoResumo(v.jogo));
    jogosPorDespesa.set(v.despesa_id, lista);
  }

  const totalGeral = despesas.reduce((soma, d) => soma + (d.valor_efetuado as number), 0);

  const porCategoria = new Map<string, DespesaAvulsaRelatorioPdfItem[]>();
  for (const d of despesas) {
    const nome = d.categoria?.nome ?? "Outros";
    const lista = porCategoria.get(nome) ?? [];
    lista.push({
      data: d.data,
      descricao: d.descricao,
      valorEfetuado: d.valor_efetuado as number,
      jogosRelacionados: jogosPorDespesa.get(d.id) ?? [],
    });
    porCategoria.set(nome, lista);
  }
  const categorias: DespesaAvulsaRelatorioPdfCategoria[] = Array.from(porCategoria.entries())
    .map(([nome, despesasDaCategoria]) => ({ nome, despesas: despesasDaCategoria }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <DespesasAvulsasRelatorioDocument
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
      categorias={categorias}
      totalGeral={totalGeral}
      assinatura1={assinatura1}
      assinatura2={assinatura2}
      departamento="profissional"
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="relatorio-despesas-avulsas.pdf"',
    },
  });
}
