import { describe, expect, it } from "vitest";
import { fatiasPizza, pathFatiaPizza } from "./grafico-pizza";

describe("pathFatiaPizza", () => {
  it("gera um path fechado (começa com M, termina com Z)", () => {
    const path = pathFatiaPizza(0, 90);
    expect(path.startsWith("M")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
  });

  it("usa large-arc-flag 1 quando a fatia passa de 180°", () => {
    expect(pathFatiaPizza(0, 200)).toContain(" 1 1 ");
  });

  it("usa large-arc-flag 0 quando a fatia é menor que 180°", () => {
    expect(pathFatiaPizza(0, 90)).toContain(" 0 1 ");
  });

  it("uma fatia de 360° (só um tipo cadastrado) vira dois arcos de 180°, sem ficar vazia", () => {
    const path = pathFatiaPizza(0, 360);
    // Círculo completo: dois comandos "A" (não teria nenhum se o `A` de 360° fosse usado direto).
    expect(path.match(/A /g)?.length).toBe(2);
  });
});

describe("fatiasPizza", () => {
  it("lista vazia retorna nenhuma fatia", () => {
    expect(fatiasPizza([])).toEqual([]);
  });

  it("soma zero (todos os valores zerados) retorna nenhuma fatia", () => {
    expect(fatiasPizza([{ chave: "a", valor: 0 }])).toEqual([]);
  });

  it("ignora itens com valor zero, mantendo os demais", () => {
    const fatias = fatiasPizza([
      { chave: "a", valor: 0 },
      { chave: "b", valor: 10 },
    ]);
    expect(fatias.map((f) => f.chave)).toEqual(["b"]);
    expect(fatias[0].percentual).toBe(100);
  });

  it("um único item cadastrado gera uma fatia de 100% (círculo completo)", () => {
    const fatias = fatiasPizza([{ chave: "definitivo", valor: 5 }]);
    expect(fatias).toHaveLength(1);
    expect(fatias[0].percentual).toBe(100);
  });

  it("divide proporcionalmente entre vários tipos, mantendo a ordem de entrada", () => {
    const fatias = fatiasPizza([
      { chave: "definitivo", valor: 50 },
      { chave: "amador", valor: 30 },
      { chave: "emprestimo", valor: 20 },
    ]);
    expect(fatias.map((f) => f.chave)).toEqual(["definitivo", "amador", "emprestimo"]);
    expect(fatias.map((f) => f.percentual)).toEqual([50, 30, 20]);
  });

  it("cada fatia produz um path fechado válido", () => {
    const fatias = fatiasPizza([
      { chave: "a", valor: 1 },
      { chave: "b", valor: 2 },
    ]);
    for (const fatia of fatias) {
      expect(fatia.path.startsWith("M")).toBe(true);
      expect(fatia.path.endsWith("Z")).toBe(true);
    }
  });
});
