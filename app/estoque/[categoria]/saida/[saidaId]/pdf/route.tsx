export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { parseCategoria } from "@/lib/estoque/categoria";
import { EstoqueFichaDocument, type EstoqueFichaPdfItem } from "@/lib/pdf/estoque-ficha-document";
import type { EstoqueSaidaItemRow, EstoqueSaidaRow } from "@/lib/supabase/types";

export async function GET(
  _request: Request,
  { params }: { params: { categoria: string; saidaId: string } },
) {
  const categoria = parseCategoria(params.categoria);
  if (!categoria) return new NextResponse("Categoria inválida.", { status: 404 });

  const supabase = createClient();
  const [{ data: saidaData }, { data: itensData }] = await Promise.all([
    supabase.from("estoque_saidas").select("*").eq("id", params.saidaId).eq("categoria", categoria).single(),
    supabase
      .from("estoque_saida_itens")
      .select("*")
      .eq("saida_id", params.saidaId)
      .order("ordem", { ascending: true }),
  ]);
  if (!saidaData) return new NextResponse("Ficha não encontrada.", { status: 404 });

  const saida = saidaData as EstoqueSaidaRow;
  const itensRows = (itensData ?? []) as EstoqueSaidaItemRow[];
  const itens: EstoqueFichaPdfItem[] = itensRows.map((item) => ({
    nome: item.nome,
    tamanho: item.tamanho,
    codigo: item.codigo,
    quantidade: Number(item.quantidade),
  }));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <EstoqueFichaDocument
      juventusLogoSrc={juventusLogoSrc}
      ficha={{
        categoria,
        numero: saida.numero,
        data: saida.data,
        nomeDestinatario: saida.nome_destinatario,
        funcao: saida.funcao,
        departamento: saida.departamento,
        observacoes: saida.observacoes,
      }}
      itens={itens}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ficha-estoque-${categoria}-${String(saida.numero).padStart(4, "0")}.pdf"`,
    },
  });
}
