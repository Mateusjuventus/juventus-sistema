import { describe, expect, it, vi, afterEach } from "vitest";
import { hojeBrasilia } from "./data-brasil";

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
