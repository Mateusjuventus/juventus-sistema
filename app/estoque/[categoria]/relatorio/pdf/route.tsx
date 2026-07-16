export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { parseCategoria } from "@/lib/estoque/categoria";
import { formatCarimbo } from "@/lib/pdf/logistica-shared";
import { EstoqueRelatorioDocument, type EstoqueRelatorioPdfItem } from "@/lib/pdf/estoque-relatorio-document";
import type { EstoqueItemRow } from "@/lib/supabase/types";

/** Relatório em PDF do catálogo de Estoque (todos os itens e quantidades atuais de uma categoria). */
export async function GET(_request: Request, { params }: { params: { categoria: string } }) {
  const categoria = parseCategoria(params.categoria);
  if (!categoria) return new NextResponse("Categoria inválida.", { status: 404 });

  const supabase = createClient();
  const { data } = await supabase
    .from("estoque_itens")
    .select("*")
    .eq("categoria", categoria)
    .order("nome", { ascending: true });
  const itensRows = (data ?? []) as EstoqueItemRow[];
  const itens: EstoqueRelatorioPdfItem[] = itensRows.map((item) => ({
    nome: item.nome,
    codigo: item.codigo,
    mg: item.mg,
    tamanhos: item.tamanhos ?? {},
  }));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <EstoqueRelatorioDocument
      juventusLogoSrc={juventusLogoSrc}
      dados={{ categoria, geradoEm: formatCarimbo(new Date()) }}
      itens={itens}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-estoque-${categoria}.pdf"`,
    },
  });
}
