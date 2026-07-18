export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { buildRelacionadosData } from "@/lib/posters/relacionados-data";
import { nomeArquivoPoster } from "@/lib/posters/estilo";
import { relacionadosImagemJsx } from "@/lib/posters/relacionados-imagem";
import { renderizarPosterComoJpeg } from "@/lib/posters/renderizar-imagem";

/**
 * Gera o pôster de Relacionados (JPG) a partir da convocação já registrada — mesmo padrão da
 * versão em PDF (`app/jogos/[id]/relacionados/pdf/route.tsx`), mas usando o pipeline de imagem
 * (next/og + sharp, ver lib/posters/renderizar-imagem.ts).
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const dados = await buildRelacionadosData(params.id);
  if (!dados) {
    return new NextResponse(
      "Ainda não há convocação registrada para este jogo. Registre a convocação antes de gerar o pôster de Relacionados.",
      { status: 400 },
    );
  }

  const jsx = relacionadosImagemJsx({
    competicao: dados.jogo.competicao,
    mandante: dados.jogo.mandante,
    adversarioLogoUrl: dados.adversarioLogoUrl,
    confrontoTexto: dados.confrontoTexto,
    dadosJogoTexto: dados.dadosJogoTexto,
    colunaEsquerda: dados.colunaEsquerda,
    colunaDireita: dados.colunaDireita,
  });

  const jpgBuffer = await renderizarPosterComoJpeg(jsx as any);

  const nomeArquivo = nomeArquivoPoster("relacionados", dados.jogo.adversario_nome, dados.jogo.data_jogo);

  return new NextResponse(new Uint8Array(jpgBuffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename="${nomeArquivo}.jpg"`,
    },
  });
}
