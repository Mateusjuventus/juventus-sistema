/**
 * Cálculo de datas do `AtletaCard` (ver docs/superpowers/specs/
 * 2026-09-09-atletas-resumo-filtros-design.md) — formatação ISO ("AAAA-MM-DD", como o Supabase
 * grava) pra exibição BR, e o alerta de "contrato a vencer". Extraído num módulo próprio (em vez de
 * duplicar dentro do componente, como a maioria das telas do sistema faz com `formatData`/`diasAte`
 * locais) porque o plano deste pacote pede teste unitário pra essas duas contas — mais fácil testar
 * puro aqui do que dentro de um `.tsx`.
 */

/** Mesmo prazo usado hoje em `/atletas` e `/base/atletas/[categoria]` (`CONTRATO_A_VENCER_DIAS`) —
 * fonte única agora que o `AtletaCard` é compartilhado pelas duas telas. */
export const CONTRATO_A_VENCER_DIAS = 90;

export function diasAte(data: string, hoje: Date): number {
  const alvo = new Date(data);
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.round((alvo.getTime() - hoje.getTime()) / msPorDia);
}

/** "AAAA-MM-DD" (ou `null`) -> "DD/MM/AAAA" (ou "—"). Serve tanto pra data de nascimento quanto
 * pra fim de contrato — mesma formatação BR nas duas. */
export function formatDataBR(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** "AAAA-MM-DD" (ou `null`) -> `2004` (ou `null`) — usado pelo filtro "Ano de nascimento" de
 * `AtletasResumoFiltros`/`atletas-filtro.ts`. Lê os 4 primeiros caracteres da string em vez de
 * `new Date(data).getFullYear()` de propósito, mesmo raciocínio de `formatDataBR`: evita o "atleta
 * nasceu um dia antes/depois" que o fuso horário do `Date` pode causar numa data sem horário. */
export function anoNascimento(data: string | null): number | null {
  if (!data) return null;
  return Number(data.split("-")[0]);
}

/** `null` quando não há data de fim de contrato cadastrada (nada a alertar). Dispensado nunca
 * "vence" — o contrato já acabou, não faz sentido avisar que está "a vencer". */
export function diasParaVencerContrato(dataFimContrato: string | null, hoje: Date): number | null {
  if (!dataFimContrato) return null;
  return diasAte(dataFimContrato, hoje);
}

/** Sem limite inferior de propósito — mesmo comportamento que já existe hoje nas duas páginas
 * (`venceLogo = ... diasAte(...) <= CONTRATO_A_VENCER_DIAS`, sem checar se já passou): um atleta
 * ativo com contrato já vencido e ainda não dispensado continua sinalizado, não só o intervalo dos
 * próximos 90 dias. */
export function contratoEstaVencendo(
  dataFimContrato: string | null,
  dispensado: boolean,
  hoje: Date,
): boolean {
  if (dispensado) return false;
  const dias = diasParaVencerContrato(dataFimContrato, hoje);
  return dias !== null && dias <= CONTRATO_A_VENCER_DIAS;
}
