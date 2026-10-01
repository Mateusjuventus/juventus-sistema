import { describe, expect, it } from "vitest";
import { calcularLinhaDoTempo, linhaMaisRecente } from "./status-historico";
import type { AtletaStatusHistoricoRow } from "@/lib/supabase/types";

function linha(
  data: string,
  status: AtletaStatusHistoricoRow["status"],
  createdAt = `${data}T12:00:00Z`,
): AtletaStatusHistoricoRow {
  return {
    id: `${data}-${status}-${createdAt}`,
    atleta_id: "atleta-1",
    status,
    data,
    criado_por_perfil_id: null,
    criado_por_nome: "Fulano",
    created_at: createdAt,
  };
}

describe("linhaMaisRecente", () => {
  it("devolve null numa lista vazia", () => {
    expect(linhaMaisRecente([])).toBeNull();
  });

  it("escolhe a linha de maior data", () => {
    const linhas = [linha("2026-09-01", "liberado"), linha("2026-09-20", "departamento_medico"), linha("2026-09-10", "transicao")];
    expect(linhaMaisRecente(linhas)?.status).toBe("departamento_medico");
  });

  it("empate de data resolvido pelo created_at mais recente", () => {
    const linhas = [
      linha("2026-09-10", "liberado", "2026-09-10T08:00:00Z"),
      linha("2026-09-10", "transicao", "2026-09-10T18:00:00Z"),
    ];
    expect(linhaMaisRecente(linhas)?.status).toBe("transicao");
  });
});

describe("calcularLinhaDoTempo", () => {
  it("calcula dias entre lançamentos consecutivos, sem +1 (a data do próximo já é do status seguinte)", () => {
    const linhas = [linha("2026-09-01", "departamento_medico"), linha("2026-09-10", "liberado")];
    const resultado = calcularLinhaDoTempo(linhas, "2026-09-30");
    // Mais recente primeiro.
    expect(resultado[0].status).toBe("liberado");
    expect(resultado[0].dias).toBe(20); // 10/09 até hoje (30/09)
    expect(resultado[1].status).toBe("departamento_medico");
    expect(resultado[1].dias).toBe(9); // 01/09 até 10/09
  });

  it("a linha mais recente usa 'hoje' como fim", () => {
    const linhas = [linha("2026-09-28", "transicao")];
    const resultado = calcularLinhaDoTempo(linhas, "2026-09-30");
    expect(resultado[0].dias).toBe(2);
  });

  it("lista vazia devolve lista vazia", () => {
    expect(calcularLinhaDoTempo([], "2026-09-30")).toEqual([]);
  });
});
