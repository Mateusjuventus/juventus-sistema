import { describe, expect, it } from "vitest";
import { calcularAlturaProgramacaoGeral } from "./programacao-geral-document";
import type { ProgramacaoGeralCategoria } from "@/lib/programacao/programacao-geral-data";
import type { MicrocicloDia } from "@/lib/programacao/microciclo-data";

function dia(overrides: Partial<MicrocicloDia> = {}): MicrocicloDia {
  return {
    data: "2026-08-24",
    diaSemana: "SEGUNDA",
    dataFmt: "24/08",
    atividadesPorTurno: { manha: [], tarde: [], noite: [] },
    temAtividade: false,
    ...overrides,
  };
}

function categoria(overrides: Partial<ProgramacaoGeralCategoria> = {}): ProgramacaoGeralCategoria {
  return {
    categoria: "sub20",
    categoriaLabel: "Sub-20",
    dias: [dia(), dia(), dia(), dia(), dia(), dia(), dia()],
    manhaVisivel: false,
    tardeVisivel: false,
    temAtividadeNaSemana: false,
    ...overrides,
  };
}

describe("calcularAlturaProgramacaoGeral", () => {
  it("semana totalmente vazia (7 categorias em DESCANSO) cai no piso mínimo", () => {
    const categorias = [categoria(), categoria(), categoria(), categoria(), categoria(), categoria(), categoria()];
    const alturaVazia = calcularAlturaProgramacaoGeral(categorias);

    const comAtividade = [
      categoria({ temAtividadeNaSemana: true, manhaVisivel: true, tardeVisivel: true }),
      categoria(),
      categoria(),
      categoria(),
      categoria(),
      categoria(),
      categoria(),
    ];
    expect(calcularAlturaProgramacaoGeral(comAtividade)).toBeGreaterThan(alturaVazia);
  });

  it("cresce conforme mais grupos de turno ficam visíveis", () => {
    const semTurno = [categoria({ temAtividadeNaSemana: true, manhaVisivel: false, tardeVisivel: false })];
    const soManha = [categoria({ temAtividadeNaSemana: true, manhaVisivel: true, tardeVisivel: false })];
    const manhaETarde = [categoria({ temAtividadeNaSemana: true, manhaVisivel: true, tardeVisivel: true })];

    const alturaSemTurno = calcularAlturaProgramacaoGeral(semTurno);
    const alturaSoManha = calcularAlturaProgramacaoGeral(soManha);
    const alturaManhaETarde = calcularAlturaProgramacaoGeral(manhaETarde);

    expect(alturaSoManha).toBeGreaterThan(alturaSemTurno);
    expect(alturaManhaETarde).toBeGreaterThan(alturaSoManha);
  });

  it("mais categorias somam mais altura", () => {
    const umaCategoria = [categoria()];
    const seteCategorias = [categoria(), categoria(), categoria(), categoria(), categoria(), categoria(), categoria()];
    expect(calcularAlturaProgramacaoGeral(seteCategorias)).toBeGreaterThan(calcularAlturaProgramacaoGeral(umaCategoria));
  });

  it("nenhuma categoria: altura é só o piso fixo (padding + banner + cabeçalho de dias)", () => {
    expect(calcularAlturaProgramacaoGeral([])).toBeGreaterThan(0);
  });
});
