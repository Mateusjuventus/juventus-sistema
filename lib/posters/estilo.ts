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

export const HASHTAG_RODAPE = "#MOLEQUETRAVESSO";

/**
 * Nome do arquivo pronto pra download, sem acentos/espaços — usado pelas rotas de PDF e JPG dos
 * 3 pôsteres.
 */
export function nomeArquivoPoster(prefixo: string, adversario: string, dataJogo: string): string {
  const adversarioSlug = adversario.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${prefixo}-juventus-x-${adversarioSlug}-${dataJogo}`;
}
