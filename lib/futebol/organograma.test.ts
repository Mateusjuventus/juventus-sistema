import { describe, expect, it } from "vitest";
import {
  ALTURA_CAIXA,
  GAP_BARRAMENTO,
  LARGURA_CAIXA,
  calcularConectores,
  calcularEscalaOrganograma,
  calcularLayoutAutomatico,
  type OrganogramaNo,
  type OrganogramaPosicao,
} from "./organograma";

// `x`/`y` marcam o canto (não o centro) da caixa — uma caixa sozinha, centralizada, começa em
// -LARGURA_CAIXA/2, não em 0.
const X_CAIXA_SOLITARIA = -LARGURA_CAIXA / 2;

function no(
  id: string,
  reportaPara: string | null,
  grupo: string | null,
  ordem = 0,
  linha: string | null = null,
): OrganogramaNo {
  return { id, reportaPara, grupo, ordem, linha };
}

describe("calcularLayoutAutomatico", () => {
  it("posiciona a raiz sozinha no nível 0", () => {
    const posicoes = calcularLayoutAutomatico([no("presidente", null, null)]);
    expect(posicoes.get("presidente")).toEqual({ x: X_CAIXA_SOLITARIA, y: 0 });
  });

  it("empilha uma cadeia de liderança em níveis crescentes", () => {
    const posicoes = calcularLayoutAutomatico([
      no("presidente", null, null),
      no("diretor", "presidente", null),
      no("coordenador", "diretor", null),
    ]);
    expect(posicoes.get("presidente")!.y).toBe(0);
    expect(posicoes.get("diretor")!.y).toBeGreaterThan(posicoes.get("presidente")!.y);
    expect(posicoes.get("coordenador")!.y).toBeGreaterThan(posicoes.get("diretor")!.y);
  });

  it("espalha lado a lado quem está no mesmo nível", () => {
    const posicoes = calcularLayoutAutomatico([
      no("coordenador", null, null),
      no("a", "coordenador", null, 0),
      no("b", "coordenador", null, 1),
    ]);
    expect(posicoes.get("a")!.y).toBe(posicoes.get("b")!.y);
    expect(posicoes.get("a")!.x).toBeLessThan(posicoes.get("b")!.x);
  });

  it("agrupa quem tem o mesmo `grupo` numa coluna só, empilhados por ordem", () => {
    const posicoes = calcularLayoutAutomatico([
      no("coordenador", null, null),
      no("sub20", "coordenador", "Head de Goleiros", 0),
      no("sub17", "coordenador", "Head de Goleiros", 1),
    ]);
    expect(posicoes.get("sub20")!.x).toBe(posicoes.get("sub17")!.x);
    expect(posicoes.get("sub17")!.y).toBeGreaterThan(posicoes.get("sub20")!.y);
  });

  it("separa grupos diferentes em colunas diferentes", () => {
    const posicoes = calcularLayoutAutomatico([
      no("goleiros-1", null, "Head de Goleiros", 0),
      no("analise-1", null, "Head de Análise", 1),
    ]);
    expect(posicoes.get("goleiros-1")!.x).not.toBe(posicoes.get("analise-1")!.x);
    // Mesma linha (nenhum dos dois tem liderança acima nesse teste) — nível de colunas começa em y=0.
    expect(posicoes.get("goleiros-1")!.y).toBe(posicoes.get("analise-1")!.y);
  });

  it("nunca trava com um `reportaPara` que aponta pra alguém inexistente (vira raiz)", () => {
    const posicoes = calcularLayoutAutomatico([no("orfao", "ninguem-existe", null)]);
    expect(posicoes.get("orfao")).toEqual({ x: X_CAIXA_SOLITARIA, y: 0 });
  });

  it("as colunas de membros ficam abaixo do nível mais fundo da liderança", () => {
    const posicoes = calcularLayoutAutomatico([
      no("presidente", null, null),
      no("diretor", "presidente", null),
      no("membro-1", "diretor", "Head de Goleiros", 0),
    ]);
    expect(posicoes.get("membro-1")!.y).toBeGreaterThan(posicoes.get("diretor")!.y + ALTURA_CAIXA);
  });

  it("alinha a mesma `linha` na mesma altura em colunas diferentes (a grade)", () => {
    const posicoes = calcularLayoutAutomatico([
      no("goleiros-sub20", null, "Head de Goleiros", 0, "Comissão Sub20"),
      no("goleiros-sub17", null, "Head de Goleiros", 1, "Comissão Sub17"),
      no("analise-sub20", null, "Head de Análise", 2, "Comissão Sub20"),
      no("analise-sub17", null, "Head de Análise", 3, "Comissão Sub17"),
    ]);
    // Mesma linha ("Comissão Sub20"), colunas diferentes → mesma altura.
    expect(posicoes.get("goleiros-sub20")!.y).toBe(posicoes.get("analise-sub20")!.y);
    expect(posicoes.get("goleiros-sub17")!.y).toBe(posicoes.get("analise-sub17")!.y);
    // Linhas diferentes → alturas diferentes, na ordem em que apareceram.
    expect(posicoes.get("goleiros-sub17")!.y).toBeGreaterThan(posicoes.get("goleiros-sub20")!.y);
    // Colunas diferentes → x diferente.
    expect(posicoes.get("goleiros-sub20")!.x).not.toBe(posicoes.get("analise-sub20")!.x);
  });

  it("uma coluna pode ter uma linha faltando sem quebrar o alinhamento das outras", () => {
    const posicoes = calcularLayoutAutomatico([
      no("goleiros-sub20", null, "Head de Goleiros", 0, "Comissão Sub20"),
      no("goleiros-sub17", null, "Head de Goleiros", 1, "Comissão Sub17"),
      // "Head de Análise" não tem ninguém no Sub17 — não deve deslocar o Sub20 dela.
      no("analise-sub20", null, "Head de Análise", 2, "Comissão Sub20"),
    ]);
    expect(posicoes.get("goleiros-sub20")!.y).toBe(posicoes.get("analise-sub20")!.y);
  });

  it("quem tem `grupo` mas não tem `linha` empilha abaixo da grade", () => {
    const posicoes = calcularLayoutAutomatico([
      no("sub20", null, "Head de Goleiros", 0, "Comissão Sub20"),
      no("extra", null, "Head de Goleiros", 1, null),
    ]);
    expect(posicoes.get("extra")!.y).toBeGreaterThan(posicoes.get("sub20")!.y);
  });
});

