import { describe, expect, it } from "vitest";
import type { AtletaContratoEvolucaoSalarialRow } from "@/lib/supabase/types";
import { diasRestantesContrato, evolucoesProximas, statusContrato, valorEfetivoRubrica } from "./contrato";

function evolucao(overrides: Partial<AtletaContratoEvolucaoSalarialRow>): AtletaContratoEvolucaoSalarialRow {
  return {
    id: "evolucao-1",
    contrato_id: "contrato-1",
    rubrica: "salario_ctps",
    data_vigencia: "2026-12-01",
    novo_valor: 10000,
    criado_por_perfil_id: null,
    criado_por_nome: "Mateus",
    created_at: "2026-11-04T00:00:00Z",
    ...overrides,
  };
}

describe("diasRestantesContrato", () => {
  it("calcula dias e meses quando há vigência futura", () => {
    expect(diasRestantesContrato("2026-12-04", "2026-11-04")).toEqual({ dias: 30, meses: 1 });
  });

  it("null quando não há vigenciaFim", () => {
    expect(diasRestantesContrato(null, "2026-11-04")).toBeNull();
  });

  it("null quando a vigência já passou", () => {
    expect(diasRestantesContrato("2026-10-01", "2026-11-04")).toBeNull();
  });

  it("zero dias no próprio dia do vencimento ainda conta (não é null)", () => {
    expect(diasRestantesContrato("2026-11-04", "2026-11-04")).toEqual({ dias: 0, meses: 0 });
  });
});

describe("statusContrato", () => {
  it("sem contrato quando não há vigente", () => {
    expect(statusContrato(undefined, "2026-11-04")).toEqual({ status: "sem_contrato", label: "Sem contrato" });
  });

  it("ativo quando não há vigenciaFim (sem prazo definido)", () => {
    expect(statusContrato({ vigencia_fim: null }, "2026-11-04")).toEqual({ status: "ativo", label: "Contrato Ativo" });
  });

  it("ativo quando a vigência ainda não passou", () => {
    expect(statusContrato({ vigencia_fim: "2026-12-31" }, "2026-11-04")).toEqual({
      status: "ativo",
      label: "Contrato Ativo",
    });
  });

  it("vencido quando a vigência já passou", () => {
    expect(statusContrato({ vigencia_fim: "2026-10-01" }, "2026-11-04")).toEqual({
      status: "vencido",
      label: "Contrato Vencido",
    });
  });
});

describe("valorEfetivoRubrica", () => {
  it("usa o valor do contrato quando não há nenhuma evolução aplicável", () => {
    expect(valorEfetivoRubrica(8000, [], "salario_ctps", "2026-11-04")).toBe(8000);
  });

  it("ignora evolução com data futura", () => {
    const evolucoes = [evolucao({ data_vigencia: "2026-12-01", novo_valor: 10000 })];
    expect(valorEfetivoRubrica(8000, evolucoes, "salario_ctps", "2026-11-04")).toBe(8000);
  });

  it("usa a evolução já aplicável", () => {
    const evolucoes = [evolucao({ data_vigencia: "2026-10-01", novo_valor: 9000 })];
    expect(valorEfetivoRubrica(8000, evolucoes, "salario_ctps", "2026-11-04")).toBe(9000);
  });

  it("usa a mais recente entre várias já aplicáveis", () => {
    const evolucoes = [
      evolucao({ id: "e1", data_vigencia: "2026-08-01", novo_valor: 8500 }),
      evolucao({ id: "e2", data_vigencia: "2026-10-01", novo_valor: 9000 }),
    ];
    expect(valorEfetivoRubrica(8000, evolucoes, "salario_ctps", "2026-11-04")).toBe(9000);
  });

  it("ignora evolução de outra rubrica", () => {
    const evolucoes = [evolucao({ data_vigencia: "2026-10-01", novo_valor: 500, rubrica: "bonificacao" })];
    expect(valorEfetivoRubrica(8000, evolucoes, "salario_ctps", "2026-11-04")).toBe(8000);
  });
});

describe("evolucoesProximas", () => {
  it("só inclui evoluções futuras, ordenadas da mais próxima pra mais distante", () => {
    const evolucoes = [
      evolucao({ id: "longe", data_vigencia: "2027-01-01", novo_valor: 11000 }),
      evolucao({ id: "passada", data_vigencia: "2026-10-01", novo_valor: 9000 }),
      evolucao({ id: "perto", data_vigencia: "2026-11-16", novo_valor: 10000 }),
    ];
    const resultado = evolucoesProximas(evolucoes, "2026-11-04");
    expect(resultado.map((r) => r.novoValor)).toEqual([10000, 11000]);
    expect(resultado[0].diasRestantes).toBe(12);
    expect(resultado[0].rubricaLabel).toBe("Salário CTPS");
  });

  it("vazio quando não há nenhuma evolução futura", () => {
    expect(evolucoesProximas([evolucao({ data_vigencia: "2026-10-01" })], "2026-11-04")).toEqual([]);
  });
});
