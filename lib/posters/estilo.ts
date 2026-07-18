/**
 * Constantes visuais compartilhadas pelos 3 pôsteres (Relacionados, Concentração, Dia de Jogo) —
 * ver docs/superpowers/specs/2026-07-17-posters-relacionados-programacao-design.md. Usadas tanto
 * pela versão em PDF (`lib/pdf/*.tsx`, via @react-pdf/renderer) quanto pela versão em imagem
 * (`lib/posters/*-imagem.tsx`, via next/og) — cada tecnologia lê as mesmas cores/medidas, mas
 * monta o layout com seus próprios componentes (não são compatíveis entre si).
 */

export const CORES_POSTER = {
  grena: "#5C0A35",
  grenaEscuro: "#3F0724",
  dourado: "#C9A227",
  prata: "#B9B9B9",
  branco: "#FFFFFF",
  preto: "#1A1A1A",
} as const;

// Tamanho do pôster gerado como imagem (JPG) — mesma proporção do exemplo enviado pelo Mateus
// (aprox. A4 em pé, mas em resolução de tela/rede social, não de impressão).
export const POSTER_IMAGEM_LARGURA = 1191;
export const POSTER_IMAGEM_ALTURA = 1684;

// Altura de "sobra" bem generosa pro canvas do `ImageResponse` (ver lib/posters/renderizar-imagem.ts).
export const ALTURA_CANVAS_GENEROSA = 3400;

// Moldura lateral (Concentração e Dia de Jogo): duas barras vinho na borda esquerda, cobrindo a
// altura inteira do pôster — medidas tiradas por análise de pixel da referência do Mateus (ver
// lib/pdf/poster-shared.tsx). No JPG, a moldura é desenhada por cima da imagem já cortada (em
// `renderizar-imagem.ts`, via `sharp().composite()`) em vez de fazer parte do JSX/Satori — o
// Satori/Yoga não estica um `position: absolute` só com `top`+`bottom` sem uma altura explícita
// no pai, e forçar essa altura quebraria o corte automático do excesso de canvas (o pôster
// inteiro nunca seria cortado, porque a barra passaria a "contar" como conteúdo até o fim).
export const MOLDURA_LATERAL_GROSSA_LARGURA = 103;
export const MOLDURA_LATERAL_FINA_ESQUERDA = 118;
export const MOLDURA_LATERAL_FINA_LARGURA = 23;
// Padding esquerdo/direito do corpo dos pôsteres com moldura lateral (~16% da largura, medido na
// referência) — bem maior que o do Relacionados porque o conteúdo precisa ficar nitidamente à
// direita da moldura.
export const CORPO_LATERAL_PADDING_ESQUERDA = 195;
export const CORPO_LATERAL_PADDING_DIREITA = 193;

export const HASHTAG_RODAPE = "#MOLEQUETRAVESSO";

/**
 * Nome do arquivo pronto pra download, sem acentos/espaços — usado pelas rotas de PDF e JPG dos
 * 3 pôsteres.
 */
export function nomeArquivoPoster(prefixo: string, adversario: string, dataJogo: string): string {
  const adversarioSlug = adversario.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${prefixo}-juventus-x-${adversarioSlug}-${dataJogo}`;
}
