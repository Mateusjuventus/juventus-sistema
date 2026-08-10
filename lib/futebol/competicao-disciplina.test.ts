import { describe, expect, it } from "vitest";
import {
  calcularDisciplina,
  condicaoDoAtleta,
  suspensoesParaJogo,
  type CartaoEvento,
  type JogoDisciplina,
  type RegrasDisciplina,
} from "./competicao-disciplina";

const REGRAS: RegrasDisciplina = {
  amarelosParaSuspensao: 3,
  jogosSuspensaoAmarelos: 1,
  jogosSuspensaoVermelho: 1,
};

const JOGOS: JogoDisciplina[] = [
  { jogoId: "j1", data: "2026-07-26", confronto: "Juventus x Osasco" },
  { jogoId: "j2", data: "2026-08-02", confronto: "Primavera x Juventus" },
  { jogoId: "j3", data: "2026-08-09", confronto: "Juventus x Paulista" },
  { jogoId: "j4", data: "2026-08-22", confronto: "Juventus x Primavera" },
  { jogoId: "j5", data: "2026-08-29", confronto: "Osasco x Juventus" },
];

function amarelo(jogoId: string, atletaId: string): CartaoEvento {
  return { jogoId, atletaId, tipo: "cartao_amarelo" };
}

function vermelho(jogoId: string, atletaId: string): CartaoEvento {
  return { jogoId, atletaId, tipo: "cartao_vermelho" };
}

describe("calcularDisciplina", () => {
  it("3º amarelo gera suspensão automática de 1 jogo, cumprida no próximo jogo vinculado", () => {
    const { cartoes, suspensoes } = calcularDisciplina(
      REGRAS,
      JOGOS,
      [amarelo("j1", "joao"), amarelo("j2", "joao"), amarelo("j3", "joao")],
      [],
      "2026-08-10",
    );

    expect(cartoes).toHaveLength(1);
    expect(cartoes[0]).toMatchObject({ atletaId: "joao", amarelos: 3, vermelhos: 0, amarelosAtivos: 0, pendurado: false });

    expect(suspensoes).toHaveLength(1);
    expect(suspensoes[0]).toMatchObject({
      atletaId: "joao",
      tipo: "automatica",
      motivo: "3º cartão amarelo",
      jogoOrigemId: "j3",
      jogosCumprir: ["j4"],
      jogosCumpridos: 0,
      jogosRestantes: 1,
      proximoJogoCumprirId: "j4",
      status: "ativa",
    });
  });

  it("com 2 amarelos o atleta fica pendurado, sem suspensão", () => {
    const { cartoes, suspensoes } = calcularDisciplina(
      REGRAS,
      JOGOS,
      [amarelo("j1", "pedro"), amarelo("j3", "pedro")],
      [],
      "2026-08-10",
    );
    expect(cartoes[0]).toMatchObject({ amarelosAtivos: 2, pendurado: true });
    expect(suspensoes).toHaveLength(0);
  });

  it("vermelho direto suspende sem zerar os amarelos acumulados", () => {
    const { cartoes, suspensoes } = calcularDisciplina(
      REGRAS,
      JOGOS,
      [amarelo("j1", "lucas"), vermelho("j2", "lucas")],
      [],
      "2026-08-10",
    );
    expect(cartoes[0]).toMatchObject({ amarelos: 1, vermelhos: 1, amarelosAtivos: 1, pendurado: false });
    expect(suspensoes).toHaveLength(1);
    expect(suspensoes[0]).toMatchObject({ motivo: "Cartão vermelho direto", jogosCumprir: ["j3"] });
  });

  it("2 amarelos no mesmo jogo viram expulsão e não acumulam pro ciclo", () => {
    const { cartoes, suspensoes } = calcularDisciplina(
      REGRAS,
      JOGOS,
      [amarelo("j2", "caio"), amarelo("j2", "caio")],
      [],
      "2026-08-10",
    );
    expect(cartoes[0]).toMatchObject({ amarelos: 2, amarelosAtivos: 0, pendurado: false });
    expect(suspensoes).toHaveLength(1);
    expect(suspensoes[0]).toMatchObject({ motivo: "Expulsão por 2 cartões amarelos", jogosCumprir: ["j3"] });
  });

  it("suspensões do mesmo atleta acumulam em sequência (vermelho + 3º amarelo = 2 jogos fora)", () => {
    const { suspensoes } = calcularDisciplina(
      REGRAS,
      JOGOS,
      [amarelo("j1", "joao"), amarelo("j2", "joao"), amarelo("j3", "joao"), vermelho("j3", "joao")],
      [],
      "2026-08-10",
    );
    expect(suspensoes).toHaveLength(2);
    const jogosTomados = suspensoes.flatMap((s) => s.jogosCumprir).sort();
    expect(jogosTomados).toEqual(["j4", "j5"]);
  });

  it("marca como cumprida quando os jogos do cumprimento já passaram", () => {
    const { suspensoes } = calcularDisciplina(
      REGRAS,
      JOGOS,
      [amarelo("j1", "joao"), amarelo("j1", "x-outro"), amarelo("j2", "joao"), amarelo("j3", "joao")],
      [],
      "2026-08-25", // j4 (22/08) já passou
    );
    const doJoao = suspensoes.find((s) => s.atletaId === "joao");
    expect(doJoao).toMatchObject({ jogosCumpridos: 1, jogosRestantes: 0, status: "cumprida" });
  });

  it("suspensão manual cumpre a partir da data da decisão e se mistura às automáticas", () => {
    const { suspensoes } = calcularDisciplina(
      REGRAS,
      JOGOS,
      [],
      [
        {
          id: "m1",
          atletaId: "rafael",
          origem: "decisao_disciplinar",
          motivo: "Decisão do TJD",
          jogosSuspensao: 2,
          dataDecisao: "2026-08-05",
        },
      ],
      "2026-08-10",
    );
    expect(suspensoes).toHaveLength(1);
    expect(suspensoes[0]).toMatchObject({
      tipo: "manual",
      manualId: "m1",
      jogosCumprir: ["j3", "j4"],
      jogosCumpridos: 1,
      jogosRestantes: 1,
      status: "ativa",
    });
  });

  it("eventos de jogos não vinculados à competição não contam", () => {
    const { cartoes } = calcularDisciplina(REGRAS, JOGOS, [amarelo("jogo-de-outra-competicao", "joao")], [], "2026-08-10");
    expect(cartoes).toHaveLength(0);
  });
});

