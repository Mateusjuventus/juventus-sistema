import { describe, expect, it } from "vitest";
import { calcularArtilheiros } from "./artilharia";

describe("calcularArtilheiros", () => {
  it("conta gols por atleta e ordena do maior pro menor", () => {
    const resultado = calcularArtilheiros([
      { atletaId: "a" },
      { atletaId: "b" },
      { atletaId: "a" },
      { atletaId: "a" },
      { atletaId: "b" },
    ]);
    expect(resultado).toEqual([
      { atletaId: "a", gols: 3 },
      { atletaId: "b", gols: 2 },
    ]);
  });

  it("ignora gols sem atleta (gol do adversário)", () => {
    const resultado = calcularArtilheiros([{ atletaId: "a" }, { atletaId: null }]);
    expect(resultado).toEqual([{ atletaId: "a", gols: 1 }]);
  });

  it("devolve lista vazia quando não há gols", () => {
    expect(calcularArtilheiros([])).toEqual([]);
  });
});
