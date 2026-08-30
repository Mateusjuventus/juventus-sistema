/**
 * Aritmética de datas da Programação Semanal — a grade sempre mostra uma semana de Segunda a
 * Domingo (mesmo formato do microciclo do clube, ver mockup aprovado). Trabalha só com strings
 * "YYYY-MM-DD" e `Date.UTC`, nunca `new Date(string)`/`Date.prototype.getDate()` puro, pra não
 * sofrer o mesmo problema de fuso horário já corrigido em `hojeBrasilia()`
 * (lib/data-brasil.ts) — aqui nem chega a envolver fuso, já que a data em si (sem horário) é tratada
 * sempre como um dia "neutro" em UTC.
 */

function parseDataIso(dataIso: string): Date {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function formatDataIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export function somarDias(dataIso: string, dias: number): string {
  const data = parseDataIso(dataIso);
  data.setUTCDate(data.getUTCDate() + dias);
  return formatDataIso(data);
}

/** Segunda-feira da semana que contém `dataIso` — usado tanto pra abrir a grade na semana atual
 * (a partir de `hojeBrasilia()`) quanto pra navegar semana anterior/seguinte (`somarDias(inicio,
 * -7)`/`somarDias(inicio, 7)`). `getUTCDay()`: 0 = domingo .. 6 = sábado. */
export function inicioDaSemana(dataIso: string): string {
  const diaSemana = parseDataIso(dataIso).getUTCDay();
  const deslocamento = diaSemana === 0 ? -6 : 1 - diaSemana;
  return somarDias(dataIso, deslocamento);
}

/** Os 7 dias da semana, em ordem, a partir de uma Segunda-feira (`inicioSemana`). */
export function diasDaSemana(inicioSemana: string): string[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(inicioSemana, i));
}
