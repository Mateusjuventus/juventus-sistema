/**
 * Formatação de texto do microciclo — extraído de `microciclo-data.ts` pra ser um módulo puro, sem
 * NENHUM import que toque Supabase/storage (nem `./queries`, que puxa `lib/supabase/storage.ts` e,
 * por tabela, o pacote nativo `sharp`). Motivo: `components/programacao/copiar-dia-modal.tsx` é um
 * Client Component e precisa de `formatDataCurta` só pro título do modal — importar de
 * `microciclo-data.ts` (que reexporta estas funções, ver abaixo) puxaria toda a cadeia
 * `queries.ts` -> `lib/supabase/storage.ts` -> `sharp` pro bundle do cliente, e `sharp` usa módulos
 * nativos do Node (`node:child_process`, `node:crypto`, ...) que quebram o build do Next
 * (`npx next build` falhava com "Module not found: Can't resolve 'child_process'" antes desta
 * extração). Este arquivo permanece 100% puro pra poder ser importado com segurança tanto do
 * client quanto do server.
 */

const DIAS_SEMANA_COMPLETO = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];
const MESES_EXTENSO = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Nome completo do dia da semana em maiúsculas ("SEGUNDA") — mesmo vocabulário do modelo impresso
 * que o Mateus já usa (ver mockup aprovado), diferente da abreviação de 3 letras usada na grade em
 * tela (`DIA_SEMANA_LABEL` em `components/programacao/programacao-view.tsx`). */
export function nomeDiaSemanaCompleto(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return DIAS_SEMANA_COMPLETO[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
}

/** "2026-08-24" -> "24/08". */
export function formatDataCurta(dataIso: string): string {
  const [, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}`;
}

/** Texto do período do microciclo, no mesmo formato do modelo impresso ("Plano de 24 a 30 de
 * Agosto") — quando a semana atravessa a virada do mês, cada ponta ganha seu próprio mês por
 * extenso ("Plano de 31 de Agosto a 6 de Setembro") pra não ficar ambíguo. */
export function montarPeriodoTexto(dataInicio: string, dataFim: string): string {
  const [, mesInicioStr, diaInicioStr] = dataInicio.split("-");
  const [, mesFimStr, diaFimStr] = dataFim.split("-");
  const diaInicio = String(Number(diaInicioStr));
  const diaFim = String(Number(diaFimStr));
  const mesInicio = MESES_EXTENSO[Number(mesInicioStr) - 1];
  const mesFim = MESES_EXTENSO[Number(mesFimStr) - 1];

  if (mesInicioStr === mesFimStr) {
    return `Plano de ${diaInicio} a ${diaFim} de ${mesFim}`;
  }
  return `Plano de ${diaInicio} de ${mesInicio} a ${diaFim} de ${mesFim}`;
}

/** Linha "Microciclo · Época" do cabeçalho da exportação (ver spec, "Microciclo em texto livre") —
 * troca o número fixo "Microciclo Nº X" por texto livre. `null` quando não há nada pra mostrar (nem
 * texto, nem época) — o chamador simplesmente não desenha a linha nesse caso. */
export function montarLinhaMicrociclo(microcicloTexto: string | null, epoca: string | null): string | null {
  if (microcicloTexto && epoca) return `${microcicloTexto} · Época ${epoca}`;
  if (microcicloTexto) return microcicloTexto;
  if (epoca) return `Época ${epoca}`;
  return null;
}
