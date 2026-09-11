import { describe, expect, it, vi, afterEach } from "vitest";
import { formatDataHoraBrasilia, hojeBrasilia } from "./data-brasil";

describe("hojeBrasilia", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("converte pro dia de Brasília mesmo quando UTC já virou o dia seguinte", () => {
    // 01:15 UTC do dia 28 = 22:15 do dia 27 em São Paulo — "hoje" deve ser 27, não 28.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T01:15:00.000Z"));
    expect(hojeBrasilia()).toBe("2026-07-27");
  });

  it("no meio do dia, UTC e São Paulo concordam no mesmo dia", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T15:30:00.000Z"));
    expect(hojeBrasilia()).toBe("2026-07-27");
  });
});

describe("formatDataHoraBrasilia", () => {
  it("converte um timestamp UTC pra hora de Brasília (3h a menos)", () => {
    // Bug real reportado pelo Mateus: a tela de Vagas de Staff mostrava "17:19" (o valor cru salvo
    // em UTC) pra quem pegou a vaga às 14:19 de verdade em São Paulo.
    expect(formatDataHoraBrasilia("2026-09-11T17:19:00.000Z")).toBe("11/09/2026 às 14:19");
  });

  it("quando a conversão de fuso muda o dia (perto da meia-noite em Brasília)", () => {
    // 02:15 UTC do dia 12 = 23:15 do dia 11 em São Paulo — data E hora precisam refletir isso.
    expect(formatDataHoraBrasilia("2026-09-12T02:15:00.000Z")).toBe("11/09/2026 às 23:15");
  });

  it("preenche hora e minuto com zero à esquerda", () => {
    expect(formatDataHoraBrasilia("2026-01-05T03:05:00.000Z")).toBe("05/01/2026 às 00:05");
  });
});
