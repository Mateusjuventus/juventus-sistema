import { describe, expect, it } from "vitest";
import { calcularRendimento } from "./rendimento";
import type { DemandaRow } from "@/lib/supabase/types";

const HOJE = "2026-10-05";

function demanda(overrides: Partial<DemandaRow> = {}): DemandaRow {
  return {
    id: "id-1",
    titulo: "Demanda de teste",
    descricao: null,
    prazo: null,
    status: "pendente",
    responsavel_id: "user-1",
    created_at: "2026-09-01T10:00:00.000Z",
    updated_at: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("calcularRendimento", () => {
  it("demanda sem prazo não entra no cálculo de % hoje nem % semana", () => {
    const resultado = calcularRendimento([demanda({ prazo: null, status: "concluido" })], HOJE);
    expect(resultado.percentualHoje).toBeNull();
    expect(resultado.percentualSemana).toBeNull();
  });

  it("prazo futuro não entra em % hoje nem conta como atrasada", () => {
    const resultado = calcularRendimento([demanda({ prazo: "2026-10-10", status: "pendente" })], HOJE);
    expect(resultado.percentualHoje).toBeNull();
    expect(resultado.atrasadas).toBe(0);
    expect(resultado.pendentes).toBe(1);
  });

  it("prazo igual a hoje entra em % hoje e em % semana", () => {
    const resultado = calcularRendimento(
      [demanda({ prazo: HOJE, status: "concluido", updated_at: "2026-10-05T09:00:00.000Z" })],
      HOJE,
    );
    expect(resultado.percentualHoje).toBe(100);
    expect(resultado.percentualSemana).toBe(100);
  });

  it("atrasada (prazo passado, status não concluído) conta em atrasadas e pendentes, e entra em % hoje como não concluída", () => {
    const resultado = calcularRendimento([demanda({ prazo: "2026-10-01", status: "em_andamento" })], HOJE);
    expect(resultado.atrasadas).toBe(1);
    expect(resultado.pendentes).toBe(1);
    expect(resultado.percentualHoje).toBe(0);
  });

  it("concluída fora da janela de 30 dias não entra em concluidasUltimos30Dias", () => {
    const resultado = calcularRendimento(
      [demanda({ status: "concluido", updated_at: "2026-08-01T10:00:00.000Z" })],
      HOJE,
    );
    expect(resultado.concluidasUltimos30Dias).toBe(0);
  });

  it("concluída dentro da janela de 30 dias conta em concluidasUltimos30Dias", () => {
    const resultado = calcularRendimento(
      [demanda({ status: "concluido", updated_at: "2026-09-20T10:00:00.000Z" })],
      HOJE,
    );
    expect(resultado.concluidasUltimos30Dias).toBe(1);
  });

  it("prazo há 8 dias fica fora de % semana, mas dentro de % hoje", () => {
    const resultado = calcularRendimento([demanda({ prazo: "2026-09-27", status: "concluido" })], HOJE);
    expect(resultado.percentualSemana).toBeNull();
    expect(resultado.percentualHoje).toBe(100);
  });

  it("conjunto misto calcula as 5 métricas corretamente", () => {
    const demandas: DemandaRow[] = [
      demanda({ id: "1", prazo: "2026-10-05", status: "concluido", updated_at: "2026-10-05T08:00:00.000Z" }),
      demanda({ id: "2", prazo: "2026-10-03", status: "pendente" }),
      demanda({ id: "3", prazo: "2026-10-10", status: "pendente" }),
      demanda({ id: "4", prazo: null, status: "em_andamento" }),
    ];
    const resultado = calcularRendimento(demandas, HOJE);
    // comPrazoAteHoje: #1 (concluída) e #2 (pendente) → 1/2 = 50%
    expect(resultado.percentualHoje).toBe(50);
    // pendentes: #2, #3, #4 → 3
    expect(resultado.pendentes).toBe(3);
    // atrasadas: só #2 (pendente, prazo < hoje)
    expect(resultado.atrasadas).toBe(1);
  });
});
