import { describe, expect, it } from "vitest";
import type { AtletaContratoEvolucaoSalarialRow } from "@/lib/supabase/types";
import {
  contratoTemRemuneracaoFormal,
  contratoVazio,
  diasRestantesContrato,
  direitosEconomicos,
  evolucoesProximas,
  statusContrato,
  valorEfetivoRubrica,
} from "./contrato";

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

describe("contratoVazio", () => {
  const base = {
    vigencia_inicio: null,
    vigencia_fim: null,
    salario_ctps: 0,
    direito_imagem: 0,
    bonificacao: 0,
    auxilio_moradia: 0,
    outros: 0,
  };

  it("vazio quando não tem nenhuma data nem nenhum valor de remuneração", () => {
    expect(contratoVazio(base)).toBe(true);
  });

  it("não é vazio quando tem uma data de vigência", () => {
    expect(contratoVazio({ ...base, vigencia_inicio: "2026-01-01" })).toBe(false);
  });

  it("não é vazio quando tem algum valor de remuneração lançado", () => {
    expect(contratoVazio({ ...base, salario_ctps: 5000 })).toBe(false);
  });
});

describe("direitosEconomicos", () => {
  it("vazio quando nenhuma parte tem percentual", () => {
    expect(
      direitosEconomicos({
        direito_economico_juventus_pct: null,
        direito_economico_atleta_pct: null,
        direito_economico_terceiro_nome: null,
        direito_economico_terceiro_pct: null,
      }),
    ).toEqual([]);
  });

  it("inclui só as partes com percentual lançado", () => {
    expect(
      direitosEconomicos({
        direito_economico_juventus_pct: 20,
        direito_economico_atleta_pct: null,
        direito_economico_terceiro_nome: "Botafogo-SP",
        direito_economico_terceiro_pct: 30,
      }),
    ).toEqual([
      { nome: "Juventus", pct: 20 },
      { nome: "Botafogo-SP", pct: 30 },
    ]);
  });

  it("ignora o terceiro clube quando o nome está vazio (dado inconsistente)", () => {
    expect(
      direitosEconomicos({
        direito_economico_juventus_pct: null,
        direito_economico_atleta_pct: null,
        direito_economico_terceiro_nome: null,
        direito_economico_terceiro_pct: 30,
      }),
    ).toEqual([]);
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

describe("contratoTemRemuneracaoFormal", () => {
  it("true pra Definitivo e Empréstimo", () => {
    expect(contratoTemRemuneracaoFormal("definitivo")).toBe(true);
    expect(contratoTemRemuneracaoFormal("emprestimo")).toBe(true);
  });

  it("false pra Amador, Iniciação e Formação", () => {
    expect(contratoTemRemuneracaoFormal("amador")).toBe(false);
    expect(contratoTemRemuneracaoFormal("iniciacao")).toBe(false);
    expect(contratoTemRemuneracaoFormal("formacao")).toBe(false);
  });
});
