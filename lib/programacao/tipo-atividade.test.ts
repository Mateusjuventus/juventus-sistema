import { describe, expect, it } from "vitest";
import { turnoDoHorarioInicio, turnoLabel, formatHorarioCurto } from "./tipo-atividade";

describe("turnoDoHorarioInicio", () => {
  it("antes de 12h é manhã", () => {
    expect(turnoDoHorarioInicio("07:30")).toBe("manha");
    expect(turnoDoHorarioInicio("11:59")).toBe("manha");
  });

  it("de 12h até 17h59 é tarde", () => {
    expect(turnoDoHorarioInicio("12:00")).toBe("tarde");
    expect(turnoDoHorarioInicio("17:59")).toBe("tarde");
  });

  it("de 18h em diante é noite", () => {
    expect(turnoDoHorarioInicio("18:00")).toBe("noite");
    expect(turnoDoHorarioInicio("23:00")).toBe("noite");
  });
});

describe("turnoLabel", () => {
  it("traduz cada turno pro rótulo em português", () => {
    expect(turnoLabel("manha")).toBe("Manhã");
    expect(turnoLabel("tarde")).toBe("Tarde");
    expect(turnoLabel("noite")).toBe("Noite");
  });
});

describe("formatHorarioCurto", () => {
  it("corta os segundos que vêm do Postgres", () => {
    expect(formatHorarioCurto("14:30:00")).toBe("14:30");
  });

  it("mantém HH:MM como está", () => {
    expect(formatHorarioCurto("09:00")).toBe("09:00");
  });

  it("devolve string vazia pra horário nulo", () => {
    expect(formatHorarioCurto(null)).toBe("");
  });
});
