import { describe, expect, it } from "vitest";
import { somarDias, inicioDaSemana, diasDaSemana } from "./semana";

describe("somarDias", () => {
  it("soma dias dentro do mesmo mês", () => {
    expect(somarDias("2026-08-24", 3)).toBe("2026-08-27");
  });

  it("atravessa o fim do mês", () => {
    expect(somarDias("2026-08-29", 3)).toBe("2026-09-01");
  });

  it("atravessa o fim do ano", () => {
    expect(somarDias("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("aceita deslocamento negativo", () => {
    expect(somarDias("2026-08-03", -5)).toBe("2026-07-29");
  });
});

describe("inicioDaSemana", () => {
  it("numa segunda-feira, devolve o próprio dia", () => {
    expect(inicioDaSemana("2026-08-24")).toBe("2026-08-24");
  });

  it("no meio da semana, volta pra segunda-feira", () => {
    expect(inicioDaSemana("2026-08-27")).toBe("2026-08-24"); // quinta
  });

  it("no domingo, volta pra segunda-feira da mesma semana (não da seguinte)", () => {
    expect(inicioDaSemana("2026-08-30")).toBe("2026-08-24");
  });

  it("no sábado, volta pra segunda-feira da mesma semana", () => {
    expect(inicioDaSemana("2026-08-29")).toBe("2026-08-24");
  });

  it("atravessa virada de mês ao voltar pra segunda-feira", () => {
    // 2026-09-01 é uma terça-feira — a segunda anterior é 2026-08-31.
    expect(inicioDaSemana("2026-09-01")).toBe("2026-08-31");
  });
});

describe("diasDaSemana", () => {
  it("devolve os 7 dias em ordem a partir de uma segunda-feira", () => {
    expect(diasDaSemana("2026-08-24")).toEqual([
      "2026-08-24",
      "2026-08-25",
      "2026-08-26",
      "2026-08-27",
      "2026-08-28",
      "2026-08-29",
      "2026-08-30",
    ]);
  });
});
