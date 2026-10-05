import { diasEntre } from "@/lib/futebol/calendario";
import type { DemandaStatus } from "@/lib/supabase/types";

export type CorPrazoDemanda = "verde" | "laranja" | "vermelho";

/**
 * Cor de urgência de uma demanda pelo prazo — pedido do Mateus em 05/10: "Verde quando está no
 * prazo, Laranja quando está próximo, vermelho quando está atrasado". `null` quando não tem prazo
 * cadastrado ou já está concluída (nos dois casos não existe urgência pra mostrar).
 *
 * "Próximo" (laranja) = hoje ou amanhã. Mesmo raciocínio simples já usado pro Mural
 * (`urgenciaPorDias` em `lib/futebol/calendario.ts`, que usa 2 dias pra "urgente"), só que com 1
 * dia — valor combinado direto com o Mateus. Fica isolado numa função só pra, se um dia o critério
 * precisar variar com o tamanho do prazo em vez de um número fixo de dias (o Mateus cogitou algo
 * assim: "vai depender muito do prazo"), só esta função precisar mudar.
 */
export function corPrazoDemanda(
  prazo: string | null,
  status: DemandaStatus,
  hojeStr: string,
): CorPrazoDemanda | null {
  if (!prazo || status === "concluido") return null;
  const diasRestantes = diasEntre(hojeStr, prazo);
  if (diasRestantes < 0) return "vermelho";
  if (diasRestantes <= 1) return "laranja";
  return "verde";
}
