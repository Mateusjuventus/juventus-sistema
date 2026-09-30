import { describe, expect, it } from "vitest";
import { diasAfastados, fisioterapiaTipoLabel, montarResumoGeralFisioterapia, statusFisioterapiaAtleta } from "./fisioterapia";

describe("diasAfastados", () => {
  it("conta o mesmo dia como 1 dia afastado", () => {
    expect(diasAfastados("2026-09-01", "2026-09-01", "2026-09-30")).toBe(1);
  });

  it("conta o período fechado, inclusive", () => {
    expect(diasAfastados("2026-09-01", "2026-09-10", "2026-09-30")).toBe(10);
  });

  it("lesão ainda ativa (sem data_fim) usa 'hoje' no lugar do fim", () => {
    expect(diasAfastados("2026-09-25", null, "2026-09-30")).toBe(6);
  });

  it("nunca devolve menos que 1", () => {
    expect(diasAfastados("2026-09-30", "2026-09-30", "2026-09-30")).toBe(1);
  });

  it("sem data de início (histórico importado), devolve null em vez de inventar uma contagem", () => {
    expect(diasAfastados(null, null, "2026-09-30")).toBeNull();
  });
});

describe("fisioterapiaTipoLabel", () => {
  it("traduz as 6 categorias do relatório em papel", () => {
    expect(fisioterapiaTipoLabel("muscular")).toBe("Muscular");
    expect(fisioterapiaTipoLabel("articular")).toBe("Dor articular");
    expect(fisioterapiaTipoLabel("tendinea_fascial")).toBe("Dor tendínea/fascial");
    expect(fisioterapiaTipoLabel("ligamentar")).toBe("Lesão ligamentar");
    expect(fisioterapiaTipoLabel("osseo")).toBe("Ósseo");
    expect(fisioterapiaTipoLabel("trauma")).toBe("Trauma");
  });
});

describe("montarResumoGeralFisioterapia", () => {
  const atletas = [{ id: "a1", nome: "Atleta Um" }];
  const hoje = "2026-09-30";

  it("soma quantidade dos atendimentos em vez de contar linhas — um registro importado com quantidade 57 vale 57", () => {
    const linhas = montarResumoGeralFisioterapia(
      atletas,
      [],
      [],
      [{ atleta_id: "a1", quantidade: 57 }],
      hoje,
    );
    expect(linhas[0].totalAtendimentos).toBe(57);
  });

  it("atendimento normal (quantidade nula) vale 1, soma normalmente com um registro importado", () => {
    const linhas = montarResumoGeralFisioterapia(
      atletas,
      [],
      [],
      [
        { atleta_id: "a1", quantidade: null },
        { atleta_id: "a1", quantidade: 57 },
      ],
      hoje,
    );
    expect(linhas[0].totalAtendimentos).toBe(58);
  });

  it("lesão do histórico importado (sem data_inicio) não entra na soma de dias afastados", () => {
    const linhas = montarResumoGeralFisioterapia(
      atletas,
      [
        { atleta_id: "a1", data_inicio: null, data_fim: null },
        { atleta_id: "a1", data_inicio: "2026-09-20", data_fim: "2026-09-25" },
      ],
      [],
      [],
      hoje,
    );
    expect(linhas[0].totalDiasAfastados).toBe(6);
  });

  it("queixa do histórico importado (sem data) não vira 'última queixa'", () => {
    const linhas = montarResumoGeralFisioterapia(
      atletas,
      [],
      [
        { atleta_id: "a1", data: null },
        { atleta_id: "a1", data: "2026-09-15" },
      ],
      [],
      hoje,
    );
    expect(linhas[0].ultimaQueixaData).toBe("2026-09-15");
  });
});

describe("statusFisioterapiaAtleta", () => {
  it("com lesão ativa, vai pra Depto. Médico", () => {
    expect(statusFisioterapiaAtleta(true)).toBe("departamento_medico");
  });

  it("sem lesão ativa, volta pra Apto", () => {
    expect(statusFisioterapiaAtleta(false)).toBe("liberado");
  });
});
