import { adicionarDias } from "@/lib/futebol/calendario";
import type { DemandaRow } from "@/lib/supabase/types";

/**
 * As 5 métricas do card de cada pessoa no Painel de Demandas do master (ver docs/superpowers/
 * specs/2026-10-05-assistencia-social-e-demandas-design.md, Parte 2, "Painel do Mateus"). Função
 * pura (sem Supabase) — recebe as demandas já buscadas e a data de hoje, só calcula.
 */
export interface RendimentoDemandas {
  /** % concluído hoje: das demandas com prazo até hoje (inclui atrasadas), quantas estão
   * concluídas. `null` quando não há nenhuma demanda com prazo até hoje (nada a dividir). */
  percentualHoje: number | null;
  /** Mesmo cálculo, olhando as demandas com prazo nos últimos 7 dias (hoje incluído). */
  percentualSemana: number | null;
  /** Contagem de status ≠ concluído, independente do prazo. */
  pendentes: number;
  /** Contagem de status ≠ concluído com prazo no passado. */
  atrasadas: number;
  /** Contagem de concluídas nos últimos 30 dias — não o total histórico, pra não virar um número
   * que só cresce. Usa `updated_at` como data de conclusão (o schema não tem um campo
   * `concluido_em` separado — é a melhor aproximação disponível: o `updated_at` muda exatamente no
   * momento em que o status vira "concluido", via `DemandaStatusSelect`). */
  concluidasUltimos30Dias: number;
}

function percentualConcluidas(demandas: DemandaRow[]): number | null {
  if (demandas.length === 0) return null;
  const concluidas = demandas.filter((d) => d.status === "concluido").length;
  return Math.round((concluidas / demandas.length) * 100);
}

export function calcularRendimento(demandas: DemandaRow[], hojeStr: string): RendimentoDemandas {
  const comPrazoAteHoje = demandas.filter((d) => d.prazo !== null && d.prazo <= hojeStr);
  const seteDiasAtras = adicionarDias(hojeStr, -6);
  const comPrazoNaSemana = demandas.filter(
    (d) => d.prazo !== null && d.prazo >= seteDiasAtras && d.prazo <= hojeStr,
  );
  const trintaDiasAtrasIso = `${adicionarDias(hojeStr, -30)}T00:00:00.000Z`;

  return {
    percentualHoje: percentualConcluidas(comPrazoAteHoje),
    percentualSemana: percentualConcluidas(comPrazoNaSemana),
    pendentes: demandas.filter((d) => d.status !== "concluido").length,
    atrasadas: demandas.filter((d) => d.status !== "concluido" && d.prazo !== null && d.prazo < hojeStr).length,
    concluidasUltimos30Dias: demandas.filter(
      (d) => d.status === "concluido" && d.updated_at >= trintaDiasAtrasIso,
    ).length,
  };
}
