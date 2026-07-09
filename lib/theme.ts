/**
 * Tokens de cor da identidade visual do Juventus, usados tanto no Tailwind
 * (tailwind.config.ts) quanto em qualquer lugar que precise do hex puro
 * (SVG inline, ou futura geração de PDF em módulos posteriores).
 *
 * NOTA: valores a confirmar/ajustar a partir do arquivo real do brasão
 * assim que ele for anexado — estas são aproximações visuais razoáveis
 * a partir da imagem mostrada no brainstorming (grená/vinho escuro,
 * dourado e prata).
 */
export const juventusTheme = {
  grena: "#5C0A35",
  grenaEscuro: "#3F0724",
  dourado: "#C9A227",
  prata: "#B0B0B0",
  branco: "#FFFFFF",
} as const;
