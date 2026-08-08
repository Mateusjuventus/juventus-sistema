/**
 * Tokens de cor da identidade visual do Juventus, usados tanto no Tailwind
 * (tailwind.config.ts) quanto em qualquer lugar que precise do hex puro
 * (SVG inline, ou geração de PDF).
 *
 * Paleta validada no redesign visual (ver
 * docs/superpowers/specs/2026-08-07-redesign-visual-painel-financeiro-design.md) — sem bege, tom
 * de dourado ajustado. Regra que vale pro sistema inteiro: `grenaEscuro` nunca preenche uma área
 * grande (deu efeito "muito escuro" numa iteração da sidebar) — só texto/acentos pequenos. Áreas
 * grandes (sidebar, marcas fortes) usam `grena`.
 */
export const juventusTheme = {
  grena: "#5C0A35", // preenchimento de área grande (sidebar, marca de categoria "jogo")
  grenaEscuro: "#3F0724", // só texto/acentos pequenos — nunca preenchimento de área grande
  dourado: "#B98F1E", // acento pontual (item ativo do menu, botões de destaque)
  cinzaPagina: "#EEF0F2", // fundo da página — cinza neutro frio, não bege
  linha: "#E3E5E8", // bordas/hairlines
  contexto: "#C7C9CD", // barras "de referência" (previsto, dia sem evento) — nunca a cor de destaque
  prata: "#B0B0B0", // ainda usado em gráficos de "não convocado" (dados-de-jogo) — sem relação com a spec do redesign
  branco: "#FFFFFF",
} as const;
