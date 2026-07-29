export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import {
  RelatorioDespesasDocument,
  type RelatorioDespesasPdfCategoria,
} from "@/lib/pdf/relatorio-despesas-document";
import { getAssinaturasFinanceiroBase } from "@/lib/pdf/assinaturas";
import type { GastoJogoBaseComCategoriaRow, JogoBaseRow } from "@/lib/supabase/types";

/** Espelha `app/jogos/[id]/financeiro/despesas/pdf/route.tsx` para o Futebol de Base. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos_base").select("*").eq("id", params.id).single();
  if (!jogoData) return new NextResponse("Jogo não encontrado.", { status: 404 });
  const jogo = jogoData as JogoBaseRow;

  const [{ data: gastosData }, adversarioLogoUrl, { assinatura1, assinatura2 }] = await Promise.all([
    supabase
      .from("gastos_jogo_base")
      .select("*, categoria:categorias_gasto(nome)")
      .eq("jogo_id", params.id)
      .order("created_at", { ascending: true }),
    getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
    getAssinaturasFinanceiroBase(supabase),
  ]);
  const gastos = ((gastosData ?? []) as GastoJogoBaseComCategoriaRow[]).filter(
    (g) => g.valor_efetuado !== null,
  );

  if (gastos.length === 0) {
    return new NextResponse("Ainda não há despesas efetuadas lançadas para este jogo.", { status: 400 });
  }

  const categoriasMap = new Map<string, RelatorioDespesasPdfCategoria>();
  for (const g of gastos) {
    const nomeCategoria = g.categoria?.nome ?? "Outros";
    const grupo = categoriasMap.get(nomeCategoria) ?? { nome: nomeCategoria, gastos: [] };
    grupo.gastos.push({ data: g.data, descricao: g.descricao, valorEfetuado: g.valor_efetuado as number });
    categoriasMap.set(nomeCategoria, grupo);
  }
  const categorias = Array.from(categoriasMap.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );
  const totalGeral = gastos.reduce((soma, g) => soma + (g.valor_efetuado as number), 0);

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <RelatorioDespesasDocument
      jogo={jogo}
      juventusLogoSrc={juventusLogoSrc}
      adversarioLogoSrc={adversarioLogoUrl}
      categorias={categorias}
      totalGeral={totalGeral}
      geradoEm={new Date()}
      assinatura1={assinatura1}
      assinatura2={assinatura2}
      departamento="base"
    />,
  );

  const nomeArquivo = `relatorio-despesas-juventus-x-${jogo.adversario_nome
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${jogo.data_jogo}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
