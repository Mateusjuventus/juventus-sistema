import { describe, expect, it } from "vitest";
import { nomeDiaSemanaCompleto, formatDataCurta, montarPeriodoTexto, montarMicrocicloDias } from "./microciclo-data";
import { corHexAtividade } from "./tipo-atividade";
import type { AtividadeComDetalhes } from "./queries";

describe("nomeDiaSemanaCompleto", () => {
  it("devolve o nome completo em maiúsculas", () => {
    expect(nomeDiaSemanaCompleto("2026-08-24")).toBe("SEGUNDA"); // segunda-feira
    expect(nomeDiaSemanaCompleto("2026-08-30")).toBe("DOMINGO");
  });
});

describe("formatDataCurta", () => {
  it("formata como DD/MM", () => {
    expect(formatDataCurta("2026-08-24")).toBe("24/08");
  });
});

describe("montarPeriodoTexto", () => {
  it("mesmo mês: um mês só no texto", () => {
    expect(montarPeriodoTexto("2026-08-24", "2026-08-30")).toBe("Plano de 24 a 30 de Agosto");
  });

  it("virada de mês: cada ponta com seu mês por extenso", () => {
    expect(montarPeriodoTexto("2026-08-31", "2026-09-06")).toBe("Plano de 31 de Agosto a 6 de Setembro");
  });
});

function atividade(overrides: Partial<AtividadeComDetalhes>): AtividadeComDetalhes {
  return {
    id: "a1",
    categoria: "sub17",
    data: "2026-08-24",
    turno: "manha",
    nome: "Treino Técnico",
    tipo: "treinamento",
    horario_inicio: "09:00:00",
    horario_termino: "11:00:00",
    local: "Sede Social",
    jogo_id: null,
    created_by: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    subatividades: [],
    jogo: null,
    ...overrides,
  };
}

describe("montarMicrocicloDias", () => {
  const dias = ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30"];

  it("um dia sem nenhuma atividade fica marcado como sem atividade (folga)", () => {
    const resultado = montarMicrocicloDias(dias, [], corHexAtividade);
    expect(resultado).toHaveLength(7);
    expect(resultado[0].temAtividade).toBe(false);
    expect(resultado[0].atividadesPorTurno.manha).toEqual([]);
    expect(resultado[0].atividadesPorTurno.tarde).toEqual([]);
    expect(resultado[0].atividadesPorTurno.noite).toEqual([]);
  });

  it("agrupa as atividades do dia dentro do turno certo", () => {
    const atividades = [
      atividade({ id: "a1", data: "2026-08-24", turno: "manha" }),
      atividade({ id: "a2", data: "2026-08-24", turno: "tarde", nome: "Academia", tipo: "academia" }),
    ];
    const resultado = montarMicrocicloDias(dias, atividades, corHexAtividade);
    const segunda = resultado[0];
    expect(segunda.temAtividade).toBe(true);
    expect(segunda.atividadesPorTurno.manha.map((a) => a.id)).toEqual(["a1"]);
    expect(segunda.atividadesPorTurno.tarde.map((a) => a.id)).toEqual(["a2"]);
    expect(segunda.atividadesPorTurno.noite).toEqual([]);
  });

  it("horário vem normalizado (sem os segundos do Postgres) e a cor vem do tipo", () => {
    const atividades = [atividade({ data: "2026-08-24", horario_inicio: "09:00:00", tipo: "refeicao" })];
    const resultado = montarMicrocicloDias(dias, atividades, corHexAtividade);
    const item = resultado[0].atividadesPorTurno.manha[0];
    expect(item.horarioInicio).toBe("09:00");
    expect(item.corBg).toBe(corHexAtividade("refeicao").bg);
  });

  it("atividade de jogo carrega os dados de verdade do jogo (não duplicados)", () => {
    const jogo = {
      id: "j1",
      adversario_nome: "Corinthians",
      adversario_logo_path: null,
      data_jogo: "2026-08-27",
      horario: "15:00:00",
      local_estadio: "Presidente Prudente",
      mandante: false,
      competicao: "Campeonato Estadual",
      rodada_fase: "5ª rodada",
      adversarioLogoUrl: null,
    };
    const atividades = [
      atividade({ data: "2026-08-27", turno: "tarde", tipo: "jogo_oficial", jogo_id: "j1", jogo }),
    ];
    const resultado = montarMicrocicloDias(dias, atividades, corHexAtividade);
    const quinta = resultado.find((d) => d.data === "2026-08-27")!;
    expect(quinta.atividadesPorTurno.tarde[0].jogo).toEqual(jogo);
  });
});
