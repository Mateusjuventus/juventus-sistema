import { ImageResponse } from "next/og";
import sharp from "sharp";
import type { ReactElement } from "react";
import {
  ALTURA_CANVAS_GENEROSA,
  CORES_POSTER,
  MOLDURA_LATERAL_FINA_ESQUERDA,
  MOLDURA_LATERAL_FINA_LARGURA,
  MOLDURA_LATERAL_GROSSA_LARGURA,
  POSTER_IMAGEM_LARGURA,
} from "./estilo";
import { getAntonFontBuffer } from "./poster-imagem-shared";

function hexParaRgb(hex: string): { r: number; g: number; b: number } {
  const valor = hex.replace("#", "");
  return {
    r: parseInt(valor.slice(0, 2), 16),
    g: parseInt(valor.slice(2, 4), 16),
    b: parseInt(valor.slice(4, 6), 16),
  };
}

/**
 * Transforma o JSX de um pôster (ver `lib/posters/*-imagem.tsx`) num arquivo JPEG pronto pra
 * download — usado pelas 3 rotas `.../jpg/route.ts`. Sempre a mesma fonte (Anton, usada nos
 * títulos) e a mesma largura fixa (`POSTER_IMAGEM_LARGURA`) pra manter os 3 pôsteres consistentes
 * entre si. `comMolduraLateral: true` (Concentração e Dia de Jogo) desenha por cima, depois do
 * corte, as duas barras vinho da moldura lateral — ver o porquê de não fazer isso via JSX/Satori
 * no comentário de `MOLDURA_LATERAL_GROSSA_LARGURA` em `lib/posters/estilo.ts`.
 */
export async function renderizarPosterComoJpeg(
  jsx: ReactElement,
  options: { comMolduraLateral?: boolean } = {},
): Promise<Buffer> {
  const response = new ImageResponse(jsx, {
    width: POSTER_IMAGEM_LARGURA,
    height: ALTURA_CANVAS_GENEROSA,
    fonts: [{ name: "Anton", data: getAntonFontBuffer(), weight: 400, style: "normal" }],
  });

  const arrayBuffer = await response.arrayBuffer();
  const pngBuffer = Buffer.from(arrayBuffer);

  // A área do canvas que sobra abaixo do conteúdo real vem TRANSPARENTE (não branca) — por isso
  // primeiro "achata" essa transparência pra branco sólido (senão o `.trim()` não reconhece a
  // borda pra cortar, e a conversão pra JPEG mais adiante preencheria de preto por padrão, já que
  // JPEG não tem canal alfa). Precisa materializar o buffer entre as duas chamadas — encadear
  // `.flatten().trim()) na mesma pipeline não funciona (o trim acaba analisando a imagem antes do
  // flatten ter efeito, e não corta nada).
  const achatado = await sharp(pngBuffer).flatten({ background: "#ffffff" }).toBuffer();

  // Só queremos cortar o excesso vertical (o canvas generoso abaixo do conteúdo) — NUNCA a
  // largura. Concentração e Dia de Jogo têm margens laterais largas de propósito (pra abrir
  // espaço pra moldura lateral), e se essas margens ficarem brancas até o fim da página, o
  // `.trim()` "cru" (que corta os 4 lados) enxerga essas faixas como fundo e corta a LARGURA
  // também, estreitando o pôster inteiro. Por isso: pede o `info` do trim (que inclui
  // `trimOffsetTop`/altura resultante) só pra descobrir onde cortar verticalmente, e faz o corte
  // de verdade com `.extract()` mantendo a largura original inteira.
  const { info } = await sharp(achatado)
    .trim({ background: "#ffffff" })
    .toBuffer({ resolveWithObject: true });
  const topoCortado = Math.max(0, -(info.trimOffsetTop ?? 0));
  const alturaFinal = info.height;

  let cortado = await sharp(achatado)
    .extract({ left: 0, top: topoCortado, width: POSTER_IMAGEM_LARGURA, height: alturaFinal })
    .toBuffer();

  if (options.comMolduraLateral) {
    const corGrena = hexParaRgb(CORES_POSTER.grena);
    const [barraGrossa, barraFina] = await Promise.all([
      sharp({
        create: { width: MOLDURA_LATERAL_GROSSA_LARGURA, height: alturaFinal, channels: 3, background: corGrena },
      })
        .png()
        .toBuffer(),
      sharp({
        create: { width: MOLDURA_LATERAL_FINA_LARGURA, height: alturaFinal, channels: 3, background: corGrena },
      })
        .png()
        .toBuffer(),
    ]);

    cortado = await sharp(cortado)
      .composite([
        { input: barraGrossa, left: 0, top: 0 },
        { input: barraFina, left: MOLDURA_LATERAL_FINA_ESQUERDA, top: 0 },
      ])
      .toBuffer();
  }

  return sharp(cortado).jpeg({ quality: 92 }).toBuffer();
}
