import { describe, expect, it } from "vitest";
import { minutosDoHorario, ordenarPorHorario } from "./programacao-horario";

describe("minutosDoHorario", () => {
  it("lê os formatos que aparecem na programação", () => {
    expect(minutosDoHorario("12:00")).toBe(12 * 60);
    expect(minutosDoHorario("12h30")).toBe(12 * 60 + 30);
    expect(minutosDoHorario("12h")).toBe(12 * 60);
    expect(minutosDoHorario("09:05")).toBe(9 * 60 + 5);
    expect(minutosDoHorario(" 7:00 ")).toBe(7 * 60);
  });

  it("usa o primeiro horário quando a linha é um intervalo", () => {
    expect(minutosDoHorario("7:00 às 7:45")).toBe(7 * 60);
    expect(minutosDoHorario("14h00 - 15h30")).toBe(14 * 60);
  });

  it("devolve null quando não dá pra interpretar", () => {
    expect(minutosDoHorario("A definir")).toBeNull();
    expect(minutosDoHorario("")).toBeNull();
    expect(minutosDoHorario(null)).toBeNull();
    expect(minutosDoHorario("99:00")).toBeNull();
  });
});

describe("ordenarPorHorario", () => {
  it("ordena do menor pro maior, não em ordem de texto", () => {
    const itens = [
      { horario: "12:00", ordem: 0 },
      { horario: "9:00", ordem: 1 },
      { horario: "7:00 às 7:45", ordem: 2 },
      { horario: "15h30", ordem: 3 },
    ];
    expect(ordenarPorHorario(itens).map((i) => i.horario)).toEqual([
      "7:00 às 7:45",
      "9:00",
      "12:00",
      "15h30",
    ]);
  });

  it("desempata pelo campo ordem, pra a lista não dançar a cada carregamento", () => {
    const itens = [
      { horario: "10:00", ordem: 2 },
      { horario: "10:00", ordem: 0 },
      { horario: "10h00", ordem: 1 },
    ];
    expect(ordenarPorHorario(itens).map((i) => i.ordem)).toEqual([0, 1, 2]);
  });

  it("manda pro fim quem não tem horário interpretável, preservando a ordem entre eles", () => {
    const itens = [
      { horario: "A definir", ordem: 0 },
      { horario: "13:00", ordem: 1 },
      { horario: "Após o jogo", ordem: 2 },
    ];
    expect(ordenarPorHorario(itens).map((i) => i.horario)).toEqual(["13:00", "A definir", "Após o jogo"]);
  });

  it("não altera o array original", () => {
    const original = [
      { horario: "18:00", ordem: 0 },
      { horario: "08:00", ordem: 1 },
    ];
    ordenarPorHorario(original);
    expect(original.map((i) => i.horario)).toEqual(["18:00", "08:00"]);
  });
});
