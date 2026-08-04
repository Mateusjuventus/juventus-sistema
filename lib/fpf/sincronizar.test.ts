import { describe, expect, it } from "vitest";
import { converterDataFpf, converterHorarioFpf, preencherJogoDaFpf } from "./sincronizar";
import type { FpfJogo } from "./client";

function jogoFpf(overrides: Partial<FpfJogo> = {}): FpfJogo {
  return {
    IdJogo: 89928,
    Data: "02/08/2026",
    Horario: "16h00",
    Rodada: 3,
    Fase: "PRIMEIRA FASE",
    Grupo: "03",
    IdCampeonato: 100,
    IdCategoria: 70,
    NomePopularMandante: "Juventus SAF",
    NomePopularVisitante: "Primavera SAF",
    ResultadoMandante: 0,
    ResultadoVisitante: 1,
    Estadio: "Arena Crefisa Barueri",
    Municipio: "Barueri",
    LinkSumula: "https://conteudo.fpf.org.br/sumulas/2026/70100/20.pdf",
    Adiado: false,
    ...overrides,
  };
}

describe("converterDataFpf", () => {
  it("converte DD/MM/AAAA pra AAAA-MM-DD", () => {
    expect(converterDataFpf("31/07/2026")).toBe("2026-07-31");
  });
});

describe("converterHorarioFpf", () => {
  it("converte HHhMM pra HH:MM", () => {
    expect(converterHorarioFpf("20h00")).toBe("20:00");
  });
});

describe("preencherJogoDaFpf", () => {
  it("identifica o Juventus como mandante e usa o adversário certo", () => {
    const resultado = preencherJogoDaFpf(jogoFpf(), 287, "Copa Paulista Rivalo");
    expect(resultado.mandante).toBe(true);
    expect(resultado.adversarioNome).toBe("Primavera SAF");
    expect(resultado.golsPro).toBe(0);
    expect(resultado.golsContra).toBe(1);
  });

  it("identifica o Juventus como visitante e inverte o placar", () => {
    const resultado = preencherJogoDaFpf(
      jogoFpf({
        NomePopularMandante: "Primavera SAF",
        NomePopularVisitante: "Juventus SAF",
        ResultadoMandante: 2,
        ResultadoVisitante: 1,
      }),
      287,
      "Copa Paulista Rivalo",
    );
    expect(resultado.mandante).toBe(false);
    expect(resultado.adversarioNome).toBe("Primavera SAF");
    expect(resultado.golsPro).toBe(1);
    expect(resultado.golsContra).toBe(2);
  });

  it("monta rodada/fase/grupo legível", () => {
    const resultado = preencherJogoDaFpf(jogoFpf(), 287, "Copa Paulista Rivalo");
    expect(resultado.rodadaFase).toBe("PRIMEIRA FASE · Grupo 03 · 3ª rodada");
  });

  it("converte data e horário", () => {
    const resultado = preencherJogoDaFpf(jogoFpf(), 287, "Copa Paulista Rivalo");
    expect(resultado.dataJogo).toBe("2026-08-02");
    expect(resultado.horario).toBe("16:00");
  });

  it("mantém o fpfIdJogo e o link da súmula", () => {
    const resultado = preencherJogoDaFpf(jogoFpf(), 287, "Copa Paulista Rivalo");
    expect(resultado.fpfIdJogo).toBe(89928);
    expect(resultado.fpfLinkSumula).toBe("https://conteudo.fpf.org.br/sumulas/2026/70100/20.pdf");
  });
});
