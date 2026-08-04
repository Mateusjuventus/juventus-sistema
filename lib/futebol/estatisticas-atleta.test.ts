import { describe, expect, it } from "vitest";
import {
  calcularEstatisticasAtleta,
  calcularMinutosJogados,
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
    expect(stats.jogosMais60min).toBe(1); // só o jogo-1 (90min)
    expect(stats.jogosMais90min).toBe(0); // jogo-1 tem exatamente 90min — "mais de 90" exige >90, não ≥90
  });
});