describe("suspensoesParaJogo / condicaoDoAtleta", () => {
  const disciplina = calcularDisciplina(
    REGRAS,
    JOGOS,
    [
      amarelo("j1", "joao"),
      amarelo("j2", "joao"),
      amarelo("j3", "joao"),
      amarelo("j1", "pedro"),
      amarelo("j3", "pedro"),
    ],
    [],
    "2026-08-10",
  );

  it("acha quem cumpre suspensão num jogo específico", () => {
    expect(suspensoesParaJogo(disciplina.suspensoes, "j4").map((s) => s.atletaId)).toEqual(["joao"]);
    expect(suspensoesParaJogo(disciplina.suspensoes, "j5")).toHaveLength(0);
  });

  it("classifica suspenso / pendurado / apto / irregular", () => {
    expect(condicaoDoAtleta("joao", "j4", true, disciplina).status).toBe("suspenso");
    expect(condicaoDoAtleta("pedro", "j4", true, disciplina).status).toBe("atencao");
    expect(condicaoDoAtleta("rafael", "j4", true, disciplina).status).toBe("apto");
    expect(condicaoDoAtleta("matheus", "j4", false, disciplina).status).toBe("irregular");
  });
});

describe("zeramento de amarelos por fase (Art. 60 da Copa Paulista)", () => {
  const F1 = "fase-1";
  const F2 = "fase-2";
  const JOGOS_COM_FASES: JogoDisciplina[] = [
    { jogoId: "j1", data: "2026-07-26", confronto: "Juventus x Osasco", faseId: F1 },
    { jogoId: "j2", data: "2026-08-02", confronto: "Primavera x Juventus", faseId: F1 },
    { jogoId: "j3", data: "2026-08-09", confronto: "Juventus x Paulista", faseId: F1 },
    { jogoId: "j4", data: "2026-08-22", confronto: "Juventus x Primavera", faseId: F2 },
    { jogoId: "j5", data: "2026-08-29", confronto: "Osasco x Juventus", faseId: F2 },
  ];
  const ZERA_F1 = new Set([F1]);

  it("amarelos da fase encerrada não somam com os da fase seguinte", () => {
    const { cartoes, suspensoes } = calcularDisciplina(
      REGRAS,
      JOGOS_COM_FASES,
      [amarelo("j1", "joao"), amarelo("j2", "joao"), amarelo("j4", "joao")],
      [],
      "2026-08-25",
      ZERA_F1,
    );
    // 2 na Primeira Fase (zerados no fim dela) + 1 na fase seguinte: nenhuma suspensão.
    expect(suspensoes).toHaveLength(0);
    expect(cartoes[0]).toMatchObject({ amarelos: 3, amarelosAtivos: 1, pendurado: false });
  });

  it("3º amarelo no último jogo da fase gera suspensão que sobrevive ao zeramento", () => {
    const { suspensoes } = calcularDisciplina(
      REGRAS,
      JOGOS_COM_FASES,
      [amarelo("j1", "joao"), amarelo("j2", "joao"), amarelo("j3", "joao")],
      [],
      "2026-08-10",
      ZERA_F1,
    );
    // "desde que não seja o terceiro da série": a suspensão fica e cumpre no 1º jogo da fase 2.
    expect(suspensoes).toHaveLength(1);
    expect(suspensoes[0]).toMatchObject({ motivo: "3º cartão amarelo", jogosCumprir: ["j4"], status: "ativa" });
  });

  it("pendurado da fase anterior deixa de ser pendurado quando a fase seguinte começa", () => {
    const { cartoes } = calcularDisciplina(
      REGRAS,
      JOGOS_COM_FASES,
      [amarelo("j1", "pedro"), amarelo("j3", "pedro")],
      [],
      "2026-08-25",
      ZERA_F1,
    );
    expect(cartoes[0]).toMatchObject({ amarelos: 2, amarelosAtivos: 0, pendurado: false });
  });

  it("sem a flag da fase, os amarelos continuam acumulando entre fases", () => {
    const { suspensoes } = calcularDisciplina(
      REGRAS,
      JOGOS_COM_FASES,
      [amarelo("j1", "joao"), amarelo("j2", "joao"), amarelo("j4", "joao")],
      [],
      "2026-08-25",
    );
    expect(suspensoes).toHaveLength(1);
  });
});

