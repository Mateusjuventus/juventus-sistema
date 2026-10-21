import { describe, expect, it } from "vitest";
import { avisosFormatoPartidaBase, type RegrasFormatoPartidaBase } from "./formato-partida-base";

const REGRAS_SUB11: RegrasFormatoPartidaBase = {
  numeroTempos: 3,
  elencoMinimoEmCampo: 18,
  minutosMinimosPorAtleta: 17,
  regraTempo1: "somente_titulares",
  regraTempo2: "somente_reservas",
  regraTempo3: "livre_ilimitada",
};

const REGRAS_SEM_PARTICULARIDADE: RegrasFormatoPartidaBase = {
  numeroTempos: 2,
  elencoMinimoEmCampo: null,
  minutosMinimosPorAtleta: null,
  regraTempo1: "livre",
  regraTempo2: "livre",
  regraTempo3: null,
};

function atleta(nome: string, minutosJogados: number) {
  return { atletaId: nome, nome, minutosJogados };
}

describe("avisosFormatoPartidaBase", () => {
  it("sem regras preenchidas (competição sem particularidade): nunca gera aviso", () => {
    const avisos = avisosFormatoPartidaBase(
      REGRAS_SEM_PARTICULARIDADE,
      [atleta("Atleta 1", 0)],
      [{ tipo: "substituicao", tempo: "primeiro" }],
    );
    expect(avisos).toEqual([]);
  });

  it("elenco abaixo do mínimo: gera aviso com a contagem", () => {
    const avisos = avisosFormatoPartidaBase(
      REGRAS_SUB11,
      [atleta("Atleta 1", 51), atleta("Atleta 2", 51)],
      [],
    );
    expect(avisos).toContain("Elenco abaixo do mínimo: 2 atleta(s) na súmula, mínimo exigido é 18.");
  });

  it("elenco igual ou acima do mínimo: não gera aviso de elenco", () => {
    const atletas = Array.from({ length: 18 }, (_, i) => atleta(`Atleta ${i}`, 51));
    const avisos = avisosFormatoPartidaBase(REGRAS_SUB11, atletas, []);
    expect(avisos.some((a) => a.includes("Elenco abaixo do mínimo"))).toBe(false);
  });

  it("atleta abaixo do mínimo de minutos: gera aviso nominal", () => {
    const avisos = avisosFormatoPartidaBase(REGRAS_SUB11, [atleta("Fulano", 10)], []);
    expect(avisos).toContain("Fulano: jogou 10min, abaixo do mínimo de 17min por atleta.");
  });

  it("atleta com minutos exatamente no mínimo: não gera aviso", () => {
    const avisos = avisosFormatoPartidaBase(REGRAS_SUB11, [atleta("Fulano", 17)], []);
    expect(avisos.some((a) => a.startsWith("Fulano"))).toBe(false);
  });

  it("substituição no 1º tempo (somente_titulares): gera aviso", () => {
    const avisos = avisosFormatoPartidaBase(REGRAS_SUB11, [], [{ tipo: "substituicao", tempo: "primeiro" }]);
    expect(avisos.some((a) => a.includes("1º tempo"))).toBe(true);
  });

  it("substituição no 2º tempo (somente_reservas): gera aviso", () => {
    const avisos = avisosFormatoPartidaBase(REGRAS_SUB11, [], [{ tipo: "substituicao", tempo: "segundo" }]);
    expect(avisos.some((a) => a.includes("2º tempo"))).toBe(true);
  });

  it("substituição no 3º tempo (livre_ilimitada): não gera aviso", () => {
    const avisos = avisosFormatoPartidaBase(REGRAS_SUB11, [], [{ tipo: "substituicao", tempo: "terceiro" }]);
    expect(avisos.some((a) => a.includes("3º tempo"))).toBe(false);
  });

  it("gol/cartão não disparam aviso de substituição, mesmo em tempo restrito", () => {
    const avisos = avisosFormatoPartidaBase(
      REGRAS_SUB11,
      [],
      [
        { tipo: "gol", tempo: "primeiro" },
        { tipo: "cartao_amarelo", tempo: "segundo" },
      ],
    );
    expect(avisos).toEqual([]);
  });
});
