// Import relativo (não o alias "@/...") — mesmo motivo de `contrato.ts`: o alias não resolve no
// vitest pra um import de valor (em runtime), só pra `import type`.
import type { EstatisticasAtleta } from "./estatisticas-atleta";
import type { MetricaGatilhoContrato } from "../supabase/types";

/**
 * Cálculo de progresso de um Gatilho (bônus por meta de desempenho) do Contrato do Atleta — ver
 * docs/superpowers/specs/2026-11-04-contrato-atleta-gatilhos-design.md. Módulo puro: recebe as
 * `EstatisticasAtleta` já calculadas (ver `lib/futebol/estatisticas-atleta-query.ts`, filtradas
 * pelas Competições marcadas no gatilho) e só faz a conta — nenhum I/O aqui.
 */

export interface ProgressoGatilho {
  /** Percentual (0-100) pras métricas `pct_*`, contagem absoluta pras `total_*` — mesma unidade de
   * `limiar` (ver `MetricaGatilhoContrato`). */
  atual: number;
  atingida: boolean;
}

/** `totalJogos` (denominador das métricas `pct_*`) é o total de jogos do time no universo
 * filtrado — mesmo denominador já usado no donut de participação da Ficha do atleta. Com
 * `totalJogos === 0` (nenhum jogo no universo escolhido ainda), as métricas percentuais ficam em
 * 0% em vez de dividir por zero. */
export function calcularProgressoGatilho(
  stats: EstatisticasAtleta,
  metrica: MetricaGatilhoContrato,
  limiar: number,
): ProgressoGatilho {
  const totalJogos = stats.titular + stats.banco + stats.naoConvocado;
  const atual = (() => {
    switch (metrica) {
      case "pct_convocado":
        return totalJogos > 0 ? ((stats.titular + stats.banco) / totalJogos) * 100 : 0;
      case "pct_titular":
        return totalJogos > 0 ? (stats.titular / totalJogos) * 100 : 0;
      case "pct_mais_um_tempo":
        return totalJogos > 0 ? (stats.jogosMaisUmTempo / totalJogos) * 100 : 0;
      case "pct_jogo_completo":
        return totalJogos > 0 ? (stats.jogosJogoCompleto / totalJogos) * 100 : 0;
      case "total_gols":
        return stats.gols;
      case "total_assistencias":
        return stats.assistencias;
    }
  })();
  return { atual, atingida: atual >= limiar };
}

/** Um Gatilho já confirmado (`cumprida_em` preenchido), com o nome do atleta já resolvido — ver
 * `bonusGatilhosDoMes` abaixo. */
export interface GatilhoCumpridoAtleta {
  atletaId: string;
  atletaNome: string;
  metrica: MetricaGatilhoContrato;
  valorBonus: number;
  /** Data em que o bônus foi confirmado (`YYYY-MM-DD`) — nunca vazia aqui (só entram gatilhos já
   * confirmados). */
  cumpridaEm: string;
}

export interface BonusGatilhosResumo {
  itens: GatilhoCumpridoAtleta[];
  total: number;
}

/**
 * Filtra os Gatilhos confirmados NO MÊS de `hojeStr` e soma o valor — usado pro Financeiro
 * (Profissional e Base) mostrar uma linha separada de "Bônus de gatilhos este mês", nunca somada
 * ao custo recorrente (`custoComissao`/`custoAtletas`/`totalGeral`), que não tem noção de mês (ver
 * docs/superpowers/specs/2026-11-04-contrato-atleta-gatilhos-design.md, seção Financeiro — decisão
 * do Mateus: "Linha separada, só no mês", em vez de somar no custo recorrente e inflar
 * permanentemente o "gasto mensal" do atleta por causa de um bônus pontual). `gatilhos` já vem com
 * TODOS os confirmados (qualquer mês/atleta) — a função só filtra e soma, não faz I/O.
 */
export function bonusGatilhosDoMes(gatilhos: GatilhoCumpridoAtleta[], hojeStr: string): BonusGatilhosResumo {
  const mesAtual = hojeStr.slice(0, 7); // "YYYY-MM"
  const itens = gatilhos.filter((g) => g.cumpridaEm.slice(0, 7) === mesAtual);
  const total = itens.reduce((soma, g) => soma + g.valorBonus, 0);
  return { itens, total };
}
