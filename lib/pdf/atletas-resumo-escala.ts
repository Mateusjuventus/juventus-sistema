/**
 * Heurística de escala do PDF de Atletas (resumo + cards numa página só, ver docs/superpowers/specs/
 * 2026-09-09-atletas-resumo-filtros-design.md, item 8 do ajuste de 2026-09-10) — mesmo espírito de
 * `calcularEscala` do Campograma (`lib/pdf/campograma-document.tsx`): até `TOTAL_REFERENCIA` atletas,
 * os cards saem no tamanho de referência; acima disso encolhem proporcionalmente até um piso de
 * legibilidade, pra sempre caber numa folha A4 só (pedido explícito do Mateus: "tudo numa única
 * página"), sem quebrar pra uma segunda página. Extraída num módulo puro pra poder testar sem
 * montar o documento inteiro do react-pdf.
 */

const TOTAL_REFERENCIA = 24;
const ESCALA_MINIMA = 0.5;

export function calcularEscalaCardsAtletas(totalAtletas: number): number {
  if (totalAtletas <= TOTAL_REFERENCIA) return 1;
  return Math.max(ESCALA_MINIMA, TOTAL_REFERENCIA / totalAtletas);
}
