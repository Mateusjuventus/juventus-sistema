import { clube } from "./clube";

/**
 * Tokens de cor do CLUBE desta instância, usados no Tailwind (tailwind.config.ts) e onde for
 * preciso o hex puro (SVG inline, geração de PDF). Os valores vêm de `lib/clube` — ver
 * docs/superpowers/specs/2026-11-22-configuracao-por-clube-design.md.
 *
 * Os nomes dos tokens (`grena`, `dourado`…) nasceram com o Juventus e foram mantidos para não
 * mexer nas ~900 classes e nos PDFs que os usam; no Maringá, `grena` é o verde-profundo e
 * `dourado` é o verde do escudo. Regra que vale para qualquer clube: `grenaEscuro` nunca preenche
 * uma área grande — só texto/acentos pequenos. Áreas grandes (sidebar, marcas fortes) usam `grena`.
 */
export const temaClube = clube.cores;

/** Nome legado — mesmo objeto que `temaClube`. */
export const juventusTheme = temaClube;
