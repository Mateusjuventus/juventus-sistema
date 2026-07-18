import { ImageResponse } from "next/og";
import sharp from "sharp";
import type { ReactElement } from "react";
import { POSTER_IMAGEM_LARGURA } from "./estilo";
import { getAntonFontBuffer } from "./poster-imagem-shared";

// Altura de "sobra" bem generosa pro canvas do ImageResponse — o @vercel/og não estica sozinho
// pro tamanho do conteúdo (herança do formato clássico de imagem de Open Graph, 1200x630 fixo), e a
// altura real de cada pôster varia (convocação com mais ou menos gente, mais ou menos linhas de
// programação). Em vez de calcular a altura exata na mão (frágil — qualquer mudança de fonte/
// texto desalinha a conta), renderiza num canvas bem mais alto que qualquer pôster real e corta o
// excesso de fundo branco no fim com `sharp().trim()`.
const ALTURA_CANVAS_GENEROSA = 3400;

/**
 * Transforma o JSX de um pôster (ver `lib/posters/*-imagem.tsx`) num arquivo JPEG pronto pra
 * download — usado pelas 3 rotas `.../jpg/route.ts`. Sempre a mesma fonte (Anton, usada nos
 * títulos) e a mesma largura fixa (`POSTER_IMAGEM_LARGURA`) pra manter os 3 pôsteres consistentes
 * entre si.
 */
export async function renderizarPosterComoJpeg(jsx: ReactElement): Promise<Buffer> {
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
  const cortado = await sharp(achatado).trim({ background: "#ffffff" }).toBuffer();

  return sharp(cortado).jpeg({ quality: 92 }).toBuffer();
}
