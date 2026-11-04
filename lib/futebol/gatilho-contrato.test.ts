import { describe, expect, it } from "vitest";
import type { EstatisticasAtleta } from "./estatisticas-atleta";
import { bonusGatilhosDoMes, calcularProgressoGatilho, type GatilhoCumpridoAtleta } from "./gatilho-contrato";

function stats(overrides: Partial<EstatisticasAtleta>): EstatisticasAtleta {
  return {
    titular: 0,
    banco: 0,
    naoConvocado: 0,
    gols: 0,
    assistencias: 0,
    cartoesAmarelos: 0,
    cartoesVermelhos: 0,
    minutosTotais: 0,
    jogosMaisUmTempo: 0,
    jogosJogoCompleto: 0,
    ...overrides,
  };
}

describe("calcularProgressoGatilho", () => {
  it("pct_convocado: titular + banco sobre o total de jogos", () => {
    const resultado = calcularProgressoGatilho(
      stats({ titular: 3, banco: 2, naoConvocado: 5 }),
      "pct_convocado",
      50,
    );
    expect(resultado.atual).toBe(50);
    expect(resultado.atingida).toBe(true);
  });

  it("pct_titular: só titular sobre o total de jogos", () => {
    const resultado = calcularProgressoGatilho(stats({ titular: 3, banco: 2, naoConvocado: 5 }), "pct_titular", 50);
    expect(resultado.atual).toBe(30);
    expect(resultado.atingida).toBe(false);
  });

  it("pct_mais_um_tempo: jogosMaisUmTempo sobre o total de jogos", () => {
    const resultado = calcularProgressoGatilho(
      stats({ titular: 7, banco: 0, naoConvocado: 3, jogosMaisUmTempo: 7 }),
      "pct_mais_um_tempo",
      70,
    );
    expect(resultado.atual).toBe(70);
    expect(resultado.atingida).toBe(true);
  });

  it("pct_jogo_completo: jogosJogoCompleto sobre o total de jogos", () => {
    const resultado = calcularProgressoGatilho(
      stats({ titular: 10, jogosJogoCompleto: 6 }),
      "pct_jogo_completo",
      70,
    );
    expect(resultado.atual).toBe(60);
    expect(resultado.atingida).toBe(false);
  });

  it("total_gols: contagem absoluta, sem divisão", () => {
    const resultado = calcularProgressoGatilho(stats({ gols: 10 }), "total_gols", 10);
    expect(resultado.atual).toBe(10);
    expect(resultado.atingida).toBe(true);
  });

  it("total_assistencias: contagem absoluta, sem divisão", () => {
    const resultado = calcularProgressoGatilho(stats({ assistencias: 4 }), "total_assistencias", 5);
    expect(resultado.atual).toBe(4);
    expect(resultado.atingida).toBe(false);
  });

  it("percentual fica em 0% (não divide por zero) quando não há nenhum jogo no universo", () => {
    const resultado = calcularProgressoGatilho(stats({}), "pct_convocado", 50);
    expect(resultado.atual).toBe(0);
    expect(resultado.atingida).toBe(false);
  });

  it("atingida conta igual quando bate exatamente o limiar", () => {
    const resultado = calcularProgressoGatilho(stats({ gols: 5 }), "total_gols", 5);
    expect(resultado.atingida).toBe(true);
  });
});

function gatilhoCumprido(overrides: Partial<GatilhoCumpridoAtleta>): GatilhoCumpridoAtleta {
  return {
    atletaId: "atleta-1",
    atletaNome: "Fulano",
    metrica: "total_gols",
    valorBonus: 1000,
    cumpridaEm: "2026-11-04",
    ...overrides,
  };
}

describe("bonusGatilhosDoMes", () => {
  it("soma só os confirmados dentro do mês de hojeStr", () => {
    const resultado = bonusGatilhosDoMes(
      [
        gatilhoCumprido({ atletaId: "a1", valorBonus: 1000, cumpridaEm: "2026-11-03" }),
        gatilhoCumprido({ atletaId: "a2", valorBonus: 500, cumpridaEm: "2026-11-30" }),
        gatilhoCumprido({ atletaId: "a3", valorBonus: 2000, cumpridaEm: "2026-10-31" }),
      ],
      "2026-11-04",
    );
    expect(resultado.itens).toHaveLength(2);
    expect(resultado.total).toBe(1500);
  });

  it("fica em 0 sem nenhum gatilho confirmado no mês", () => {
    const resultado = bonusGatilhosDoMes([gatilhoCumprido({ cumpridaEm: "2026-09-15" })], "2026-11-04");
    expect(resultado.itens).toHaveLength(0);
    expect(resultado.total).toBe(0);
  });

  it("lista vazia não quebra", () => {
    const resultado = bonusGatilhosDoMes([], "2026-11-04");
    expect(resultado.total).toBe(0);
  });
});
