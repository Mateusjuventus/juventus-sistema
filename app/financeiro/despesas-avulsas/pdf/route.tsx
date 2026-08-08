export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getAssinaturasFinanceiro } from "@/lib/pdf/assinaturas";
import {
  DespesasAvulsasDocument,
  type DespesaAvulsaPdfCategoria,
  type DespesaAvulsaPdfItem,
} from "@/lib/pdf/despesas-avulsas-document";
import type { DespesaAvulsaComCategoriaRow, JogoRow } from "@/lib/supabase/types";

function confrontoResumo(jogo: JogoRow): string {
  const nome = jogo.mandante ? `Juventus x ${jogo.adversario_nome}` : `${jogo.adversario_nome} x Juventus`;
  const [ano, mes, dia] = jogo.data_jogo.split("-");
  return `${nome} (${dia}/${mes})`;
}

export async function GET() {
  const supabase = createClient();

  const [{ data: despesasData }, { data: vinculosData }, { assinatura1, assinatura2 }] = await Promise.all([
    supabase.from("despesas_avulsas").select("*, categoria:categorias_gasto(nome)"),
    supabase
      .from("despesas_avulsas_jogos")
      .select("despesa_id, jogo:jogos(id, mandante, adversario_nome, data_jogo)"),
    getAssinaturasFinanceiro(supabase),
  ]);

  const despesas = (despesasData ?? []) as DespesaAvulsaComCategoriaRow[];

  if (despesas.length === 0) {
    return new NextResponse("Ainda não há despesas avulsas lançadas.", { status: 400 });
  }

  const jogosPorDespesa = new Map<string, string[]>();
  for (const v of (vinculosData ?? []) as unknown as { despesa_id: string; jogo: JogoRow | null }[]) {
    if (!v.jogo) continue;
    const lista = jogosPorDespesa.get(v.despesa_id) ?? [];
    lista.push(confrontoResumo(v.jogo));
    jogosPorDespesa.set(v.despesa_id, lista);
  }

  const totalPrevisto = despesas.reduce((soma, d) => soma + d.valor_previsto, 0);
  const totalEfetuado = despesas.reduce((soma, d) => soma + (d.valor_efetuado ?? 0), 0);

  const porCategoria = new Map<string, DespesaAvulsaPdfItem[]>();
  for (const d of despesas) {
    const nome = d.categoria?.nome ?? "Outros";
    const lista = porCategoria.get(nome) ?? [];
    lista.push({
      data: d.data,
      descricao: d.descricao,
      valorPrevisto: d.valor_previsto,
      valorEfetuado: d.valor_efetuado,
      jogosRelacionados: jogosPorDespesa.get(d.id) ?? [],
    });
    porCategoria.set(nome, lista);
  }
  const categorias: DespesaAvulsaPdfCategoria[] = Array.from(porCategoria.entries())
    .map(([nome, despesasDaCategoria]) => ({ nome, despesas: despesasDaCategoria }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <DespesasAvulsasDocument
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
      categorias={categorias}
      totalPrevisto={totalPrevisto}
      totalEfetuado={totalEfetuado}
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
