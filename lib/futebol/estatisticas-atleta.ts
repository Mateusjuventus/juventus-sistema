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
  tempo: "primeiro" | "segundo";
  minuto: number;
  atletaId: string | null;
  atletaEntrouId: string | null;
  atletaAssistenciaId: string | null;
  ordem: number;
}

/** Um jogo do universo considerado (ver spec: só jogos com Convocação salva no período filtrado).
 * `duracaoPrimeiroTempo`/`duracaoSegundoTempo` vêm `null` quando o jogo ainda não tem Súmula salva
 * — nesse caso a minutagem desse jogo é tratada como 0, mas ele continua contando na participação. */
export interface JogoParaEstatistica {
  jogoId: string;
  statusConvocacao: StatusConvocacaoJogo;
  duracaoPrimeiroTempo: number | null;
  duracaoSegundoTempo: number | null;
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
  jogosMais60min: number;
  jogosMais90min: number;
}

/** Converte o minuto de um evento (relativo ao próprio tempo) pro "relógio" do jogo inteiro — o 2º
 * tempo continua contando a partir de onde o 1º parou (incluindo os acréscimos configurados). */
function minutoAbsoluto(evento: EventoParaEstatistica, duracaoPrimeiroTempo: number): number {
  return evento.tempo === "primeiro" ? evento.minuto : duracaoPrimeiroTempo + evento.minuto;
}

/**
 * Minutos jogados por este atleta num único jogo — ver o algoritmo na spec:
 * - Não convocado, ou jogo sem Súmula salva ainda: 0 minutos.
 * - Titular: começa em 0; termina no primeiro evento de substituição (saindo) ou cartão vermelho
 *   dele, ou no fim do jogo se nenhum dos dois aconteceu.
 * - Reserva: 0 minutos se não há evento de substituição com ele entrando; senão começa no minuto
 *   da entrada e termina igual ao titular (substituição saindo depois, cartão vermelho, ou fim de
 *   jogo).
 */
export function calcularMinutosJogados(
  atletaId: string,
  statusConvocacao: StatusConvocacaoJogo,
  duracaoPrimeiroTempo: number | null,
  duracaoSegundoTempo: number | null,
  eventos: EventoParaEstatistica[],
): number {
  if (statusConvocacao === "nao_convocado") return 0;
  if (duracaoPrimeiroTempo == null || duracaoSegundoTempo == null) return 0;

  const fimDoJogo = duracaoPrimeiroTempo + duracaoSegundoTempo;
  const abs = (e: EventoParaEstatistica) => minutoAbsoluto(e, duracaoPrimeiroTempo);
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
    jogosMais60min: 0,
    jogosMais90min: 0,
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
    );
    stats.minutosTotais += minutos;
    if (minutos > 60) stats.jogosMais60min += 1;
    if (minutos > 90) stats.jogosMais90min += 1;
  }

  return stats;
}
