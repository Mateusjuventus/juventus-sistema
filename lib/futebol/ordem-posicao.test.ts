import { describe, expect, it } from "vitest";
import {
  compararPorNumeroCamisa,
  compararPorNumeroCamisaGoleiroPrimeiro,
  compararPorPosicao,
  ehGoleiro,
  rankPosicao,
} from "./ordem-posicao";

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

describe("compararPorNumeroCamisa", () => {
  it("ordena só pelo número da camisa, do menor pro maior, ignorando a posição", () => {
    const lista = [
      { posicao: "Atacante", numero_camisa: 14 },
      { posicao: "Goleiro", numero_camisa: 1 },
      { posicao: "Zagueiro", numero_camisa: 4 },
      { posicao: "Meia", numero_camisa: 12 },
    ];
    const ordenada = [...lista].sort(compararPorNumeroCamisa);
    expect(ordenada.map((a) => a.numero_camisa)).toEqual([1, 4, 12, 14]);
  });

  it("manda quem não tem número (ainda não preenchido na convocação) pro final", () => {
    const lista = [
      { numero_camisa: null },
      { numero_camisa: 2 },
      { numero_camisa: 1 },
    ];
    const ordenada = [...lista].sort(compararPorNumeroCamisa);
    expect(ordenada.map((a) => a.numero_camisa)).toEqual([1, 2, null]);
  });
});

describe("ehGoleiro", () => {
  it("reconhece a posição escrita por extenso, com ou sem acento/maiúscula", () => {
    expect(ehGoleiro("Goleiro")).toBe(true);
    expect(ehGoleiro("GOLEIRA")).toBe(true);
    expect(ehGoleiro(" goleiro ")).toBe(true);
  });

  it("reconhece as abreviações usadas no cadastro", () => {
    expect(ehGoleiro("GOL")).toBe(true);
    expect(ehGoleiro("go")).toBe(true);
    expect(ehGoleiro("GK")).toBe(true);
  });

  it("não confunde outras posições", () => {
    expect(ehGoleiro("Zagueiro")).toBe(false);
    expect(ehGoleiro("Atacante")).toBe(false);
    expect(ehGoleiro(null)).toBe(false);
    expect(ehGoleiro("")).toBe(false);
  });
});

describe("compararPorNumeroCamisaGoleiroPrimeiro", () => {
  it("põe o goleiro na frente mesmo com número maior", () => {
    const reservas = [
      { posicao: "Zagueiro", numero_camisa: 13 },
      { posicao: "Atacante", numero_camisa: 14 },
      { posicao: "Goleiro", numero_camisa: 22 },
      { posicao: "Meia", numero_camisa: 15 },
    ];
    const ordenada = [...reservas].sort(compararPorNumeroCamisaGoleiroPrimeiro);
    expect(ordenada.map((a) => `${a.posicao}-${a.numero_camisa}`)).toEqual([
      "Goleiro-22",
      "Zagueiro-13",
      "Atacante-14",
      "Meia-15",
    ]);
  });

  it("entre dois goleiros vale o número da camisa", () => {
    const lista = [
      { posicao: "Goleiro", numero_camisa: 12 },
      { posicao: "Goleiro", numero_camisa: 1 },
      { posicao: "Lateral", numero_camisa: 2 },
    ];
    const ordenada = [...lista].sort(compararPorNumeroCamisaGoleiroPrimeiro);
    expect(ordenada.map((a) => a.numero_camisa)).toEqual([1, 12, 2]);
  });

  it("goleiro sem número ainda vem antes de quem é de linha", () => {
    const lista = [
      { posicao: "Atacante", numero_camisa: 9 },
      { posicao: "GOL", numero_camisa: null },
    ];
    const ordenada = [...lista].sort(compararPorNumeroCamisaGoleiroPrimeiro);
    expect(ordenada.map((a) => a.posicao)).toEqual(["GOL", "Atacante"]);
  });
});