describe("calcularConectores", () => {
  it("põe o cotovelo numa distância fixa do pai quando o filho está bem mais longe", () => {
    const nos: OrganogramaNo[] = [no("pai", null, null), no("filho", "pai", null)];
    const posicoes = new Map<string, OrganogramaPosicao>([
      ["pai", { x: 0, y: 0 }],
      ["filho", { x: 0, y: 400 }], // bem abaixo — gap enorme entre pé do pai e topo do filho
    ]);
    const segmentos = calcularConectores(nos, posicoes);
    const tronco = segmentos.find((s) => s.key === "pai-tronco")!;
    expect(tronco.y1).toBe(ALTURA_CAIXA);
    expect(tronco.y2).toBe(ALTURA_CAIXA + GAP_BARRAMENTO);
  });

  it("não deixa o cotovelo passar do filho quando ele está bem perto do pai", () => {
    const nos: OrganogramaNo[] = [no("pai", null, null), no("filho", "pai", null)];
    const posicoes = new Map<string, OrganogramaPosicao>([
      ["pai", { x: 0, y: 0 }],
      ["filho", { x: 0, y: ALTURA_CAIXA + 6 }], // gap de só 6px — menor que GAP_BARRAMENTO
    ]);
    const segmentos = calcularConectores(nos, posicoes);
    const tronco = segmentos.find((s) => s.key === "pai-tronco")!;
    expect(tronco.y2).toBeLessThan(GAP_BARRAMENTO + ALTURA_CAIXA);
    expect(tronco.y2 - tronco.y1).toBeLessThan(GAP_BARRAMENTO);
  });

  it("gera um segmento de pé por filho, todos partindo do mesmo cotovelo", () => {
    const nos: OrganogramaNo[] = [
      no("pai", null, null),
      no("a", "pai", null, 0),
      no("b", "pai", null, 1),
    ];
    const posicoes = new Map<string, OrganogramaPosicao>([
      ["pai", { x: 0, y: 0 }],
      ["a", { x: -150, y: 200 }],
      ["b", { x: 150, y: 200 }],
    ]);
    const segmentos = calcularConectores(nos, posicoes);
    const pes = segmentos.filter((s) => s.key.startsWith("pai-pe-"));
    expect(pes).toHaveLength(2);
    expect(pes[0].y1).toBe(pes[1].y1);
  });

  it("não gera segmento nenhum pra quem não tem `reportaPara`", () => {
    const nos: OrganogramaNo[] = [no("solto", null, null)];
    const posicoes = new Map<string, OrganogramaPosicao>([["solto", { x: 0, y: 0 }]]);
    expect(calcularConectores(nos, posicoes)).toEqual([]);
  });
});

describe("calcularEscalaOrganograma", () => {
  it("não encolhe quando já cabe no espaço disponível", () => {
    expect(calcularEscalaOrganograma(600, 900)).toBe(1);
    expect(calcularEscalaOrganograma(900, 900)).toBe(1);
  });

  it("encolhe proporcionalmente quando o desenho é mais largo que o espaço disponível", () => {
    expect(calcularEscalaOrganograma(1000, 800)).toBeCloseTo(0.8);
  });

  it("encolhe sem piso mínimo, mesmo quando o desenho é muito mais largo que o espaço disponível", () => {
    expect(calcularEscalaOrganograma(4000, 800)).toBeCloseTo(0.2);
  });

  it("nunca amplia (largura disponível maior que o desenho continua em 1)", () => {
    expect(calcularEscalaOrganograma(300, 5000)).toBe(1);
  });
});
