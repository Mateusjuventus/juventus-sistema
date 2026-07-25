import { describe, expect, it } from "vitest";
import { calcularMediaIngressosPorPessoa, formatarMediaIngressos } from "./ingressos";

describe("calcularMediaIngressosPorPessoa", () => {
  it("divide o total atendido por todas as solicitações lançadas", () => {
    expect(calcularMediaIngressosPorPessoa(30, 10)).toBe(3);
  });

  it("considera solicitações com 0 atendido no denominador (reduz a média)", () => {
    // 3 solicitações, só 2 receberam ingresso (10 cada) — a 3ª ainda está com 0.
    expect(calcularMediaIngressosPorPessoa(20, 3)).toBeCloseTo(6.666, 2);
  });

  it("retorna null quando não há nenhuma solicitação lançada (evita divisão por zero)", () => {
    expect(calcularMediaIngressosPorPessoa(0, 0)).toBeNull();
  });
});

describe("formatarMediaIngressos", () => {
  it("formata com 1 casa decimal e vírgula (padrão brasileiro)", () => {
    expect(formatarMediaIngressos(3)).toBe("3,0");
    expect(formatarMediaIngressos(6.666)).toBe("6,7");
  });

  it("retorna travessão quando não há dado (null)", () => {
    expect(formatarMediaIngressos(null)).toBe("—");
  });
});
