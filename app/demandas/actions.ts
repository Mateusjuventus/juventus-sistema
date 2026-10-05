"use server";

import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import type { DemandaRow } from "@/lib/supabase/types";

/**
 * Todas as demandas de uma pessoa acompanhada, buscadas sob demanda pelo `PessoaDemandasModal`
 * (tela intermediária aberta ao clicar numa pessoa em `/demandas`) — mesmo espírito de
 * `buscarHistoricoStatus` em app/departamento-medico/fisioterapia/[atletaId]/actions.ts, que também
 * alimenta um modal em vez de vir pré-carregado em cada card da listagem. Só master pode chamar;
 * não precisa confirmar de novo que `perfilId` está marcado "Acompanhar no painel de Demandas" —
 * mostrar as demandas de qualquer perfil pra quem já é master não é um problema de permissão.
 */
export async function buscarDemandasDaPessoa(perfilId: string): Promise<DemandaRow[]> {
  const supabase = createClient();
  const master = await isMaster(supabase);
  if (!master) return [];

  const { data } = await supabase.from("demandas").select("*").eq("responsavel_id", perfilId);
  return (data ?? []) as DemandaRow[];
}
