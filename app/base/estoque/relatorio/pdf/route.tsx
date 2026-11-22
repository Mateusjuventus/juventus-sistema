export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { formatCarimbo } from "@/lib/pdf/logistica-shared";
import { EstoqueRelatorioDocument, type EstoqueRelatorioPdfItem } from "@/lib/pdf/estoque-relatorio-document";
import type { EstoqueItemBaseRow } from "@/lib/supabase/types";
import { clube } from "@/lib/clube";

/** Espelha `app/estoque/[categoria]/relatorio/pdf/route.tsx` para o Futebol de Base. */
export async function GET() {
  const supabase = createClient();
  const { data } = await supabase.from("estoque_itens_base").select("*").order("nome", { ascending: true });
  const itensRows = (data ?? []) as EstoqueItemBaseRow[];
  const itens: EstoqueRelatorioPdfItem[] = itensRows.map((item) => ({
    nome: item.nome,
    codigo: item.codigo,
    mg: item.mg,
    tamanhos: item.tamanhos ?? {},
  }));

  const escudoClubePath = path.join(process.cwd(), "public", clube.escudo.completo);
  const escudoClubeSrc = { data: readFileSync(escudoClubePath), format: "png" as const };

  const buffer = await renderToBuffer(
    <EstoqueRelatorioDocument
      escudoClubeSrc={escudoClubeSrc}
      dados={{ categoria: "esportivo", geradoEm: formatCarimbo(new Date()) }}
      itens={itens}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="relatorio-estoque-base.pdf"',
    },
  });
}
