/**
 * Matemática pura do gráfico de pizza do bloco "Contrato" de `AtletasResumoFiltros` — extraída pra
 * poder testar sem montar o SVG (o componente só chama `fatiasPizza` dentro do JSX). Antes era um
 * donut (`stroke-dasharray` num círculo vazado); o Mateus pediu pizza cheia de verdade, igual ao
 * artefato original (ver docs/superpowers/specs/2026-09-09-atletas-resumo-filtros-design.md e o
 * mockup `0b83018a-7fed-4d53-9346-c0f56365efef`, que usa fatias `<path>` sem buraco no meio).
 *
 * Círculo fixo num viewBox 0 0 36 36 (mesmo tamanho de sempre), centro (18,18), raio 18 — ocupa o
 * viewBox inteiro já que não sobra buraco vazio no meio como no donut.
 */

const CX = 18;
const CY = 18;
const R = 18;

function pontoNoCirculo(anguloGraus: number): { x: number; y: number } {
  // 0° = topo (12h), sentido horário — mesma orientação visual do donut anterior.
  const rad = ((anguloGraus - 90) * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

/**
 * Path SVG (`d="..."`) de uma fatia entre dois ângulos (graus, 0-360, sentido horário a partir do
 * topo). Uma fatia que fecha o círculo inteiro (só existe um tipo de contrato cadastrado) vira dois
 * arcos de 180° em vez de um `A` de 360° — um `A` com o mesmo ponto de início e fim não desenha
 * nada em SVG.
 */
export function pathFatiaPizza(anguloInicial: number, anguloFinal: number): string {
  const varredura = anguloFinal - anguloInicial;
  if (varredura >= 359.99) {
    const meio = anguloInicial + 180;
    const p1 = pontoNoCirculo(anguloInicial);
    const pMeio = pontoNoCirculo(meio);
    return `M ${p1.x} ${p1.y} A ${R} ${R} 0 1 1 ${pMeio.x} ${pMeio.y} A ${R} ${R} 0 1 1 ${p1.x} ${p1.y} Z`;
  }
  const p1 = pontoNoCirculo(anguloInicial);
  const p2 = pontoNoCirculo(anguloFinal);
  const largeArcFlag = varredura > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${R} ${R} 0 ${largeArcFlag} 1 ${p2.x} ${p2.y} Z`;
}

export interface FatiaPizza<T> {
  chave: T;
  path: string;
  /** Percentual arredondado (0-100), só pra exibição — a fatia em si usa o valor exato, sem
   * arredondar, então a soma visual das fatias sempre fecha o círculo mesmo se os percentuais
   * arredondados não somarem exatamente 100. */
  percentual: number;
}

/** Gera as fatias de pizza pra uma lista de `{chave, valor}` — itens com valor 0 não geram fatia
 * (nada pra desenhar). Lista vazia ou soma zero retorna `[]` (quem chama decide o estado vazio,
 * igual ao donut anterior com "sem contrato"). */
export function fatiasPizza<T>(itens: { chave: T; valor: number }[]): FatiaPizza<T>[] {
  const total = itens.reduce((soma, item) => soma + item.valor, 0);
  if (total <= 0) return [];

  const fatias: FatiaPizza<T>[] = [];
  let acumulado = 0;
  for (const item of itens) {
    if (item.valor <= 0) continue;
    const anguloInicial = (acumulado / total) * 360;
    acumulado += item.valor;
    const anguloFinal = (acumulado / total) * 360;
    fatias.push({
      chave: item.chave,
      path: pathFatiaPizza(anguloInicial, anguloFinal),
      percentual: Math.round((item.valor / total) * 100),
    });
  }
  return fatias;
}
