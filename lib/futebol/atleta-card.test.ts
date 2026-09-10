import { describe, expect, it } from "vitest";
import {
  CONTRATO_A_VENCER_DIAS,
  anoNascimento,
  contratoEstaVencendo,
  diasParaVencerContrato,
  formatDataBR,
} from "./atleta-card";

const HOJE = new Date(2026, 8, 9); // 09/09/2026 — mesma data "de hoje" usada no protótipo aprovado

function dataEmDias(dias: number): string {
  const data = new Date(HOJE);
  data.setDate(data.getDate() + dias);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

describe("formatDataBR", () => {
  it("converte AAAA-MM-DD pra DD/MM/AAAA", () => {
    expect(formatDataBR("2026-12-15")).toBe("15/12/2026");
  });

  it("usa travessão quando não há data (cadastro incompleto da Base)", () => {
    expect(formatDataBR(null)).toBe("—");
  });
});

describe("anoNascimento", () => {
  it("extrai o ano de uma data AAAA-MM-DD", () => {
    expect(anoNascimento("2004-05-10")).toBe(2004);
  });

  it("null quando não há data de nascimento cadastrada", () => {
    expect(anoNascimento(null)).toBeNull();
  });

  it("lê os 4 primeiros caracteres em vez de usar Date, pra não sofrer efeito de fuso horário", () => {
    // "2006-01-01" vira meia-noite UTC — em fusos negativos, `new Date(data).getFullYear()`
    // devolveria 2005 (31/12/2005 no horário local). Ler a string direto evita esse problema.
    expect(anoNascimento("2006-01-01")).toBe(2006);
  });
});

describe("diasParaVencerContrato", () => {
  it("null quando não há data de fim de contrato", () => {
    expect(diasParaVencerContrato(null, HOJE)).toBeNull();
  });

  it("conta os dias até a data de fim de contrato", () => {
    expect(diasParaVencerContrato(dataEmDias(30), HOJE)).toBe(30);
  });
});

describe("contratoEstaVencendo", () => {
  it(`é true bem no limite (${CONTRATO_A_VENCER_DIAS} dias)`, () => {
    expect(contratoEstaVencendo(dataEmDias(CONTRATO_A_VENCER_DIAS), false, HOJE)).toBe(true);
  });

  it("é true um dia antes do limite (89 dias)", () => {
    expect(contratoEstaVencendo(dataEmDias(CONTRATO_A_VENCER_DIAS - 1), false, HOJE)).toBe(true);
  });

  it("é false um dia depois do limite (91 dias)", () => {
    expect(contratoEstaVencendo(dataEmDias(CONTRATO_A_VENCER_DIAS + 1), false, HOJE)).toBe(false);
  });

  it("é false sem data de fim de contrato", () => {
    expect(contratoEstaVencendo(null, false, HOJE)).toBe(false);
  });

  it("é false pra atleta dispensado, mesmo com contrato já vencido", () => {
    expect(contratoEstaVencendo(dataEmDias(-10), true, HOJE)).toBe(false);
  });

  it("continua true pra atleta ativo com contrato já vencido e ainda não dispensado (mesmo comportamento de hoje)", () => {
    expect(contratoEstaVencendo(dataEmDias(-10), false, HOJE)).toBe(true);
  });
});
