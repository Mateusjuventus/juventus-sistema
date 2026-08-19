import { describe, expect, it } from "vitest";
import { calcularVagasAlojamento } from "./alojamento";

describe("calcularVagasAlojamento", () => {
  it("calcula disponiveis normalmente", () => {
    expect(calcularVagasAlojamento(20, 12)).toEqual({
      capacidadeTotal: 20,
      alojados: 12,
      disponiveis: 8,
      acimaDaCapacidade: false,
    });
  });

  it("nunca devolve disponiveis negativo quando passou da capacidade", () => {
    const resultado = calcularVagasAlojamento(10, 13);
    expect(resultado.disponiveis).toBe(0);
    expect(resultado.acimaDaCapacidade).toBe(true);
  });

  it("capacidade zero com ninguém alojado", () => {
    expect(calcularVagasAlojamento(0, 0)).toEqual({
      capacidadeTotal: 0,
      alojados: 0,
      disponiveis: 0,
      acimaDaCapacidade: false,
    });
  });
});
