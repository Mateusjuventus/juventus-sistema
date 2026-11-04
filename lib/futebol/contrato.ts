// Import relativo (não o alias "@/...") — mesmo motivo de `lib/futebol/financeiro.ts`: o alias não
// resolve no vitest pra um import de valor (em runtime), só pra `import type`.
import { RUBRICA_CONTRATO_LABEL } from "../validation/schemas";
import type { AtletaContratoEvolucaoSalarialRow, RubricaContrato } from "../supabase/types";
import { diasEntre } from "./calendario";

/**
 * Extensões do Contrato do Atleta (contagem de dias restantes, evolução salarial, selo de status)
 * — ver docs/superpowers/specs/2026-11-04-contrato-atleta-extensoes-design.md. Em cima do
 * sub-sistema já existente desde 0137_atleta_contrato.sql (`atleta_contratos`,
 * `components/contrato-secao.tsx`).
 */

export interface DiasRestantesContrato {
  dias: number;
  meses: number;
}

/** `null` quando `vigenciaFim` é nulo (contrato sem prazo definido) ou já passou — não faz sentido
 * mostrar "faltam -12 dias" num contrato vencido (isso já é coberto pelo selo de status). */
export function diasRestantesContrato(vigenciaFim: string | null, hojeStr: string): DiasRestantesContrato | null {
  if (!vigenciaFim) return null;
  const dias = diasEntre(hojeStr, vigenciaFim);
  if (dias < 0) return null;
  return { dias, meses: Math.round(dias / 30) };
}

export type StatusContrato = "ativo" | "vencido" | "sem_contrato";

export interface StatusContratoInfo {
  status: StatusContrato;
  label: string;
}

/** Selo "Contrato Ativo"/"Contrato Vencido"/"Sem contrato" na ficha do atleta — `vigente` é o
 * contrato vigente do atleta (`undefined` quando não existe nenhum). Sem `vigencia_fim` conta
 * como "sem prazo definido", nunca vencido. */
export function statusContrato(
  vigente: { vigencia_fim: string | null } | undefined,
  hojeStr: string,
): StatusContratoInfo {
  if (!vigente) return { status: "sem_contrato", label: "Sem contrato" };
  if (vigente.vigencia_fim && vigente.vigencia_fim < hojeStr) {
    return { status: "vencido", label: "Contrato Vencido" };
  }
  return { status: "ativo", label: "Contrato Ativo" };
}

/** Valor efetivo de uma rubrica na data de hoje: a evolução salarial mais recente já aplicável
 * (data <= hoje) pra essa rubrica, ou o valor gravado no próprio contrato quando não há nenhuma —
 * mesmo princípio do Valor Total do contrato (calculado na hora de exibir, nunca gravado). Usado
 * tanto no `ContratoCard` quanto no cálculo do Financeiro. */
export function valorEfetivoRubrica(
  valorContrato: number,
  evolucoes: AtletaContratoEvolucaoSalarialRow[],
  rubrica: RubricaContrato,
  hojeStr: string,
): number {
  const aplicaveis = evolucoes
    .filter((e) => e.rubrica === rubrica && e.data_vigencia <= hojeStr)
    .sort((a, b) => (a.data_vigencia < b.data_vigencia ? 1 : -1));
  return aplicaveis[0]?.novo_valor ?? valorContrato;
}

export interface AvisoEvolucaoSalarial {
  rubricaLabel: string;
  novoValor: number;
  diasRestantes: number;
  data: string;
}

/** Evoluções salariais com data futura (ainda não aplicadas), mais próxima primeiro — vira o
 * aviso "Evolução salarial em N dias" na ficha do atleta. Escrita de um jeito reaproveitável (só
 * recebe uma lista de evoluções solta) pra o Dashboard geral poder chamar de novo mais tarde,
 * juntando de vários atletas de uma vez. */
export function evolucoesProximas(
  evolucoes: AtletaContratoEvolucaoSalarialRow[],
  hojeStr: string,
): AvisoEvolucaoSalarial[] {
  return evolucoes
    .filter((e) => e.data_vigencia > hojeStr)
    .map((e) => ({
      rubricaLabel: RUBRICA_CONTRATO_LABEL[e.rubrica] ?? e.rubrica,
      novoValor: e.novo_valor,
      diasRestantes: diasEntre(hojeStr, e.data_vigencia),
      data: e.data_vigencia,
    }))
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}
