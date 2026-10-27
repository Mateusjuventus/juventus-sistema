/**
 * Cálculo das Estatísticas do Atleta (aba "Dados de Jogo" do perfil) — participação, contadores de
 * gols/assistências/cartões e minutagem. Tudo computado sob demanda a partir de
 * `convocacao_atletas` e `sumula_eventos` (sem tabela de cache), já que Convocação e Súmula
 * continuam sempre editáveis depois do jogo. Ver
 * docs/superpowers/specs/2026-08-04-estatisticas-atleta-design.md.
 *
 * Compartilhado entre Futebol Profissional e Futebol de Base — recebe só os dados já buscados do
 * banco (independente de qual tabela veio), então a mesma lógica serve pros dois departamentos.
 */

export type StatusConvocacaoJogo = "titular" | "reserva" | "nao_convocado";

export type SumulaEventoTipoStats = "gol" | "cartao_amarelo" | "cartao_vermelho" | "substituicao";

export interface EventoParaEstatistica {
  tipo: SumulaEventoTipoStats;
  /** "terceiro" só aparece em jogos da Base de uma competição com `numero_tempos = 3` (ver
   * docs/superpowers/specs/2026-10-21-competicoes-formato-partida-design.md) — no Profissional
   * nunca ocorre. */
  tempo: "primeiro" | "segundo" | "terceiro";
  minuto: number;
  atletaId: string | null;
  atletaEntrouId: string | null;
  atletaAssistenciaId: string | null;
  ordem: number;
}

/** Um jogo do universo considerado (ver spec: só jogos com Convocação salva no período filtrado).
 * `duracaoPrimeiroTempo`/`duracaoSegundoTempo` vêm `null` quando o jogo ainda não tem Súmula salva
 * — nesse caso a minutagem desse jogo é tratada como 0, mas ele continua contando na participação.
 * `duracaoTerceiroTempo` é opcional (campo novo, trailing, pra não quebrar quem já constrói este
 * objeto sem ele) e só é considerado quando presente e não-nulo — jogos de 2 tempos (todo o
 * Profissional, e a maioria da Base) simplesmente não o informam.
 *
 * `acrescimoPrimeiroTempo`/`acrescimoSegundoTempo`/`acrescimoTerceiroTempo` (também opcionais,
 * trailing, default 0 quando ausentes — ver 0147_sumula_acrescimo.sql) guardam o acréscimo de cada
 * tempo À PARTE da duração regulamentar: somam no "relógio" do jogo (fim de jogo e minutagem de
 * cada atleta) sem alterar `duracaoPrimeiroTempo` etc., que continuam representando só o tempo
 * regulamentar — é esse valor regulamentar (sem acréscimo) que os limiares de "+1 tempo"/"jogo
 * completo" usam em `calcularEstatisticasAtleta`, pra não depender de quem preenche a Súmula
 * lembrar de somar o acréscimo manualmente na duração. */
export interface JogoParaEstatistica {
  jogoId: string;
  statusConvocacao: StatusConvocacaoJogo;
  duracaoPrimeiroTempo: number | null;
  duracaoSegundoTempo: number | null;
  duracaoTerceiroTempo?: number | null;
  acrescimoPrimeiroTempo?: number | null;
  acrescimoSegundoTempo?: number | null;
  acrescimoTerceiroTempo?: number | null;
  eventos: EventoParaEstatistica[];
}

export interface EstatisticasAtleta {
  titular: number;
  banco: number;
  naoConvocado: number;
  gols: number;
  assistencias: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
  minutosTotais: number;
  /** Jogos em que o atleta jogou mais minutos do que a duração regulamentar de um único tempo (ver
   * `duracaoReferenciaEstatisticas` pra saber que número mostrar no rótulo "+Xmin" — varia por
   * categoria, ex: 45min no padrão, 40min no Sub-17). Chamava `jogosMais60min` antes de existir
   * duração por categoria. */
  jogosMaisUmTempo: number;
  /** Jogos em que o atleta jogou a duração regulamentar inteira (ou mais) — usa `>=`, não `>`,
   * de propósito: um atleta que joga o jogo inteiro sem nenhuma substituição e sem acréscimo
   * lançado tem minutagem EXATAMENTE igual à duração total, e isso sempre deveria contar como jogo
   * completo (bug corrigido aqui — antes, com `>`, nunca contava). Chamava `jogosMais90min` antes. */
  jogosJogoCompleto: number;
}

