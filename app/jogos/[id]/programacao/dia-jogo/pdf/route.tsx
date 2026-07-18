export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildDiaJogoData } from "@/lib/posters/dia-jogo-data";
import { nomeArquivoPoster } from "@/lib/posters/estilo";
import { DiaJogoDocument } from "@/lib/pdf/dia-jogo-document";

/**
 * Gera o pôster de Dia de Jogo (PDF) — mesmo padrão do Relacionados
 * (`app/jogos/[id]/relacionados/pdf/route.tsx`).
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const dados = await buildDiaJogoData(params.id);
  if (!dados) {
    return new NextResponse(
      "Adicione ao menos uma linha de cronograma de Dia de Jogo antes de gerar o pôster.",
      { status: 400 },
    );
  }

  const buffer = await renderToBuffer(
    <DiaJogoDocument
      mandante={dados.jogo.mandante}
      adversarioLogoSrc={dados.adversarioLogoUrl}
      dataFaixaTexto={dados.dataFaixaTexto}
      itens={dados.itens}
      liberacaoTexto={dados.liberacaoTexto}
    />,
  );

  const nomeArquivo = nomeArquivoPoster("dia-de-jogo", dados.jogo.adversario_nome, dados.jogo.data_jogo);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}.pdf"`,
    },
  });
}
