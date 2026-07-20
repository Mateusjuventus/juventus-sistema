export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildRelacionadosDataBase } from "@/lib/posters/relacionados-data";
import { nomeArquivoPoster } from "@/lib/posters/estilo";
import { RelacionadosDocument } from "@/lib/pdf/relacionados-document";

/** Espelha `app/jogos/[id]/relacionados/pdf/route.tsx` para o Futebol de Base. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const dados = await buildRelacionadosDataBase(params.id);
  if (!dados) {
    return new NextResponse(
      "Ainda não há convocação registrada para este jogo. Registre a convocação antes de gerar o pôster de Relacionados.",
      { status: 400 },
    );
  }

  const buffer = await renderToBuffer(
    <RelacionadosDocument
      competicao={dados.jogo.competicao}
      mandante={dados.jogo.mandante}
      adversarioLogoSrc={dados.adversarioLogoUrl}
      confrontoTexto={dados.confrontoTexto}
      dadosJogoTexto={dados.dadosJogoTexto}
      colunaEsquerda={dados.colunaEsquerda}
      colunaDireita={dados.colunaDireita}
    />,
  );

  const nomeArquivo = nomeArquivoPoster("relacionados", dados.jogo.adversario_nome, dados.jogo.data_jogo);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}.pdf"`,
    },
  });
}
