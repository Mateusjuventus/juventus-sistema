import { describe, expect, it } from "vitest";
import { calcularLinhaDoTempoAtivo, linhaMaisRecenteAtivo } from "./ativo-historico";
import type { AtletaAtivoHistoricoRow } from "@/lib/supabase/types";

function linha(
  data: string,
  ativo: boolean,
  createdAt = `${data}T12:00:00Z`,
  motivo: string | null = null,
): AtletaAtivoHistoricoRow {
  return {
    id: `${data}-${ativo}-${createdAt}`,
    atleta_id: "atleta-1",
    ativo,
    motivo,
    observacao: null,
    data,
    criado_por_perfil_id: null,
    criado_por_nome: "Fulano",
    created_at: createdAt,
  };
}

describe("linhaMaisRecenteAtivo", () => {
  it("devolve null numa lista vazia", () => {
    expect(linhaMaisRecenteAtivo([])).toBeNull();
  });

  it("escolhe a linha de maior data", () => {
    const linhas = [linha("2026-09-01", true), linha("2026-09-20", false), linha("2026-09-10", true)];
    expect(linhaMaisRecenteAtivo(linhas)?.ativo).toBe(false);
  });

  it("empate de data resolvido pelo created_at mais recente", () => {
    const linhas = [
      linha("2026-09-10", true, "2026-09-10T08:00:00Z"),
      linha("2026-09-10", false, "2026-09-10T18:00:00Z"),
    ];
    expect(linhaMaisRecenteAtivo(linhas)?.ativo).toBe(false);
  });
});

describe("calcularLinhaDoTempoAtivo", () => {
  it("calcula dias entre lançamentos consecutivos, sem +1 (a data do próximo já é do estado seguinte)", () => {
    const linhas = [linha("2026-09-01", false, undefined, "rescisao_contrato"), linha("2026-09-10", true)];
    const resultado = calcularLinhaDoTempoAtivo(linhas, "2026-09-30");
    // Mais recente primeiro.
    expect(resultado[0].ativo).toBe(true);
    expect(resultado[0].dias).toBe(20); // 10/09 até hoje (30/09)
    expect(resultado[1].ativo).toBe(false);
    expect(resultado[1].motivo).toBe("rescisao_contrato");
    expect(resultado[1].dias).toBe(9); // 01/09 até 10/09
  });

  it("a linha mais recente usa 'hoje' como fim", () => {
    const linhas = [linha("2026-09-28", false)];
    const resultado = calcularLinhaDoTempoAtivo(linhas, "2026-09-30");
    expect(resultado[0].dias).toBe(2);
  });

  it("lista vazia devolve lista vazia", () => {
    expect(calcularLinhaDoTempoAtivo([], "2026-09-30")).toEqual([]);
  });
});
