export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { EstoqueFichaDocument } from "@/lib/pdf/estoque-ficha-document";
import { clube } from "@/lib/clube";

/** Espelha `app/estoque/[categoria]/ficha-branca/pdf/route.tsx` para o Futebol de Base. */
export async function GET() {
  const escudoClubePath = path.join(process.cwd(), "public", clube.escudo.completo);
  const escudoClubeSrc = { data: readFileSync(escudoClubePath), format: "png" as const };

  const buffer = await renderToBuffer(
    <EstoqueFichaDocument
      escudoClubeSrc={escudoClubeSrc}
      subtitulo="Departamento de Futebol de Base"
      ficha={{
        categoria: "esportivo",
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
      "Content-Disposition": 'inline; filename="ficha-estoque-base-branca.pdf"',
    },
  });
}
