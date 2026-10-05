/**
 * Tokens de cor da marca da PRÓPRIA Proxis (o software) — tirados da logo oficial
 * (`public/brand/proxis-logo.png`, por amostragem de pixel). Usados só no Login, que é o único
 * lugar do sistema com identidade visual própria da Proxis (fundo + acentos, não só a marquinha) —
 * ver docs/superpowers/specs/2026-10-04-rebranding-proxis-design.md (pedido do Mateus em 05/10). A
 * partir da tela de escolha de departamento pra dentro, a identidade volta a ser a do clube (ver
 * `lib/theme.ts`). Arquivo separado de propósito — misturar as duas paletas num arquivo só
 * (`lib/theme.ts`, documentado como "identidade visual do Juventus") confundiria qual é a origem
 * de cada token.
 */
export const proxisTheme = {
  azul: "#0058EC", // acento de marca da Proxis — campo em foco, botão, risquinho do eyebrow, glow
  navy: "#081A2B", // fundo da tela de login — tom do texto "PROXIS" na própria logo
} as const;
