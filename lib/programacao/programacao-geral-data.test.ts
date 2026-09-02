import { describe, expect, it } from "vitest";
import { manhaVisivel, tardeVisivel } from "./programacao-geral-data";
import type { MicrocicloDia, MicrocicloAtividade } from "./microciclo-data";

function atividade(): MicrocicloAtividade {
  return {
    id: "a1",
    nome: "Treino",
    tipo: "treinamento",
    tipoLabel: "Treinamento",
    turno: "manha",
    horarioInicio: "09:00",
    horarioTermino: null,
    local: null,
    corBg: "#fff",
    corText: "#000",
    jogo: null,
  };
}

function dia(overrides: Partial<MicrocicloDia>): MicrocicloDia {
  return {
    data: "2026-08-24",
    diaSemana: "SEGUNDA",
    dataFmt: "24/08",
    atividadesPorTurno: { manha: [], tarde: [], noite: [] },
    temAtividade: false,
    ...overrides,
  };
}

describe("manhaVisivel", () => {
  it("nenhum dia com atividade de manhã: false", () => {
    const dias = [dia({}), dia({})];
    expect(manhaVisivel(dias)).toBe(false);
  });

  it("um dia com ao menos uma atividade de manhã: true", () => {
    const dias = [
      dia({}),
      dia({ atividadesPorTurno: { manha: [atividade()], tarde: [], noite: [] }, temAtividade: true }),
    ];
    expect(manhaVisivel(dias)).toBe(true);
  });
});

describe("tardeVisivel", () => {
  it("nenhum dia com atividade de tarde ou noite: false", () => {
    const dias = [dia({ atividadesPorTurno: { manha: [atividade()], tarde: [], noite: [] }, temAtividade: true })];
    expect(tardeVisivel(dias)).toBe(false);
  });

  it("um jogo lançado à tarde conta pro grupo Tarde", () => {
    const dias = [
      dia({ atividadesPorTurno: { manha: [], tarde: [{ ...atividade(), turno: "tarde" }], noite: [] }, temAtividade: true }),
    ];
    expect(tardeVisivel(dias)).toBe(true);
  });

  it("uma atividade só à noite também conta pro grupo Tarde (Tarde+Noite combinados)", () => {
    const dias = [
      dia({ atividadesPorTurno: { manha: [], tarde: [], noite: [{ ...atividade(), turno: "noite" }] }, temAtividade: true }),
    ];
    expect(tardeVisivel(dias)).toBe(true);
  });

  it("categoria totalmente vazia na semana: manhã e tarde ambos false (caso DESCANSO)", () => {
    const dias = [dia({}), dia({}), dia({}), dia({}), dia({}), dia({}), dia({})];
    expect(manhaVisivel(dias)).toBe(false);
    expect(tardeVisivel(dias)).toBe(false);
  });
});
