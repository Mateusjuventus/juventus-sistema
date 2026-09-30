import { describe, expect, it } from "vitest";
import { diasAfastados, queixaTipoLabel, statusFisioterapiaAtleta } from "./fisioterapia";

describe("diasAfastados", () => {
  it("conta o mesmo dia como 1 dia afastado", () => {
    expect(diasAfastados("2026-09-01", "2026-09-01", "2026-09-30")).toBe(1);
  });

  it("conta o período fechado, inclusive", () => {
    expect(diasAfastados("2026-09-01", "2026-09-10", "2026-09-30")).toBe(10);
  });

  it("lesão ainda ativa (sem data_fim) usa 'hoje' no lugar do fim", () => {
    expect(diasAfastados("2026-09-25", null, "2026-09-30")).toBe(6);
  });

  it("nunca devolve menos que 1", () => {
    expect(diasAfastados("2026-09-30", "2026-09-30", "2026-09-30")).toBe(1);
  });
});

describe("queixaTipoLabel", () => {
  it("traduz os dois tipos", () => {
    expect(queixaTipoLabel("muscular")).toBe("Muscular");
    expect(queixaTipoLabel("articular")).toBe("Articular");
  });
});

describe("statusFisioterapiaAtleta", () => {
  it("com lesão ativa, vai pra Depto. Médico", () => {
    expect(statusFisioterapiaAtleta(true)).toBe("departamento_medico");
  });

  it("sem lesão ativa, volta pra Apto", () => {
    expect(statusFisioterapiaAtleta(false)).toBe("liberado");
  });
});