/** Converte um minuto "relativo ao próprio tempo" (ex: 34 = 34º minuto do 2º tempo, do jeito que
 * lançamos manualmente na Súmula) pro "relógio" do jogo inteiro (ex: 79, se o 1º tempo durou 45)
 * — o 2º tempo continua contando a partir de onde o 1º parou. Exportada porque também é usada só
 * pra exibição (ver `LinhaEvento` na aba Súmula), não só no cálculo de estatísticas.
 *
 * `acrescimoPrimeiroTempo`/`acrescimoSegundoTempo` (opcionais, trailing, default 0) deslocam esse
 * relógio quando o tempo anterior teve acréscimo lançado — ver comentário de
 * `JogoParaEstatistica.acrescimoPrimeiroTempo`. Quem já chama esta função sem passar acréscimo
 * continua funcionando exatamente como antes (acréscimo 0). */
export function calcularMinutoAbsoluto(
  tempo: "primeiro" | "segundo" | "terceiro",
  minuto: number,
  duracaoPrimeiroTempo: number,
  /** Só precisa ser informado quando `tempo === "terceiro"` (jogo de 3 tempos — ver
   * `JogoParaEstatistica.duracaoTerceiroTempo`); trailing e opcional pra não exigir mudança nos
   * chamadores existentes, que só lidam com 1º/2º tempo. */
  duracaoSegundoTempo?: number,
  acrescimoPrimeiroTempo = 0,
  acrescimoSegundoTempo = 0,
): number {
  if (tempo === "primeiro") return minuto;
  if (tempo === "segundo") return duracaoPrimeiroTempo + acrescimoPrimeiroTempo + minuto;
  return duracaoPrimeiroTempo + acrescimoPrimeiroTempo + (duracaoSegundoTempo ?? 0) + acrescimoSegundoTempo + minuto;
}

function minutoAbsoluto(
  evento: EventoParaEstatistica,
  duracaoPrimeiroTempo: number,
  duracaoSegundoTempo?: number,
  acrescimoPrimeiroTempo = 0,
  acrescimoSegundoTempo = 0,
): number {
  return calcularMinutoAbsoluto(
    evento.tempo,
    evento.minuto,
    duracaoPrimeiroTempo,
    duracaoSegundoTempo,
    acrescimoPrimeiroTempo,
    acrescimoSegundoTempo,
  );
}

/**
 * Minutos jogados por este atleta num único jogo — ver o algoritmo na spec:
 * - Não convocado, ou jogo sem Súmula salva ainda: 0 minutos.
 * - Titular: começa em 0; termina no primeiro evento de substituição (saindo) ou cartão vermelho
 *   dele, ou no fim do jogo se nenhum dos dois aconteceu.
 * - Reserva: 0 minutos se não há evento de substituição com ele entrando; senão começa no minuto
 *   da entrada e termina igual ao titular (substituição saindo depois, cartão vermelho, ou fim de
 *   jogo).
 *
 * O "fim de jogo" soma a duração regulamentar de cada tempo MAIS o acréscimo lançado nele (ver
 * `acrescimoPrimeiroTempo`/`acrescimoSegundoTempo`/`acrescimoTerceiroTempo`, todos opcionais e
 * default 0) — assim um atleta que joga até o fim de um tempo com acréscimo é contado corretamente
 * até o minuto real em que o tempo terminou, não só até a duração regulamentar.
 */
