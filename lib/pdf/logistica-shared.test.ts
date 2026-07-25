import { describe, expect, it } from "vitest";
import { ordenarQuartosPorApartamento } from "./logistica-shared";

interface QuartoTeste {
  id: string;
  numeroApartamento: string | null;
}

const quartos: QuartoTeste[] = [
  { id: "a", numeroApartamento: "12" },
  { id: "b", numeroApartamento: "3" },
  { id: "c", numeroApartamento: null },
  { id: "d", numeroApartamento: "101" },
  { id: "e", numeroApartamento: "Bloco 2 - 45" },
  { id: "f", numeroApartamento: "" },
];

describe("ordenarQuartosPorApartamento", () => {
  it("sem ordem definida, mantém a lista original (ordem de cadastro)", () => {
    expect(ordenarQuartosPorApartamento(quartos, undefined)).toEqual(quartos);
  });

  it("apto_asc ordena do menor apartamento pro maior, sem número no final", () => {
    // números extraídos: a=12, b=3, d=101, e=2 (de "Bloco 2 - 45")
    const resultado = ordenarQuartosPorApartamento(quartos, "apto_asc").map((q) => q.id);
    expect(resultado).toEqual(["e", "b", "a", "d", "c", "f"]);
  });

  it("apto_desc ordena do maior apartamento pro menor, sem número ainda no final", () => {
    const resultado = ordenarQuartosPorApartamento(quartos, "apto_desc").map((q) => q.id);
    expect(resultado).toEqual(["d", "a", "b", "e", "c", "f"]);
  });

  it("extrai o primeiro número mesmo com texto misturado (ex: 'Bloco 2 - 45' -> 2)", () => {
    const apenasTextoMisturado: QuartoTeste[] = [
      { id: "x", numeroApartamento: "Bloco 2 - 45" },
      { id: "y", numeroApartamento: "10" },
    ];
    expect(ordenarQuartosPorApartamento(apenasTextoMisturado, "apto_asc").map((q) => q.id)).toEqual(["x", "y"]);
  });

  it("lista vazia retorna lista vazia", () => {
    expect(ordenarQuartosPorApartamento([], "apto_asc")).toEqual([]);
  });
});
