import { describe, expect, it } from "vitest";
import {
  calcularEstatisticasAtleta,
  calcularMinutoAbsoluto,
  calcularMinutosJogados,
  duracaoReferenciaEstatisticas,
  type EventoParaEstatistica,
  type JogoParaEstatistica,
} from "./estatisticas-atleta";

const ATLETA = "atleta-1";
const OUTRO_ATLETA = "atleta-2";

function evento(overrides: Partial<EventoParaEstatistica>): EventoParaEstatistica {
  return {
    tipo: "gol",
    tempo: "primeiro",
    minuto: 0,
    atletaId: null,
    atletaEntrouId: null,
    atletaAssistenciaId: null,
    ordem: 0,
    ...overrides,
  };
}

describe("calcularMinutosJogados", () => {
  it("não convocado: 0 minutos, mesmo com duração de súmula salva", () => {
    expect(calcularMinutosJogados(ATLETA, "nao_convocado", 45, 45, [])).toBe(0);
  });

  it("jogo sem súmula salva (duração null): 0 minutos, mesmo sendo titular", () => {
    expect(calcularMinutosJogados(ATLETA, "titular", null, null, [])).toBe(0);
  });

  it("titular sem nenhum evento de saída: joga o tempo cheio (com acréscimos)", () => {
    expect(calcularMinutosJogados(ATLETA, "titular", 45, 47, [])).toBe(92);
  });

  it("titular substituído no 2º tempo: conta até o minuto absoluto da substituição", () => {
    const eventos = [
      evento({ tipo: "substituicao", tempo: "segundo", minuto: 30, atletaId: ATLETA, atletaEntrouId: OUTRO_ATLETA }),
    ];
    // 45 (1º tempo) + 30 = 75
    expect(calcularMinutosJogados(ATLETA, "titular", 45, 45, eventos)).toBe(75);
  });

  it("titular expulso no 1º tempo: conta até o minuto do cartão vermelho", () => {
    const eventos = [evento({ tipo: "cartao_vermelho", tempo: "primeiro", minuto: 10, atletaId: ATLETA })];
    expect(calcularMinutosJogados(ATLETA, "titular", 45, 45, eventos)).toBe(10);
  });

  it("titular expulso e substituído (mesmo jogador com dois eventos): usa o que ocorre primeiro", () => {
    const eventos = [
      evento({ tipo: "cartao_vermelho", tempo: "primeiro", minuto: 20, atletaId: ATLETA }),
      evento({ tipo: "substituicao", tempo: "segundo", minuto: 5, atletaId: ATLETA, atletaEntrouId: OUTRO_ATLETA }),
    ];
    expect(calcularMinutosJogados(ATLETA, "titular", 45, 45, eventos)).toBe(20);
  });

  it("reserva que não entrou: 0 minutos (ficou no banco)", () => {
    const eventos = [
      evento({ tipo: "substituicao", tempo: "segundo", minuto: 10, atletaId: OUTRO_ATLETA, atletaEntrouId: "atleta-3" }),
    ];
    expect(calcularMinutosJogados(ATLETA, "reserva", 45, 45, eventos)).toBe(0);
  });

  it("reserva que entrou e jogou até o fim: conta do minuto de entrada até o fim do jogo", () => {
    const eventos = [
      evento({ tipo: "substituicao", tempo: "segundo", minuto: 20, atletaId: OUTRO_ATLETA, atletaEntrouId: ATLETA }),
    ];
    // entra em 45+20=65, fim do jogo 45+45=90 -> 25 minutos
    expect(calcularMinutosJogados(ATLETA, "reserva", 45, 45, eventos)).toBe(25);
  });

  it("reserva que entrou e depois foi expulso: conta do minuto de entrada até o cartão vermelho", () => {
    const eventos = [
      evento({ tipo: "substituicao", tempo: "segundo", minuto: 10, atletaId: OUTRO_ATLETA, atletaEntrouId: ATLETA }),
      evento({ tipo: "cartao_vermelho", tempo: "segundo", minuto: 30, atletaId: ATLETA }),
    ];
    // entra em 45+10=55, sai em 45+30=75 -> 20 minutos
    expect(calcularMinutosJogados(ATLETA, "reserva", 45, 45, eventos)).toBe(20);
  });

  it("eventos de outros atletas não afetam a minutagem deste atleta", () => {
    const eventos = [
      evento({ tipo: "cartao_amarelo", tempo: "primeiro", minuto: 15, atletaId: OUTRO_ATLETA }),
      evento({ tipo: "gol", tempo: "segundo", minuto: 5, atletaId: OUTRO_ATLETA, atletaAssistenciaId: ATLETA }),
    ];
    expect(calcularMinutosJogados(ATLETA, "titular", 45, 45, eventos)).toBe(90);
  });

  it("acréscimo lançado soma no fim de jogo: titular que joga o jogo inteiro conta o acréscimo (ver 0147_sumula_acrescimo.sql)", () => {
    // 45 (1T) + 2 (acréscimo 1T) + 45 (2T) + 3 (acréscimo 2T) = 95
    expect(calcularMinutosJogados(ATLETA, "titular", 45, 45, [], null, 2, 3)).toBe(95);
  });

  it("acréscimo desloca o relógio do 2º tempo pra substituições lançadas nele", () => {
    const eventos = [
      evento({ tipo: "substituicao", tempo: "segundo", minuto: 10, atletaId: ATLETA, atletaEntrouId: OUTRO_ATLETA }),
    ];
    // 1T (45) + acréscimo do 1T (2) + 10 do 2T = 57
    expect(calcularMinutosJogados(ATLETA, "titular", 45, 45, eventos, null, 2)).toBe(57);
  });
});

