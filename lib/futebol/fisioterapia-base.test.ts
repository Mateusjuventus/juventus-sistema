import { describe, expect, it } from "vitest";
import { statusFisioterapiaAtletaBase } from "./fisioterapia-base";

describe("statusFisioterapiaAtletaBase", () => {
  it("vira 'departamento_medico' quando há lesão ativa", () => {
    expect(statusFisioterapiaAtletaBase(true)).toBe("departamento_medico");
  });

  it("volta pra 'liberado' quando não há mais lesão ativa", () => {
    expect(statusFisioterapiaAtletaBase(false)).toBe("liberado");
  });
});
