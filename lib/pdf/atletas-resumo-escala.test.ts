import { describe, expect, it } from "vitest";
import { calcularEscalaCardsAtletas } from "./atletas-resumo-escala";

describe("calcularEscalaCardsAtletas", () => {
  it("sempre escala 1 (tamanho de referência cheio) — elenco grande vira mais páginas, não cards menores", () => {
    expect(calcularEscalaCardsAtletas(10)).toBe(1);
    expect(calcularEscalaCardsAtletas(16)).toBe(1);
    expect(calcularEscalaCardsAtletas(32)).toBe(1);
    expect(calcularEscalaCardsAtletas(1000)).toBe(1);
  });

  it("zero atletas não quebra", () => {
    expect(calcularEscalaCardsAtletas(0)).toBe(1);
  });
});
