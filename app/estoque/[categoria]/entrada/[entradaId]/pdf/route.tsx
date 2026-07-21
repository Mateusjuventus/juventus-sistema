export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { parseCategoria } from "@/lib/estoque/categoria";
import { EstoqueEntradaDocument, type EstoqueEntradaPdfItem } from "@/lib/pdf/estoque-entrada-document";
import type { EstoqueEntradaItemRow, EstoqueEntradaRow } from "@/lib/supabase/types";

export async function GET(
  _request: Request,
  { params }: { params: { categoria: string; entradaId: string } },
) {
  const categoria = parseCategoria(params.categoria);
  if (!categoria) return new NextResponse("Categoria inválida.", { status: 404 });

  const supabase = createClient();
  const [{ data: entradaData }, { data: itensData }] = await Promise.all([
    supabase.from("estoque_entradas").select("*").eq("id", params.entradaId).eq("categoria", categoria).single(),
    supabase
      .from("estoque_entrada_itens")
      .select("*")
      .eq("entrada_id", params.entradaId)
      .order("ordem", { ascending: true }),
  ]);
  if (!entradaData) return new NextResponse("Ficha não encontrada.", { status: 404 });

  const entrada = entradaData as EstoqueEntradaRow;
  const itensRows = (itensData ?? []) as EstoqueEntradaItemRow[];
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
      entrada={{
        categoria,
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
      "Content-Disposition": `inline; filename="entrada-estoque-${categoria}-${String(entrada.numero).padStart(4, "0")}.pdf"`,
    },
  });
}
