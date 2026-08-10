import type { CompeticaoSuspensaoOrigem } from "@/lib/supabase/types";

/**
 * Motor de regras disciplinares de uma competição (ver
 * docs/superpowers/specs/2026-08-10-competicoes-design.md).
 *
 * Princípio (definido pelo Mateus na spec): o cartão existe APENAS como evento registrado na
 * súmula do jogo. Este módulo não grava nada — recebe os eventos das súmulas dos jogos vinculados
 * à competição e DERIVA na hora: contagem de cartões, suspensões automáticas (3º amarelo,
 * vermelho direto, expulsão por 2 amarelos), jogos cumpridos/restantes e condição de jogo.
 * Só a suspensão MANUAL (decisão disciplinar externa) vem de tabela própria e é misturada aqui.
 *
 * Funções puras (sem Supabase) pra dar pra testar — quem carrega os dados é
 * `lib/futebol/competicao-query.ts`.
 */

export interface RegrasDisciplina {
  /** Quantos amarelos acumulados gera suspensão (padrão 3). */
  amarelosParaSuspensao: number;
  jogosSuspensaoAmarelos: number;
  jogosSuspensaoVermelho: number;
}

/** Jogo vinculado à competição, já achatado — `data` decide a ordem cronológica. `faseId` (quando
 * o vínculo tem fase) permite aplicar o zeramento de amarelos entre fases. */
export interface JogoDisciplina {
  jogoId: string;
  data: string; // yyyy-mm-dd
  confronto: string;
  faseId?: string | null;
}

export interface CartaoEvento {
  jogoId: string;
  atletaId: string;
  tipo: "cartao_amarelo" | "cartao_vermelho";
}

export interface SuspensaoManualInput {
  id: string;
  atletaId: string;
  origem: CompeticaoSuspensaoOrigem;
  motivo: string;
  jogosSuspensao: number;
  dataDecisao: string; // yyyy-mm-dd — vale a partir desta data
}

export type SuspensaoStatus = "ativa" | "cumprida";

export interface SuspensaoCalculada {
  atletaId: string;
  tipo: "automatica" | "manual";
  origem: CompeticaoSuspensaoOrigem;
  motivo: string;
  /** Jogo em que o cartão de origem aconteceu — null pra suspensão manual sem jogo. */
  jogoOrigemId: string | null;
  dataInicio: string;
  jogosSuspensao: number;
  /** Ids dos jogos vinculados em que a suspensão é cumprida (os N primeiros após a origem,
   * pulando jogos já tomados por outra suspensão do mesmo atleta — suspensões acumulam em
   * sequência, não em paralelo). Pode ter menos que `jogosSuspensao` se ainda não há jogos
   * futuros vinculados suficientes. */
  jogosCumprir: string[];
  jogosCumpridos: number;
  jogosRestantes: number;
  proximoJogoCumprirId: string | null;
  status: SuspensaoStatus;
  /** Preenchido só quando tipo = "manual" (id da linha em competicao_suspensoes_manuais). */
  manualId: string | null;
}

export interface CartoesAtleta {
  atletaId: string;
  amarelos: number;
  vermelhos: number;
  ultimoJogoId: string | null;
  ultimoTipo: "cartao_amarelo" | "cartao_vermelho" | null;
  /** Amarelos do ciclo atual (zera a cada suspensão por acúmulo; amarelos que viraram expulsão
   * por 2 no mesmo jogo não contam — regra padrão de federação). */
  amarelosAtivos: number;
  /** A um amarelo da suspensão. */
  pendurado: boolean;
}

export interface DisciplinaCompeticao {
  cartoes: CartoesAtleta[];
  suspensoes: SuspensaoCalculada[];
}

function ordenarJogos(jogos: JogoDisciplina[]): JogoDisciplina[] {
  return [...jogos].sort((a, b) => (a.data === b.data ? a.jogoId.localeCompare(b.jogoId) : a.data.localeCompare(b.data)));
}

