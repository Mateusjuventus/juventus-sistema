import type { RegraTempoCompeticao } from "@/lib/supabase/types";
import type { SumulaEventoTipoStats } from "./estatisticas-atleta";

/**
 * Avisos (nunca bloqueio) de formato de partida da Súmula do Futebol de Base — ver
 * docs/superpowers/specs/2026-10-21-competicoes-formato-partida-design.md. Só se aplica quando o
 * jogo está vinculado (via `competicao_jogos_base`) a uma competição que preencheu essas regras
 * (Campeonato Paulista Sub-11/12/13/14 - 2026, por enquanto); fora disso a tela simplesmente não
 * chama esta função.
 *
 * Deliberadamente pura (sem Supabase) — função só que recebe os dados já calculados/buscados, pra
 * ficar 100% coberta por teste unitário, igual a `lib/futebol/estatisticas-atleta.ts`. Todo aviso
 * aqui é só pra alertar quem preenche a Súmula; NUNCA deve impedir o salvamento (decisão explícita
 * do Mateus — situações excepcionais como lesão/expulsão fogem da regra, e quem preenche precisa
 * conseguir registrar o que aconteceu de verdade).
 */

export interface RegrasFormatoPartidaBase {
  numeroTempos: 2 | 3;
  elencoMinimoEmCampo: number | null;
  minutosMinimosPorAtleta: number | null;
  regraTempo1: RegraTempoCompeticao;
  regraTempo2: RegraTempoCompeticao;
  /** Null em competições de 2 tempos — nunca avaliada nesse caso. */
  regraTempo3: RegraTempoCompeticao | null;
}

/** Um atleta que aparece na Súmula (inscrito na convocação do jogo), com a minutagem já calculada
 * (ver `calcularMinutosJogados`). */
export interface AtletaNaSumulaBase {
  atletaId: string;
  nome: string;
  minutosJogados: number;
}

export interface EventoParaAvisoBase {
  tipo: SumulaEventoTipoStats;
  tempo: "primeiro" | "segundo" | "terceiro";
}

const REGRA_POR_TEMPO: Record<1 | 2 | 3, keyof Pick<RegrasFormatoPartidaBase, "regraTempo1" | "regraTempo2" | "regraTempo3">> = {
  1: "regraTempo1",
  2: "regraTempo2",
  3: "regraTempo3",
};

const LABEL_TEMPO: Record<"primeiro" | "segundo" | "terceiro", string> = {
  primeiro: "1º tempo",
  segundo: "2º tempo",
  terceiro: "3º tempo",
};

const TEMPO_NUMERO: Record<"primeiro" | "segundo" | "terceiro", 1 | 2 | 3> = {
  primeiro: 1,
  segundo: 2,
  terceiro: 3,
};

/** Regras que NÃO permitem substituição livre no tempo (a Súmula ainda deixa lançar — é só aviso). */
const REGRAS_SEM_SUBSTITUICAO_LIVRE: RegraTempoCompeticao[] = ["somente_titulares", "somente_reservas"];

export function avisosFormatoPartidaBase(
  regras: RegrasFormatoPartidaBase,
  atletasNaSumula: AtletaNaSumulaBase[],
  eventos: EventoParaAvisoBase[],
): string[] {
  const avisos: string[] = [];

  if (regras.elencoMinimoEmCampo != null && atletasNaSumula.length < regras.elencoMinimoEmCampo) {
    avisos.push(
      `Elenco abaixo do mínimo: ${atletasNaSumula.length} atleta(s) na súmula, mínimo exigido é ${regras.elencoMinimoEmCampo}.`,
    );
  }

  if (regras.minutosMinimosPorAtleta != null) {
    for (const atleta of atletasNaSumula) {
      if (atleta.minutosJogados < regras.minutosMinimosPorAtleta) {
        avisos.push(
          `${atleta.nome}: jogou ${atleta.minutosJogados}min, abaixo do mínimo de ${regras.minutosMinimosPorAtleta}min por atleta.`,
        );
      }
    }
  }

  for (const evento of eventos) {
    if (evento.tipo !== "substituicao") continue;
    const numeroTempo = TEMPO_NUMERO[evento.tempo];
    if (numeroTempo === 3 && regras.numeroTempos !== 3) continue;
    const regraDoTempo = regras[REGRA_POR_TEMPO[numeroTempo]];
    if (regraDoTempo && REGRAS_SEM_SUBSTITUICAO_LIVRE.includes(regraDoTempo)) {
      avisos.push(
        `Substituição lançada no ${LABEL_TEMPO[evento.tempo]}, que não permite substituição livre — confira se foi por motivo médico.`,
      );
    }
  }

  return avisos;
}