export function calcularMinutosJogados(
  atletaId: string,
  statusConvocacao: StatusConvocacaoJogo,
  duracaoPrimeiroTempo: number | null,
  duracaoSegundoTempo: number | null,
  eventos: EventoParaEstatistica[],
  /** Trailing e opcional (default `null`), de propósito: jogos de 2 tempos — todo o Profissional e
   * a maioria da Base — continuam chamando esta função exatamente como antes. Só é considerado
   * quando o jogo pertence a uma competição com `numero_tempos = 3` (ver
   * docs/superpowers/specs/2026-10-21-competicoes-formato-partida-design.md). */
  duracaoTerceiroTempo: number | null = null,
  acrescimoPrimeiroTempo = 0,
  acrescimoSegundoTempo = 0,
  acrescimoTerceiroTempo = 0,
): number {
  if (statusConvocacao === "nao_convocado") return 0;
  if (duracaoPrimeiroTempo == null || duracaoSegundoTempo == null) return 0;

  const fimDoJogo =
    duracaoPrimeiroTempo +
    acrescimoPrimeiroTempo +
    duracaoSegundoTempo +
    acrescimoSegundoTempo +
    (duracaoTerceiroTempo ?? 0) +
    acrescimoTerceiroTempo;
  const abs = (e: EventoParaEstatistica) =>
    minutoAbsoluto(e, duracaoPrimeiroTempo, duracaoSegundoTempo, acrescimoPrimeiroTempo, acrescimoSegundoTempo);
  const ordenados = [...eventos].sort((a, b) => abs(a) - abs(b) || a.ordem - b.ordem);

  let minutoInicio = 0;
  if (statusConvocacao === "reserva") {
    const entrada = ordenados.find((e) => e.tipo === "substituicao" && e.atletaEntrouId === atletaId);
    if (!entrada) return 0;
    minutoInicio = abs(entrada);
  }

  const saida = ordenados.find(
    (e) =>
      abs(e) >= minutoInicio &&
      ((e.tipo === "substituicao" && e.atletaId === atletaId) ||
        (e.tipo === "cartao_vermelho" && e.atletaId === atletaId)),
  );

  const minutoFim = saida ? abs(saida) : fimDoJogo;
  return Math.max(0, minutoFim - minutoInicio);
}

/** Duração "de referência" a mostrar nos rótulos "+Xmin"/"jogo completo" (ex: "+45min" no padrão,
 * "+40min" no Sub-17) — pega a duração regulamentar do primeiro jogo do universo que já tem Súmula
 * salva (todos os jogos de um atleta normalmente pertencem à mesma categoria/competição, então
 * praticamente sempre têm a mesma duração; quando não há nenhum jogo com Súmula, cai no padrão
 * histórico de 45×45 = 90). Deliberadamente não tenta resolver o caso raro de um atleta com jogos
 * de categorias/competições com durações diferentes no mesmo período filtrado — mostra a duração do
 * primeiro desses jogos, e cada jogo individualmente já é avaliado com a SUA própria duração em
 * `calcularEstatisticasAtleta` (os contadores agregados sempre ficam corretos; só o rótulo é uma
 * referência aproximada quando há mistura). */
export function duracaoReferenciaEstatisticas(jogos: JogoParaEstatistica[]): {
  primeiroTempo: number;
  total: number;
} {
  const comSumula = jogos.find((j) => j.duracaoPrimeiroTempo != null && j.duracaoSegundoTempo != null);
  if (!comSumula) return { primeiroTempo: 45, total: 90 };
  const total =
    (comSumula.duracaoPrimeiroTempo ?? 0) + (comSumula.duracaoSegundoTempo ?? 0) + (comSumula.duracaoTerceiroTempo ?? 0);
  return { primeiroTempo: comSumula.duracaoPrimeiroTempo ?? 45, total };
}

/** Agrega participação, contadores e minutagem de um atleta ao longo de vários jogos (o universo
 * já filtrado por período/competição e restrito a jogos com Convocação salva — ver a spec). */
