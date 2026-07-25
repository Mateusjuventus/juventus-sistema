import { describe, expect, it } from "vitest";
import { compararPorPosicao, rankPosicao } from "./ordem-posicao";

describe("rankPosicao", () => {
  it("coloca goleiro primeiro", () => {
    expect(rankPosicao("Goleiro")).toBeLessThan(rankPosicao("Zagueiro"));
  });

  it("segue a ordem defesa -> meio -> ataque", () => {
    expect(rankPosicao("Zagueiro")).toBeLessThan(rankPosicao("Lateral Direito"));
    expect(rankPosicao("Lateral Esquerdo")).toBeLessThan(rankPosicao("Volante"));
    expect(rankPosicao("Volante")).toBeLessThan(rankPosicao("Meia"));
    expect(rankPosicao("Meia Atacante")).toBeLessThan(rankPosicao("Ponta"));
    expect(rankPosicao("Ponta Direita")).toBeLessThan(rankPosicao("Atacante"));
  });

  it("não depende de maiúsculas/acentos", () => {
    expect(rankPosicao("GOLEIRO")).toBe(rankPosicao("goleiro"));
    expect(rankPosicao("Líbero")).toBe(rankPosicao("Zagueiro"));
  });

  it("posição desconhecida vai depois das conhecidas, mas antes de sem posição", () => {
    expect(rankPosicao("Xyz")).toBeGreaterThan(rankPosicao("Atacante"));
    expect(rankPosicao(null)).toBeGreaterThan(rankPosicao("Xyz"));
  });
});

describe("compararPorPosicao", () => {
  it("ordena titulares por posição, e dentro da mesma posição por número da camisa", () => {
    const lista = [
      { posicao: "Atacante", numero_camisa: 9 },
      { posicao: "Goleiro", numero_camisa: 12 },
      { posicao: "Goleiro", numero_camisa: 1 },
      { posicao: "Zagueiro", numero_camisa: 4 },
    ];
    const ordenada = [...lista].sort(compararPorPosicao);
    expect(ordenada.map((a) => `${a.posicao}-${a.numero_camisa}`)).toEqual([
      "Goleiro-1",
      "Goleiro-12",
      "Zagueiro-4",
      "Atacante-9",
    ]);
  });
});
