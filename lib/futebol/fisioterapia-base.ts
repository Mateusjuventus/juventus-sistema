import type { AtletaBaseStatus } from "@/lib/supabase/types";

/**
 * Sub-área Fisioterapia do módulo Departamento Médico (Futebol de Base) — ver
 * docs/superpowers/specs/2026-10-06-fisioterapia-base-design.md. `diasAfastados`,
 * `montarResumoGeralFisioterapia`, `fisioterapiaTipoLabel` e `FISIOTERAPIA_TIPO_OPTIONS`
 * (`lib/futebol/fisioterapia.ts`) são reaproveitadas sem duplicar aqui — não dependem de nenhum
 * tipo específico do Profissional. Só o cálculo de status precisa de uma versão própria, porque o
 * tipo de retorno (`AtletaBaseStatus`) é diferente de `AtletaStatus`.
 */

/** Mesma lógica de `statusFisioterapiaAtleta` (Profissional), só que devolvendo um
 * `AtletaBaseStatus` — sempre uma função do estado ATUAL das lesões desse atleta depois da
 * gravação, nunca do que o status era antes. Nunca devolve "suspenso"/"dispensado": esses dois só
 * entram por lançamento manual na linha do tempo, nunca pela sincronização automática. */
export function statusFisioterapiaAtletaBase(temLesaoAtiva: boolean): AtletaBaseStatus {
  return temLesaoAtiva ? "departamento_medico" : "liberado";
}
