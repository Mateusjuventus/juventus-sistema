export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { EstoqueEntradaDocument, type EstoqueEntradaPdfItem } from "@/lib/pdf/estoque-entrada-document";
import type { EstoqueEntradaItemBaseRow, EstoqueEntradaBaseRow } from "@/lib/supabase/types";

/** Espelha `app/estoque/[categoria]/entrada/[entradaId]/pdf/route.tsx` para o Futebol de Base —
 * reaproveita o mesmo `EstoqueEntradaDocument`, sempre com `categoria: "esportivo"` (única
 * categoria que o Base tem) e o subtítulo trocado pra "Futebol de Base" (o padrão do documento diz
 * "Futebol Profissional"). */
export async function GET(_request: Request, { params }: { params: { entradaId: string } }) {
  const supabase = createClient();
  const [{ data: entradaData }, { data: itensData }] = await Promise.all([
    supabase.from("estoque_entradas_base").select("*").eq("id", params.entradaId).single(),
    supabase
      .from("estoque_entrada_itens_base")
      .select("*")
      .eq("entrada_id", params.entradaId)
      .order("ordem", { ascending: true }),
  ]);
  if (!entradaData) return new NextResponse("Ficha não encontrada.", { status: 404 });

  const entrada = entradaData as EstoqueEntradaBaseRow;
  const itensRows = (itensData ?? []) as EstoqueEntradaItemBaseRow[];
  const itens: EstoqueEntradaPdfItem[] = itensRows.map((item) => ({
    nome: item.nome,
    tamanho: item.tamanho,
    codigo: item.codigo,
    quantidade: Number(item.quantidade),
  }));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <EstoqueEntradaDocument
      juventusLogoSrc={juventusLogoSrc}
      subtitulo="Departamento de Futebol de Base"
      entrada={{
        categoria: "esportivo",
        numero: entrada.numero,
        data: entrada.data,
        fornecedor: entrada.fornecedor,
        notaFiscal: entrada.nota_fiscal,
        observacoes: entrada.observacoes,
      }}
      itens={itens}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="entrada-estoque-base-${String(entrada.numero).padStart(4, "0")}.pdf"`,
    },
  });
}
