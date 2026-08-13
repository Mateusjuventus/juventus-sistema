/**
 * Ordenação das linhas de programação (Concentração e Dia de Jogo) pelo horário.
 *
 * O campo `horario` é TEXTO LIVRE no banco de propósito (ver 0029_jogo_programacao.sql): a
 * programação real tem linha de intervalo ("7:00 às 7:45") e formatos que o pessoal digita de
 * jeitos diferentes ("12:00", "12h", "12h30", "7h", "09:30"). Por isso a ordenação não pode ser
 * `order by horario` no banco — "9:00" viria depois de "12:00" numa comparação de texto.
 *
 * A regra aqui é: extrair o PRIMEIRO horário do texto e comparar em minutos. Linha cujo horário
 * não dá pra interpretar (ex.: "A definir") vai pro fim, mantendo entre elas a ordem em que foram
 * cadastradas — some da frente sem sumir da lista.
 */

/** Primeiro horário do texto, em minutos desde a meia-noite. `null` quando não dá pra interpretar. */
export function minutosDoHorario(horario: string | null | undefined): number | null {
  if (!horario) return null;
  // Aceita "12:00", "12h00", "12h" e "12.00" — o separador pode ser :, h ou ponto, e os minutos
  // podem não existir. `\d{1,2}` no começo garante que "às 7:45" não seja lido como o primeiro
  // horário de "7:00 às 7:45" (a busca pega a primeira ocorrência da esquerda pra direita).
  const casamento = /(\d{1,2})\s*(?:[:h.]\s*(\d{2}))?/i.exec(horario.trim());
  if (!casamento) return null;

  const hora = Number(casamento[1]);
  const minuto = casamento[2] ? Number(casamento[2]) : 0;
  if (!Number.isInteger(hora) || hora > 23 || minuto > 59) return null;

  return hora * 60 + minuto;
}

/**
 * Ordena as linhas do menor horário para o maior, sem alterar o array recebido. Empate (duas
 * linhas no mesmo horário) e linhas sem horário interpretável mantêm a ordem de cadastro — é o
 * `sort` estável do JS somado ao desempate por `ordem`, então a lista nunca "dança" sozinha a cada
 * carregamento da página.
 */
export function ordenarPorHorario<T extends { horario: string; ordem: number }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    const ma = minutosDoHorario(a.horario);
    const mb = minutosDoHorario(b.horario);
    if (ma === null && mb === null) return a.ordem - b.ordem;
    if (ma === null) return 1;
    if (mb === null) return -1;
    if (ma !== mb) return ma - mb;
    return a.ordem - b.ordem;
  });
}
