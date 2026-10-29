import type { AtletaStatus } from "@/lib/supabase/types";

/**
 * Sub-área Fisioterapia do módulo Departamento Médico (Futebol de Base) — ver
 * docs/superpowers/specs/2026-10-06-fisioterapia-base-design.md. `diasAfastados`,
 * `montarResumoGeralFisioterapia`, `fisioterapiaTipoLabel` e `FISIOTERAPIA_TIPO_OPTIONS`
 * (`lib/futebol/fisioterapia.ts`) são reaproveitadas sem duplicar aqui. Desde a unificação de
 * Atletas (28/10/2026) o status é o mesmo `AtletaStatus` do Profissional — mantido como função
 * própria (`...Base`) só pelo nome, que os consumidores da Base já usam.
 */

/** Mesma lógica de `statusFisioterapiaAtleta` (Profissional) — sempre uma função do estado ATUAL
 * das lesões desse atleta depois da gravação, nunca do que o status era antes. Nunca devolve
 * "transicao"/"dispensado": esses dois só entram por lançamento manual na linha do tempo, nunca
 * pela sincronização automática. */
export function statusFisioterapiaAtletaBase(temLesaoAtiva: boolean): AtletaStatus {
  return temLesaoAtiva ? "departamento_medico" : "liberado";
}
