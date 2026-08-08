import { describe, expect, it } from "vitest";
import type { AtletaRow, EventoCalendarioRow, JogoRow } from "@/lib/supabase/types";
import {
  adicionarDias,
  agruparPorDia,
  atletasContratoVencendo,
  diasEntre,
  gradeDoMes,
  itensMural,
  limitesDoMes,
  montarItensCalendario,
  tituloJogo,
} from "./calendario";

function jogo(overrides: Partial<JogoRow>): JogoRow {
  return {
    id: "jogo-1",
    competicao: "Copa Paulista",
    rodada_fase: null,
    adversario_nome: "Adversário",
    adversario_logo_path: null,
    data_jogo: "2026-08-10",
    horario: "16:00:00",
    local_estadio: null,
    endereco: null,
    mandante: true,
    gols_pro: null,
    gols_contra: null,
    concentracao_data: null,
    concentracao_regras: "",
    dia_jogo_liberacao: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function atleta(overrides: Partial<AtletaRow>): AtletaRow {
  return {
    id: "atleta-1",
    nome_completo: "Fulano de Tal",
    rg: "0",
    cpf: "0",
    data_nascimento: "2000-01-01",
    posicao: "Atacante",
    categoria_posicao: null,
    numero_camisa: null,
    numero_cbf: null,
    numero_fpf: null,
    pe_dominante: null,
    telefone: null,
    cidade_natal: null,
    uf_natal: null,
    endereco_atual: null,
    data_inicio_clube: null,
    empresario_nome: null,
    foto_path: null,
    status: "liberado",
    data_fim_contrato: null,
    apelido: null,
    tipo_contrato: null,
    possui_contrato_formacao: false,
    fpf_id_atleta: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function evento(overrides: Partial<EventoCalendarioRow>): EventoCalendarioRow {
  return {
    id: "evento-1",
    categoria: "treino",
    titulo: "Treino tático",
    data: "2026-08-10",
    horario: null,
    observacao: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("tituloJogo", () => {
  it("Juventus primeiro quando é mandante", () => {
    expect(tituloJogo(jogo({ mandante: true, adversario_nome: "Rio Branco" }))).toBe("Juventus x Rio Branco");
  });

  it("adversário primeiro quando o Juventus joga fora", () => {
    expect(tituloJogo(jogo({ mandante: false, adversario_nome: "Rio Branco" }))).toBe("Rio Branco x Juventus");
  });
});

describe("montarItensCalendario", () => {
  it("ordena por data e depois por horário", () => {
    const itens = montarItensCalendario(
      [jogo({ id: "j1", data_jogo: "2026-08-12", horario: "10:00:00" })],
      [
        evento({ id: "e1", data: "2026-08-10", horario: "15:00:00" }),
        evento({ id: "e2", data: "2026-08-10", horario: "09:00:00" }),
      ],
    );
    expect(itens.map((i) => (i.tipo === "evento" ? i.evento.id : i.jogo.id))).toEqual(["e2", "e1", "j1"]);
  });

  it("item sem horário fica depois dos com horário no mesmo dia", () => {
    const itens = montarItensCalendario(
      [],
      [evento({ id: "sem-hora", data: "2026-08-10", horario: null }), evento({ id: "com-hora", data: "2026-08-10", horario: "08:00:00" })],
    );
    expect(itens.map((i) => (i.tipo === "evento" ? i.evento.id : ""))).toEqual(["com-hora", "sem-hora"]);
  });
});

describe("agruparPorDia", () => {
  it("dois itens no mesmo dia entram os dois, sem sobrescrever", () => {
    const itens = montarItensCalendario(
      [jogo({ id: "j1", data_jogo: "2026-08-10" })],
      [evento({ id: "e1", data: "2026-08-10" })],
    );
    const mapa = agruparPorDia(itens);
    expect(mapa.get("2026-08-10")).toHaveLength(2);
  });
});

describe("diasEntre", () => {
  it("mesma data: 0", () => {
    expect(diasEntre("2026-08-10", "2026-08-10")).toBe(0);
  });

  it("data futura: positivo", () => {
    expect(diasEntre("2026-08-10", "2026-08-15")).toBe(5);
  });

  it("data passada: negativo", () => {
    expect(diasEntre("2026-08-10", "2026-08-05")).toBe(-5);
  });

  it("atravessa virada de mês/ano sem erro de fuso", () => {
    expect(diasEntre("2025-12-30", "2026-01-02")).toBe(3);
  });
});

describe("itensMural", () => {
  const itens = montarItensCalendario(
    [
      jogo({ id: "hoje", data_jogo: "2026-08-10" }),
      jogo({ id: "em-2-dias", data_jogo: "2026-08-12" }),
      jogo({ id: "em-5-dias", data_jogo: "2026-08-15" }),
      jogo({ id: "em-10-dias", data_jogo: "2026-08-20" }),
      jogo({ id: "em-11-dias", data_jogo: "2026-08-21" }),
      jogo({ id: "ontem", data_jogo: "2026-08-09" }),
    ],
    [],
  );

  it("inclui de hoje até 10 dias, exclui 11 dias e datas passadas", () => {
    const ids = itensMural(itens, "2026-08-10").map((m) => (m.item.tipo === "jogo" ? m.item.jogo.id : ""));
    expect(ids).toEqual(["hoje", "em-2-dias", "em-5-dias", "em-10-dias"]);
  });

  it("badge: vermelho até 2 dias, amarelo até 5, verde até 10", () => {
    const mural = itensMural(itens, "2026-08-10");
    const urgenciaPorId = Object.fromEntries(
      mural.map((m) => [m.item.tipo === "jogo" ? m.item.jogo.id : "", m.urgencia]),
    );
    expect(urgenciaPorId["hoje"]).toBe("urgente");
    expect(urgenciaPorId["em-2-dias"]).toBe("urgente");
    expect(urgenciaPorId["em-5-dias"]).toBe("atencao");
    expect(urgenciaPorId["em-10-dias"]).toBe("ok");
  });

  it("evento e jogo no mesmo dia entram juntos, ordenados por proximidade", () => {
    const misto = montarItensCalendario(
      [jogo({ id: "jogo-perto", data_jogo: "2026-08-15" })],
      [evento({ id: "evento-perto", data: "2026-08-13" })],
    );
    const mural = itensMural(misto, "2026-08-10");
    expect(mural.map((m) => m.diasRestantes)).toEqual([3, 5]);
  });
});

describe("atletasContratoVencendo", () => {
  it("89 dias aparece, 91 dias não aparece", () => {
    const atletas = [
      atleta({ id: "89-dias", data_fim_contrato: "2026-11-07" }), // 89 dias depois de 2026-08-10
      atleta({ id: "91-dias", data_fim_contrato: "2026-11-09" }), // 91 dias depois
    ];
    const resultado = atletasContratoVencendo(atletas, "2026-08-10");
    expect(resultado.map((r) => r.atleta.id)).toEqual(["89-dias"]);
  });

  it("badge vermelho quando faltam <=30 dias, amarelo até 90", () => {
    const atletas = [
      atleta({ id: "30-dias", data_fim_contrato: "2026-09-09" }),
      atleta({ id: "31-dias", data_fim_contrato: "2026-09-10" }),
    ];
    const resultado = atletasContratoVencendo(atletas, "2026-08-10");
    const urgenciaPorId = Object.fromEntries(resultado.map((r) => [r.atleta.id, r.urgencia]));
    expect(urgenciaPorId["30-dias"]).toBe("urgente");
    expect(urgenciaPorId["31-dias"]).toBe("atencao");
  });

  it("contrato já vencido (data no passado) não aparece", () => {
    const atletas = [atleta({ id: "vencido", data_fim_contrato: "2026-08-09" })];
    expect(atletasContratoVencendo(atletas, "2026-08-10")).toHaveLength(0);
  });

  it("sem data_fim_contrato não aparece", () => {
    const atletas = [atleta({ id: "sem-data", data_fim_contrato: null })];
    expect(atletasContratoVencendo(atletas, "2026-08-10")).toHaveLength(0);
  });
});

describe("adicionarDias", () => {
  it("soma dias dentro do mesmo mês", () => {
    expect(adicionarDias("2026-08-10", 5)).toBe("2026-08-15");
  });

  it("atravessa virada de mês", () => {
    expect(adicionarDias("2026-08-28", 10)).toBe("2026-09-07");
  });

  it("dias negativos sobem no tempo", () => {
    expect(adicionarDias("2026-08-10", -5)).toBe("2026-08-05");
  });
});

describe("limitesDoMes", () => {
  it("agosto de 2026", () => {
    expect(limitesDoMes(2026, 8)).toEqual({ inicio: "2026-08-01", fim: "2026-08-31" });
  });

  it("fevereiro bissexto (2024)", () => {
    expect(limitesDoMes(2024, 2)).toEqual({ inicio: "2024-02-01", fim: "2024-02-29" });
  });
});

describe("gradeDoMes", () => {
  it("sempre um múltiplo de 7 (semanas completas)", () => {
    expect(gradeDoMes(2026, 8).length % 7).toBe(0);
    expect(gradeDoMes(2026, 2).length % 7).toBe(0);
    expect(gradeDoMes(2024, 2).length % 7).toBe(0); // fevereiro bissexto
  });

  it("agosto de 2026 tem 31 dias marcados noMes:true", () => {
    const noMes = gradeDoMes(2026, 8).filter((d) => d.noMes);
    expect(noMes).toHaveLength(31);
    expect(noMes[0].data).toBe("2026-08-01");
    expect(noMes[30].data).toBe("2026-08-31");
  });

  it("fevereiro bissexto (2024) tem 29 dias marcados noMes:true", () => {
    expect(gradeDoMes(2024, 2).filter((d) => d.noMes)).toHaveLength(29);
  });

  it("dias de preenchimento do mês seguinte continuam a sequência sem repetir", () => {
    const grade = gradeDoMes(2026, 8);
    const datas = grade.map((d) => d.data);
    expect(new Set(datas).size).toBe(datas.length);
  });
});