/**
 * Calcula cartões e suspensões da competição inteira a partir dos eventos das súmulas.
 * `hojeStr` (yyyy-mm-dd) decide o que já foi cumprido: um jogo conta como cumprido quando a data
 * dele já passou (`data < hoje`) — no dia do jogo o atleta ainda está suspenso PARA ele.
 *
 * `fasesQueZeramAmarelos`: fases com "zerar cartões ao encerrar" (regulamento da Copa Paulista,
 * Art. 60 caput: "Finalizada a primeira fase [...] os cartões amarelos serão zerados, desde que
 * não seja o terceiro da série"). Na linha do tempo dos jogos vinculados, ao cruzar do último
 * jogo de uma dessas fases pro primeiro jogo de outra fase, o ACÚMULO de amarelos de todo mundo
 * zera — mas suspensão já gerada dentro da fase (3º amarelo no último jogo, por exemplo) continua
 * valendo e é cumprida normalmente nos jogos seguintes.
 */
export function calcularDisciplina(
  regras: RegrasDisciplina,
  jogos: JogoDisciplina[],
  eventos: CartaoEvento[],
  manuais: SuspensaoManualInput[],
  hojeStr: string,
  fasesQueZeramAmarelos: Set<string> = new Set(),
): DisciplinaCompeticao {
  const jogosOrdenados = ordenarJogos(jogos);
  const indexPorJogo = new Map<string, number>(jogosOrdenados.map((j, i) => [j.jogoId, i]));

  // "Época" de cada jogo na linha do tempo: cruza pra uma época nova quando o jogo anterior era
  // de uma fase que zera amarelos e este jogo é de outra fase. Amarelos só acumulam dentro da
  // mesma época.
  const epocaPorIndice: number[] = [];
  let epocaAtual = 0;
  for (let i = 0; i < jogosOrdenados.length; i++) {
    if (i > 0) {
      const anterior = jogosOrdenados[i - 1];
      const atual = jogosOrdenados[i];
      if (
        anterior.faseId &&
        fasesQueZeramAmarelos.has(anterior.faseId) &&
        atual.faseId !== anterior.faseId
      ) {
        epocaAtual += 1;
      }
    }
    epocaPorIndice.push(epocaAtual);
  }

  // eventos agrupados por atleta e, dentro do atleta, por jogo (na ordem cronológica dos jogos)
  const porAtleta = new Map<string, Map<string, CartaoEvento[]>>();
  for (const e of eventos) {
    if (!indexPorJogo.has(e.jogoId)) continue; // evento de jogo não vinculado não conta
    const jogosDoAtleta = porAtleta.get(e.atletaId) ?? new Map<string, CartaoEvento[]>();
    const lista = jogosDoAtleta.get(e.jogoId) ?? [];
    lista.push(e);
    jogosDoAtleta.set(e.jogoId, lista);
    porAtleta.set(e.atletaId, jogosDoAtleta);
  }

  interface SuspensaoBruta {
    atletaId: string;
    tipo: "automatica" | "manual";
    origem: CompeticaoSuspensaoOrigem;
    motivo: string;
    jogoOrigemId: string | null;
    dataInicio: string;
    jogosSuspensao: number;
    /** Índice em `jogosOrdenados` a partir do qual pode começar a cumprir (exclusivo do jogo de
     * origem — cumpre a partir do jogo SEGUINTE). */
    aPartirDoIndice: number;
    manualId: string | null;
  }

  const cartoes: CartoesAtleta[] = [];
  const brutas: SuspensaoBruta[] = [];

  // Época em que os amarelos "vivos" de fato estão: a do último jogo vinculado (o ciclo atual).
  const epocaFinal = epocaPorIndice.length > 0 ? epocaPorIndice[epocaPorIndice.length - 1] : 0;

  for (const [atletaId, jogosDoAtleta] of porAtleta) {
    let acumulado = 0;
    let epocaDoAcumulado = 0;
    let totalAmarelos = 0;
    let totalVermelhos = 0;
    let ultimoJogoId: string | null = null;
    let ultimoTipo: "cartao_amarelo" | "cartao_vermelho" | null = null;

    for (const jogo of jogosOrdenados) {
      const doJogo = jogosDoAtleta.get(jogo.jogoId);
      if (!doJogo || doJogo.length === 0) continue;

      // Virou a época (fim de fase que zera amarelos)? O acúmulo em andamento morre ali —
      // suspensões já geradas ficam.
      const epocaDoJogo = epocaPorIndice[indexPorJogo.get(jogo.jogoId) as number];
      if (epocaDoJogo !== epocaDoAcumulado) {
        acumulado = 0;
        epocaDoAcumulado = epocaDoJogo;
      }

      const amarelosNoJogo = doJogo.filter((e) => e.tipo === "cartao_amarelo").length;
      const vermelhosNoJogo = doJogo.filter((e) => e.tipo === "cartao_vermelho").length;
      totalAmarelos += amarelosNoJogo;
      totalVermelhos += vermelhosNoJogo;
      ultimoJogoId = jogo.jogoId;
      ultimoTipo = vermelhosNoJogo > 0 ? "cartao_vermelho" : "cartao_amarelo";

      const indice = indexPorJogo.get(jogo.jogoId) as number;

      if (amarelosNoJogo >= 2) {
        // Expulsão por 2 amarelos no mesmo jogo — vira suspensão própria e esses amarelos NÃO
        // acumulam pro ciclo (regra padrão de federação; sem isso o atleta seria punido em dobro).
        brutas.push({
          atletaId,
          tipo: "automatica",
          origem: "cartao",
          motivo: "Expulsão por 2 cartões amarelos",
          jogoOrigemId: jogo.jogoId,
          dataInicio: jogo.data,
          jogosSuspensao: regras.jogosSuspensaoVermelho,
          aPartirDoIndice: indice + 1,
          manualId: null,
        });
      } else {
        acumulado += amarelosNoJogo;
        while (acumulado >= regras.amarelosParaSuspensao) {
          brutas.push({
            atletaId,
            tipo: "automatica",
            origem: "cartao",
            motivo: `${regras.amarelosParaSuspensao}º cartão amarelo`,
            jogoOrigemId: jogo.jogoId,
            dataInicio: jogo.data,
            jogosSuspensao: regras.jogosSuspensaoAmarelos,
            aPartirDoIndice: indice + 1,
            manualId: null,
          });
          acumulado -= regras.amarelosParaSuspensao;
        }
      }

      if (vermelhosNoJogo > 0) {
        brutas.push({
          atletaId,
          tipo: "automatica",
          origem: "cartao",
          motivo: "Cartão vermelho direto",
          jogoOrigemId: jogo.jogoId,
          dataInicio: jogo.data,
          jogosSuspensao: regras.jogosSuspensaoVermelho * vermelhosNoJogo,
          aPartirDoIndice: indice + 1,
          manualId: null,
        });
      }
    }

    // Se a linha do tempo já cruzou pra uma época posterior à do último cartão do atleta, o
    // acúmulo dele foi zerado pelo fim da fase mesmo sem ele ter jogado de novo.
    const amarelosAtivos = epocaDoAcumulado === epocaFinal ? acumulado : 0;

    cartoes.push({
      atletaId,
      amarelos: totalAmarelos,
      vermelhos: totalVermelhos,
      ultimoJogoId,
      ultimoTipo,
      amarelosAtivos,
      pendurado: regras.amarelosParaSuspensao > 1 && amarelosAtivos === regras.amarelosParaSuspensao - 1,
    });
  }

  for (const m of manuais) {
    // Manual vale a partir da data da decisão: cumpre nos jogos vinculados com data >= dataDecisao.
    const primeiroIndice = jogosOrdenados.findIndex((j) => j.data >= m.dataDecisao);
    brutas.push({
      atletaId: m.atletaId,
      tipo: "manual",
      origem: m.origem,
      motivo: m.motivo,
      jogoOrigemId: null,
      dataInicio: m.dataDecisao,
      jogosSuspensao: m.jogosSuspensao,
      aPartirDoIndice: primeiroIndice === -1 ? jogosOrdenados.length : primeiroIndice,
      manualId: m.id,
    });
  }

  // Distribui os jogos de cumprimento por atleta, em ordem cronológica de início — suspensões do
  // mesmo atleta acumulam em SEQUÊNCIA (vermelho + 3º amarelo no mesmo jogo = 2 jogos fora, não 1).
  brutas.sort((a, b) =>
    a.dataInicio === b.dataInicio ? a.aPartirDoIndice - b.aPartirDoIndice : a.dataInicio.localeCompare(b.dataInicio),
  );
  const jogosTomadosPorAtleta = new Map<string, Set<string>>();

  const suspensoes: SuspensaoCalculada[] = brutas.map((s) => {
    const tomados = jogosTomadosPorAtleta.get(s.atletaId) ?? new Set<string>();
    const jogosCumprir: string[] = [];
    for (let i = s.aPartirDoIndice; i < jogosOrdenados.length && jogosCumprir.length < s.jogosSuspensao; i++) {
      const candidato = jogosOrdenados[i];
      if (tomados.has(candidato.jogoId)) continue;
      jogosCumprir.push(candidato.jogoId);
      tomados.add(candidato.jogoId);
    }
    jogosTomadosPorAtleta.set(s.atletaId, tomados);

    const jogosCumpridos = jogosCumprir.filter((id) => {
      const jogo = jogosOrdenados[indexPorJogo.get(id) as number];
      return jogo.data < hojeStr;
    }).length;
    const jogosRestantes = s.jogosSuspensao - jogosCumpridos;
    const proximoJogoCumprirId =
      jogosCumprir.find((id) => {
        const jogo = jogosOrdenados[indexPorJogo.get(id) as number];
        return jogo.data >= hojeStr;
      }) ?? null;

    return {
      atletaId: s.atletaId,
      tipo: s.tipo,
      origem: s.origem,
      motivo: s.motivo,
      jogoOrigemId: s.jogoOrigemId,
      dataInicio: s.dataInicio,
      jogosSuspensao: s.jogosSuspensao,
      jogosCumprir,
      jogosCumpridos,
      jogosRestantes,
      proximoJogoCumprirId,
      status: jogosRestantes <= 0 ? "cumprida" : "ativa",
      manualId: s.manualId,
    };
  });

  return { cartoes, suspensoes };
}

