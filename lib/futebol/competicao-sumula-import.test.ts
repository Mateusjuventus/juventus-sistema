import { describe, expect, it } from "vitest";
import type { SumulaPdfCartao, SumulaPdfDados } from "@/lib/fpf/sumula-pdf";
import {
  contarCartoesPorLado,
  equipeCorrespondente,
  montarResultadoImportado,
  normalizarEquipe,
} from "./competicao-sumula-import";

function cartao(equipe: string, cor: "amarelo" | "vermelho"): SumulaPdfCartao {
  return { equipe, numero: 10, nome: "Fulano", cor, minuto: 20, tempo: "primeiro" };
}

function dados(parcial: Partial<SumulaPdfDados> = {}): SumulaPdfDados {
  return {
    competicao: null,
    rodada: null,
    data: null,
    estadio: null,
    placarMandante: null,
    placarVisitante: null,
    acrescimoPrimeiroTempo: null,
    acrescimoSegundoTempo: null,
    jogadores: [],
    gols: [],
    cartoes: [],
    substituicoes: [],
    avisos: [],
    linhasDuracaoEncontradas: [],
    ...parcial,
  };
}

describe("normalizarEquipe", () => {
  it("tira acento, caixa e sufixos genéricos", () => {
    expect(normalizarEquipe("Grêmio Prudente E.C.")).toBe("gremio prudente");
    expect(normalizarEquipe("BANDEIRANTE EC")).toBe("bandeirante");
  });
});

describe("equipeCorrespondente", () => {
  it("casa nome parcial da súmula com a equipe cadastrada", () => {
    expect(equipeCorrespondente("Osasco Sporting Club", "Osasco Sporting", "Primavera")).toBe("A");
    expect(equipeCorrespondente("E.C. Primavera", "Osasco Sporting", "Primavera")).toBe("B");
  });

  it("ignora acento e maiúsculas", () => {
    expect(equipeCorrespondente("GRÊMIO PRUDENTE", "Gremio Prudente", "Marília")).toBe("A");
  });

  it("devolve null quando não dá pra decidir", () => {
    expect(equipeCorrespondente("Time Desconhecido", "Linense", "Marília")).toBeNull();
  });
});

describe("contarCartoesPorLado", () => {
  it("separa amarelos e vermelhos de cada equipe", () => {
    const resultado = contarCartoesPorLado(
      [
        cartao("Linense", "amarelo"),
        cartao("Linense", "amarelo"),
        cartao("Marília FC", "amarelo"),
        cartao("Marília FC", "vermelho"),
      ],
      "Linense",
      "Marília",
    );
    expect(resultado).toMatchObject({ amarelosA: 2, vermelhosA: 0, amarelosB: 1, vermelhosB: 1 });
    expect(resultado.naoIdentificados).toEqual([]);
  });

  it("reporta equipe que não bateu, sem contar errado", () => {
    const resultado = contarCartoesPorLado([cartao("Outro Clube", "amarelo")], "Linense", "Marília");
    expect(resultado).toMatchObject({ amarelosA: 0, amarelosB: 0 });
    expect(resultado.naoIdentificados).toEqual(["Outro Clube"]);
  });
});

describe("montarResultadoImportado", () => {
  it("usa o placar do PDF e os cartões de cada lado", () => {
    const resultado = montarResultadoImportado(
      dados({
        placarMandante: 2,
        placarVisitante: 1,
        rodada: "3ª rodada",
        data: "2026-08-09",
        cartoes: [cartao("Linense", "amarelo"), cartao("Marília", "vermelho")],
      }),
      "Linense",
      "Marília",
    );
    expect(resultado).toMatchObject({ golsCasa: 2, golsFora: 1, rodada: "3ª rodada", data: "2026-08-09" });
    expect(resultado.cartoes).toMatchObject({ amarelosA: 1, vermelhosB: 1 });
    expect(resultado.avisos).toEqual([]);
  });

  it("sem placar no PDF, conta pelos gols e avisa", () => {
    const resultado = montarResultadoImportado(
      dados({
        gols: [
          { equipe: "Linense", numero: 9, nome: "A", tipo: "normal", minuto: 10, tempo: "primeiro" },
          { equipe: "Linense", numero: 9, nome: "A", tipo: "normal", minuto: 20, tempo: "primeiro" },
          { equipe: "Marília", numero: 7, nome: "B", tipo: "normal", minuto: 30, tempo: "segundo" },
        ],
      }),
      "Linense",
      "Marília",
    );
    expect(resultado).toMatchObject({ golsCasa: 2, golsFora: 1 });
    expect(resultado.avisos.join(" ")).toContain("não trazia o placar");
  });

  it("gol contra conta pro adversário de quem marcou", () => {
    const resultado = montarResultadoImportado(
      dados({
        gols: [{ equipe: "Marília", numero: 4, nome: "C", tipo: "contra", minuto: 15, tempo: "primeiro" }],
      }),
      "Linense",
      "Marília",
    );
    expect(resultado).toMatchObject({ golsCasa: 1, golsFora: 0 });
  });
});