describe("Art. 60 §1º — combinações de amarelo e vermelho na mesma partida", () => {
  it("(a) amarelo seguido de vermelho direto na mesma partida: o amarelo permanece na série", () => {
    const { cartoes } = calcularDisciplina(
      REGRAS,
      JOGOS,
      [amarelo("j2", "lucas"), vermelho("j2", "lucas")],
      [],
      "2026-08-10",
    );
    expect(cartoes[0]).toMatchObject({ amarelosAtivos: 1 });
  });

  it("(b) 3º amarelo + vermelho direto na mesma partida: 2 impedimentos automáticos", () => {
    const { suspensoes } = calcularDisciplina(
      REGRAS,
      JOGOS,
      [amarelo("j1", "joao"), amarelo("j2", "joao"), amarelo("j3", "joao"), vermelho("j3", "joao")],
      [],
      "2026-08-10",
    );
    expect(suspensoes).toHaveLength(2);
    expect(suspensoes.map((s) => s.motivo).sort()).toEqual(["3º cartão amarelo", "Cartão vermelho direto"]);
  });

  it("(c) 2º amarelo com vermelho consequente: os amarelos não contam pra série", () => {
    const { cartoes, suspensoes } = calcularDisciplina(
      REGRAS,
      JOGOS,
      [amarelo("j2", "caio"), amarelo("j2", "caio")],
      [],
      "2026-08-10",
    );
    expect(cartoes[0]).toMatchObject({ amarelosAtivos: 0 });
    expect(suspensoes).toHaveLength(1);
  });
});
