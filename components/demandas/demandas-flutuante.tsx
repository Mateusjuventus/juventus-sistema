import { createClient } from "@/lib/supabase/server";
import { getDemandasAcompanhado, isMaster } from "@/lib/auth/role";
import { buscarPessoasAcompanhadasParaSelecao } from "@/lib/auth/perfis";
import { hojeBrasilia } from "@/lib/data-brasil";
import type { DemandaRow } from "@/lib/supabase/types";
import { DemandasFlutuantePainel } from "./demandas-flutuante-painel";

/**
 * Ponto de entrada do painel flutuante de Demandas — auto-suficiente (resolve a própria permissão
 * e os próprios dados), igual o antigo `MinhasDemandasWidget` que substitui: `AppShell` só precisa
 * inserir `<DemandasFlutuante />` uma vez, sem mudar o resto de cada página. Gate de sempre
 * (`demandas_acompanhado`, ver `/usuarios`) OU master — essa segunda parte foi acrescentada em
 * 05/10 (pedido do Mateus: "quero que coloque um botão de demandas no meu também"): sem ela, o
 * master só via a abinha se tivesse marcado A SI MESMO como acompanhado, mesmo sendo ele quem
 * precisa dela pra criar/atribuir demandas pros outros — a única parte que fica vazia pra um
 * master não-acompanhado é a lista "minhas demandas" em si (ele não tem nenhuma).
 */
export async function DemandasFlutuante() {
  const supabase = createClient();
  const [acompanhado, master] = await Promise.all([getDemandasAcompanhado(supabase), isMaster(supabase)]);
  if (!acompanhado && !master) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("demandas")
    .select("*")
    .eq("responsavel_id", user.id)
    .neq("status", "concluido")
    .order("prazo", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  const demandas = (data ?? []) as DemandaRow[];

  // Lista de "pra quem?" só existe pro master, e nunca inclui ele mesmo (já coberto por "Eu
  // mesmo" no form) — ver docs/superpowers/specs/2026-10-05-assistencia-social-e-demandas-
  // design.md, Parte 2 (adendo 05/10).
  const pessoas = master
    ? (await buscarPessoasAcompanhadasParaSelecao(supabase)).filter((p) => p.id !== user.id)
    : [];

  return <DemandasFlutuantePainel demandas={demandas} hojeStr={hojeBrasilia()} pessoas={pessoas} />;
}
