import { describe, expect, it } from "vitest";
import { calcularEscalaCardsAtletas } from "./atletas-resumo-escala";

describe("calcularEscalaCardsAtletas", () => {
  it("até o tamanho de referência, escala 1 (tamanho normal)", () => {
    expect(calcularEscalaCardsAtletas(10)).toBe(1);
    expect(calcularEscalaCardsAtletas(16)).toBe(1);
  });

  it("acima da referência, encolhe proporcionalmente", () => {
    expect(calcularEscalaCardsAtletas(32)).toBeCloseTo(0.5, 5);
  });

  it("nunca encolhe abaixo do piso de legibilidade, mesmo com elenco enorme", () => {
    expect(calcularEscalaCardsAtletas(1000)).toBe(0.5);
  });

  it("zero atletas não quebra (divisão por zero não acontece por causa do <=)", () => {
    expect(calcularEscalaCardsAtletas(0)).toBe(1);
  });
});
