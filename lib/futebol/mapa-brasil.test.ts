import { describe, expect, it } from "vitest";
import { ESTADOS_BRASIL, projetarEstados } from "./mapa-brasil";

describe("projetarEstados", () => {
  it("devolve um ponto por estado, 27 no total", () => {
    const pontos = projetarEstados(400, 400);
    expect(pontos).toHaveLength(27);
    expect(pontos).toHaveLength(ESTADOS_BRASIL.length);
  });

  it("todo ponto fica dentro do retângulo (respeitando a margem)", () => {
    const largura = 400;
    const altura = 500;
    const margem = 24;
    const pontos = projetarEstados(largura, altura, margem);
    for (const p of pontos) {
      expect(p.x).toBeGreaterThanOrEqual(margem - 0.01);
      expect(p.x).toBeLessThanOrEqual(largura - margem + 0.01);
      expect(p.y).toBeGreaterThanOrEqual(margem - 0.01);
      expect(p.y).toBeLessThanOrEqual(altura - margem + 0.01);
    }
  });

  it("RR (norte) fica acima de RS (sul) na tela — y menor é mais pra cima", () => {
    const pontos = projetarEstados(400, 400);
    const rr = pontos.find((p) => p.uf === "RR")!;
    const rs = pontos.find((p) => p.uf === "RS")!;
    expect(rr.y).toBeLessThan(rs.y);
  });

  it("AC (oeste) fica à esquerda de CE (leste) na tela", () => {
    const pontos = projetarEstados(400, 400);
    const ac = pontos.find((p) => p.uf === "AC")!;
    const ce = pontos.find((p) => p.uf === "CE")!;
    expect(ac.x).toBeLessThan(ce.x);
  });
});
