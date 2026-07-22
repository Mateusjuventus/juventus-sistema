export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildConcentracaoDataBase } from "@/lib/posters/concentracao-data";
import { nomeArquivoPoster } from "@/lib/posters/estilo";
import { ConcentracaoDocument } from "@/lib/pdf/concentracao-document";

/** Espelha `app/jogos/[id]/programacao/concentracao/pdf/route.tsx` para o Futebol de Base. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const dados = await buildConcentracaoDataBase(params.id);
  if (!dados) {
    return new NextResponse(
      "Preencha a data da concentração e adicione ao menos uma linha de cronograma antes de gerar o pôster.",
      { status: 400 },
    );
  }

  const buffer = await renderToBuffer(
    <ConcentracaoDocument
      mandante={dados.jogo.mandante}
      adversarioLogoSrc={dados.adversarioLogoUrl}
      dataFaixaTexto={dados.dataFaixaTexto}
      itens={dados.itens}
      regras={dados.regras}
    />,
  );

  const nomeArquivo = nomeArquivoPoster("concentracao", dados.jogo.adversario_nome, dados.jogo.data_jogo);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}.pdf"`,
    },
  });
}