describe("calcularMinutoAbsoluto com acréscimo", () => {
  it("sem acréscimo informado, se comporta exatamente como antes", () => {
    expect(calcularMinutoAbsoluto("segundo", 10, 45)).toBe(55);
  });

  it("acréscimo do 1º tempo desloca o relógio do 2º tempo", () => {
    expect(calcularMinutoAbsoluto("segundo", 10, 45, undefined, 3)).toBe(58);
  });
});

describe("calcularEstatisticasAtleta", () => {
  it("agrega participação, contadores e minutagem ao longo de vários jogos", () => {
    const jogos: JogoParaEstatistica[] = [
      {
        // Titular, jogo inteiro, marcou 1 gol e deu 1 assistência (em lances diferentes).
        jogoId: "jogo-1",
        statusConvocacao: "titular",
        duracaoPrimeiroTempo: 45,
        duracaoSegundoTempo: 45,
        eventos: [
          evento({ tipo: "gol", tempo: "primeiro", minuto: 10, atletaId: ATLETA }),
          evento({
            tipo: "gol",
            tempo: "segundo",
            minuto: 20,
            atletaId: OUTRO_ATLETA,
            atletaAssistenciaId: ATLETA,
          }),
          evento({ tipo: "cartao_amarelo", tempo: "segundo", minuto: 40, atletaId: ATLETA }),
        ],
      },
      {
        // Reserva que não entrou.
        jogoId: "jogo-2",
        statusConvocacao: "reserva",
        duracaoPrimeiroTempo: 45,
        duracaoSegundoTempo: 45,
        eventos: [],
      },
      {
        // Reserva que entrou aos 70min absolutos e jogou até o fim (20 minutos, não passa de 60).
        jogoId: "jogo-3",
        statusConvocacao: "reserva",
        duracaoPrimeiroTempo: 45,
        duracaoSegundoTempo: 45,
        eventos: [
          evento({ tipo: "substituicao", tempo: "segundo", minuto: 25, atletaId: OUTRO_ATLETA, atletaEntrouId: ATLETA }),
        ],
      },
      {
        // Não convocado.
        jogoId: "jogo-4",
        statusConvocacao: "nao_convocado",
        duracaoPrimeiroTempo: 45,
        duracaoSegundoTempo: 45,
        eventos: [],
      },
      {
        // Titular, jogo sem súmula salva ainda (só convocação) — conta na participação, não na minutagem.
        jogoId: "jogo-5",
        statusConvocacao: "titular",
        duracaoPrimeiroTempo: null,
        duracaoSegundoTempo: null,
        eventos: [],
      },
    ];

    const stats = calcularEstatisticasAtleta(ATLETA, jogos);

    expect(stats.titular).toBe(2);
    expect(stats.banco).toBe(2);
    expect(stats.naoConvocado).toBe(1);
    expect(stats.gols).toBe(1);
    expect(stats.assistencias).toBe(1);
    expect(stats.cartoesAmarelos).toBe(1);
    expect(stats.cartoesVermelhos).toBe(0);
    // jogo-1: 90min, jogo-2: 0min, jogo-3: 20min, jogo-4: 0min, jogo-5: 0min (sem súmula)
    expect(stats.minutosTotais).toBe(110);
    expect(stats.jogosMaisUmTempo).toBe(1); // só o jogo-1 (90min > 45min de um tempo)
    // jogo-1 tem EXATAMENTE 90min (45+45, sem acréscimo lançado) — antes exigia `>90` e nunca
    // contava um jogo completo sem acréscimo (bug real corrigido em 0147_sumula_acrescimo.sql);
    // agora usa `>=`, então conta.
    expect(stats.jogosJogoCompleto).toBe(1);
  });

  it("acréscimo lançado soma na minutagem real e o limiar de jogo completo usa a duração regulamentar (sem acréscimo)", () => {
    const jogos: JogoParaEstatistica[] = [
      {
        // Titular, jogo inteiro, COM 3min de acréscimo no 2º tempo — minutagem real 93, mas o
        // limiar de "jogo completo" compara com a duração regulamentar (90), não com 93.
        jogoId: "jogo-1",
        statusConvocacao: "titular",
        duracaoPrimeiroTempo: 45,
        duracaoSegundoTempo: 45,
        acrescimoSegundoTempo: 3,
        eventos: [],
      },
    ];
    const stats = calcularEstatisticasAtleta(ATLETA, jogos);
    expect(stats.minutosTotais).toBe(93);
    expect(stats.jogosJogoCompleto).toBe(1);
    expect(stats.jogosMaisUmTempo).toBe(1);
  });

  it("categoria com duração diferente do padrão (ex: Sub-17, 40min por tempo) usa a duração daquele jogo, não 45/90 fixos", () => {
    const jogos: JogoParaEstatistica[] = [
      {
        // Substituído aos 35' absolutos do 1º tempo — não chega a jogar 1 tempo inteiro de 40min.
        jogoId: "jogo-1",
        statusConvocacao: "titular",
        duracaoPrimeiroTempo: 40,
        duracaoSegundoTempo: 40,
        eventos: [
          evento({ tipo: "substituicao", tempo: "primeiro", minuto: 35, atletaId: ATLETA, atletaEntrouId: OUTRO_ATLETA }),
        ],
      },
    ];
    const stats = calcularEstatisticasAtleta(ATLETA, jogos);
    expect(stats.minutosTotais).toBe(35);
    expect(stats.jogosMaisUmTempo).toBe(0); // 35 < 40 (duração do tempo nesta categoria)
    expect(stats.jogosJogoCompleto).toBe(0);
  });
});

describe("duracaoReferenciaEstatisticas", () => {
  it("sem nenhum jogo com súmula salva, usa o padrão histórico 45/90", () => {
    const jogos: JogoParaEstatistica[] = [
      { jogoId: "jogo-1", statusConvocacao: "titular", duracaoPrimeiroTempo: null, duracaoSegundoTempo: null, eventos: [] },
    ];
    expect(duracaoReferenciaEstatisticas(jogos)).toEqual({ primeiroTempo: 45, total: 90 });
  });

  it("usa a duração regulamentar do primeiro jogo com súmula salva (ex: Sub-17, 40min por tempo)", () => {
    const jogos: JogoParaEstatistica[] = [
      { jogoId: "jogo-1", statusConvocacao: "titular", duracaoPrimeiroTempo: 40, duracaoSegundoTempo: 40, eventos: [] },
    ];
    expect(duracaoReferenciaEstatisticas(jogos)).toEqual({ primeiroTempo: 40, total: 80 });
  });
});
