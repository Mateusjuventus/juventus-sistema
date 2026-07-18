export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { buildDiaJogoData } from "@/lib/posters/dia-jogo-data";
import { nomeArquivoPoster } from "@/lib/posters/estilo";
import { diaJogoImagemJsx } from "@/lib/posters/dia-jogo-imagem";
import { renderizarPosterComoJpeg } from "@/lib/posters/renderizar-imagem";

/**
 * Gera o pôster de Dia de Jogo (JPG) — mesmo padrão do Relacionados
 * (`app/jogos/[id]/relacionados/jpg/route.tsx`).
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const dados = await buildDiaJogoData(params.id);
  if (!dados) {
    return new NextResponse(
      "Adicione ao menos uma linha de cronograma de Dia de Jogo antes de gerar o pôster.",
      { status: 400 },
    );
  }

  const jsx = diaJogoImagemJsx({
    mandante: dados.jogo.mandante,
    adversarioLogoUrl: dados.adversarioLogoUrl,
    dataFaixaTexto: dados.dataFaixaTexto,
    itens: dados.itens,
    liberacaoTexto: dados.liberacaoTexto,
  });

  const jpgBuffer = await renderizarPosterComoJpeg(jsx as any, { comMolduraLateral: true });

  const nomeArquivo = nomeArquivoPoster("dia-de-jogo", dados.jogo.adversario_nome, dados.jogo.data_jogo);

  return new NextResponse(new Uint8Array(jpgBuffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename="${nomeArquivo}.jpg"`,
    },
  });
}
