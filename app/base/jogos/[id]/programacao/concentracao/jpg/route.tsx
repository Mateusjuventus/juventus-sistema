export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { buildConcentracaoDataBase } from "@/lib/posters/concentracao-data";
import { nomeArquivoPoster } from "@/lib/posters/estilo";
import { concentracaoImagemJsx } from "@/lib/posters/concentracao-imagem";
import { renderizarPosterComoJpeg } from "@/lib/posters/renderizar-imagem";

/** Espelha `app/jogos/[id]/programacao/concentracao/jpg/route.tsx` para o Futebol de Base. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const dados = await buildConcentracaoDataBase(params.id);
  if (!dados) {
    return new NextResponse(
      "Preencha a data da concentração e adicione ao menos uma linha de cronograma antes de gerar o pôster.",
      { status: 400 },
    );
  }

  const jsx = concentracaoImagemJsx({
    mandante: dados.jogo.mandante,
    adversarioLogoUrl: dados.adversarioLogoUrl,
    dataFaixaTexto: dados.dataFaixaTexto,
    itens: dados.itens,
    regras: dados.regras,
  });

  const jpgBuffer = await renderizarPosterComoJpeg(jsx as any, { comMolduraLateral: true });

  const nomeArquivo = nomeArquivoPoster("concentracao", dados.jogo.adversario_nome, dados.jogo.data_jogo);

  return new NextResponse(new Uint8Array(jpgBuffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename="${nomeArquivo}.jpg"`,
    },
  });
}
