import { describe, expect, it } from "vitest";
import { turnoDoHorarioInicio, turnoLabel, formatHorarioCurto, corHexAtividade } from "./tipo-atividade";
import { PROGRAMACAO_ATIVIDADE_TIPOS_ORDEM } from "./tipo-atividade";

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

describe("corHexAtividade", () => {
  it("devolve um par bg/text em hex pra todos os 9 tipos, sem faltar nenhum", () => {
    for (const tipo of PROGRAMACAO_ATIVIDADE_TIPOS_ORDEM) {
      const cor = corHexAtividade(tipo);
      expect(cor.bg).toMatch(/^#[0-9A-F]{6}$/i);
      expect(cor.text).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("jogo_oficial usa o grena do clube de fundo com texto branco", () => {
    expect(corHexAtividade("jogo_oficial")).toEqual({ bg: "#5C0A35", text: "#FFFFFF" });
  });
});
