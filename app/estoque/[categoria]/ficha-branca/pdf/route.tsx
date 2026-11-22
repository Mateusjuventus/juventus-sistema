export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { parseCategoria } from "@/lib/estoque/categoria";
import { EstoqueFichaDocument } from "@/lib/pdf/estoque-ficha-document";
import { clube } from "@/lib/clube";

/** Ficha em branco (numero: null), pra imprimir e preencher à mão quando não há computador à mão
 * na hora da entrega — mesma ideia do "Imprimir Ficha em Branco" do protótipo original. */
export async function GET(_request: Request, { params }: { params: { categoria: string } }) {
  const categoria = parseCategoria(params.categoria);
  if (!categoria) return new NextResponse("Categoria inválida.", { status: 404 });

  const escudoClubePath = path.join(process.cwd(), "public", clube.escudo.completo);
  const escudoClubeSrc = { data: readFileSync(escudoClubePath), format: "png" as const };

  const buffer = await renderToBuffer(
    <EstoqueFichaDocument
      escudoClubeSrc={escudoClubeSrc}
      ficha={{
        categoria,
        numero: null,
        data: null,
        nomeDestinatario: null,
        funcao: null,
        departamento: null,
        observacoes: null,
      }}
      itens={[]}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ficha-estoque-${categoria}-branca.pdf"`,
    },
  });
}