export function calcularEstatisticasAtleta(
  atletaId: string,
  jogos: JogoParaEstatistica[],
): EstatisticasAtleta {
  const stats: EstatisticasAtleta = {
    titular: 0,
    banco: 0,
    naoConvocado: 0,
    gols: 0,
    assistencias: 0,
    cartoesAmarelos: 0,
    cartoesVermelhos: 0,
    minutosTotais: 0,
    jogosMaisUmTempo: 0,
    jogosJogoCompleto: 0,
  };

  for (const jogo of jogos) {
    if (jogo.statusConvocacao === "titular") stats.titular += 1;
    else if (jogo.statusConvocacao === "reserva") stats.banco += 1;
    else stats.naoConvocado += 1;

    for (const evento of jogo.eventos) {
      if (evento.tipo === "gol" && evento.atletaId === atletaId) stats.gols += 1;
      if (evento.tipo === "gol" && evento.atletaAssistenciaId === atletaId) stats.assistencias += 1;
      if (evento.tipo === "cartao_amarelo" && evento.atletaId === atletaId) stats.cartoesAmarelos += 1;
      if (evento.tipo === "cartao_vermelho" && evento.atletaId === atletaId) stats.cartoesVermelhos += 1;
    }

    const minutos = calcularMinutosJogados(
      atletaId,
      jogo.statusConvocacao,
      jogo.duracaoPrimeiroTempo,
      jogo.duracaoSegundoTempo,
      jogo.eventos,
      jogo.duracaoTerceiroTempo ?? null,
      jogo.acrescimoPrimeiroTempo ?? 0,
      jogo.acrescimoSegundoTempo ?? 0,
      jogo.acrescimoTerceiroTempo ?? 0,
    );
    stats.minutosTotais += minutos;

    // Limiares calculados com a duração REGULAMENTAR (sem acréscimo) deste jogo específico — cada
    // jogo pode ter uma duração diferente (categoria/competição diferentes), então não dá pra usar
    // um número fixo (45/90) como antes.
    if (jogo.duracaoPrimeiroTempo != null && minutos > jogo.duracaoPrimeiroTempo) stats.jogosMaisUmTempo += 1;
    if (jogo.duracaoPrimeiroTempo != null && jogo.duracaoSegundoTempo != null) {
      const duracaoTotalRegulamentar =
        jogo.duracaoPrimeiroTempo + jogo.duracaoSegundoTempo + (jogo.duracaoTerceiroTempo ?? 0);
      if (minutos >= duracaoTotalRegulamentar) stats.jogosJogoCompleto += 1;
    }
  }

  return stats;
}

/** Minutos/gols/assistências/cartões deste atleta EM CADA jogo individualmente — mesmo cálculo de
 * `calcularEstatisticasAtleta`, só que sem agregar, pra montar a lista "jogo a jogo" (ver
 * docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-anotacoes-design.md, adendo "Lista jogo a
 * jogo"). Pedido do Mateus em 2026-10-27: "quais jogos ele foi convocado, a minutagem
 * individualizada de cada jogo e quais foram os jogos que ele fez os gols". Pura — quem chama
 * cruza isto com os dados de exibição (adversário, data, competição) que não entram em
 * `JogoParaEstatistica` de propósito (esse tipo é só o que o cálculo precisa). */
export interface DetalheJogoAtleta {
  jogoId: string;
  minutos: number;
  gols: number;
  assistencias: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
}

export function calcularDetalhePorJogo(atletaId: string, jogos: JogoParaEstatistica[]): DetalheJogoAtleta[] {
  return jogos.map((jogo) => {
    let gols = 0;
    let assistencias = 0;
    let cartoesAmarelos = 0;
    let cartoesVermelhos = 0;
    for (const evento of jogo.eventos) {
      if (evento.tipo === "gol" && evento.atletaId === atletaId) gols += 1;
      if (evento.tipo === "gol" && evento.atletaAssistenciaId === atletaId) assistencias += 1;
      if (evento.tipo === "cartao_amarelo" && evento.atletaId === atletaId) cartoesAmarelos += 1;
      if (evento.tipo === "cartao_vermelho" && evento.atletaId === atletaId) cartoesVermelhos += 1;
    }
    const minutos = calcularMinutosJogados(
      atletaId,
      jogo.statusConvocacao,
      jogo.duracaoPrimeiroTempo,
      jogo.duracaoSegundoTempo,
      jogo.eventos,
      jogo.duracaoTerceiroTempo ?? null,
      jogo.acrescimoPrimeiroTempo ?? 0,
      jogo.acrescimoSegundoTempo ?? 0,
      jogo.acrescimoTerceiroTempo ?? 0,
    );
    return { jogoId: jogo.jogoId, minutos, gols, assistencias, cartoesAmarelos, cartoesVermelhos };
  });
}