/** Suspensões que pegam um jogo específico (o atleta cumpre NESTE jogo). */
export function suspensoesParaJogo(suspensoes: SuspensaoCalculada[], jogoId: string): SuspensaoCalculada[] {
  return suspensoes.filter((s) => s.jogosCumprir.includes(jogoId));
}

export type CondicaoJogoStatus = "apto" | "atencao" | "suspenso" | "irregular";

export interface CondicaoAtleta {
  atletaId: string;
  status: CondicaoJogoStatus;
  detalhe: string;
}

/**
 * Condição de jogo de um atleta para um jogo vinculado — consulta pura sobre o que já foi
 * calculado: inscrição na competição, suspensões que pegam o jogo, e pendurado.
 */
export function condicaoDoAtleta(
  atletaId: string,
  jogoId: string,
  inscrito: boolean,
  disciplina: DisciplinaCompeticao,
): CondicaoAtleta {
  if (!inscrito) {
    return { atletaId, status: "irregular", detalhe: "Não inscrito na competição" };
  }
  const suspensoesDoJogo = suspensoesParaJogo(disciplina.suspensoes, jogoId).filter((s) => s.atletaId === atletaId);
  if (suspensoesDoJogo.length > 0) {
    const s = suspensoesDoJogo[0];
    const restante = s.jogosRestantes === 1 ? "1 partida restante" : `${s.jogosRestantes} partidas restantes`;
    return { atletaId, status: "suspenso", detalhe: `${s.motivo} · ${restante}` };
  }
  const cartoes = disciplina.cartoes.find((c) => c.atletaId === atletaId);
  if (cartoes?.pendurado) {
    return {
      atletaId,
      status: "atencao",
      detalhe: `${cartoes.amarelosAtivos} cartões amarelos — o próximo gera suspensão`,
    };
  }
  return { atletaId, status: "apto", detalhe: "Sem pendências" };
}
