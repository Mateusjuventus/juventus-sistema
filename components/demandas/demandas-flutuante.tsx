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
 * 05/10 (pedido do Mateus: "quero que coloque um botão de demandas no meu também").
 *
 * O CONTEÚDO da lista muda por quem está vendo (ajuste de 05/10, depois do master ver a abinha
 * aparecer vazia na prática): uma pessoa comum vê só as PRÓPRIAS demandas (`responsavel_id =
 * usuário logado`) — igual sempre foi. O master vê, em vez disso, as demandas de quem ele marcou
 * pra acompanhar em `/usuarios` (mesma fonte do painel `/demandas`) — pedido explícito: "as
 * demandas pro master... ali devem aparecer as demandas de quem estava fazendo para eu
 * acompanhar", não uma lista vazia das próprias (ele raramente é o responsável por uma demanda) só
 * com o formulário de criar.
 */
export async function DemandasFlutuante() {
  const supabase = createClient();
  const [acompanhado, master] = await Promise.all([getDemandasAcompanhado(supabase), isMaster(supabase)]);
  if (!acompanhado && !master) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let demandas: DemandaRow[];
  if (master) {
    const { data: acompanhadosData } = await supabase.from("perfis").select("id").eq("demandas_acompanhado", true);
    const idsAcompanhados = (acompanhadosData ?? []).map((p) => p.id as string);
    if (idsAcompanhados.length === 0) {
      demandas = [];
    } else {
      const { data } = await supabase
        .from("demandas")
        .select("*")
        .in("responsavel_id", idsAcompanhados)
        .neq("status", "concluido")
        .order("prazo", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      demandas = (data ?? []) as DemandaRow[];
    }
  } else {
    const { data } = await supabase
      .from("demandas")
      .select("*")
      .eq("responsavel_id", user.id)
      .neq("status", "concluido")
      .order("prazo", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    demandas = (data ?? []) as DemandaRow[];
  }

  // Lista de "pra quem?" só existe pro master, e nunca inclui ele mesmo (já coberto por "Eu
  // mesmo" no form) — ver docs/superpowers/specs/2026-10-05-assistencia-social-e-demandas-
  // design.md, Parte 2 (adendo 05/10).
  const pessoas = master
    ? (await buscarPessoasAcompanhadasParaSelecao(supabase)).filter((p) => p.id !== user.id)
    : [];

  return (
    <DemandasFlutuantePainel demandas={demandas} hojeStr={hojeBrasilia()} pessoas={pessoas} modoAgregado={master} />
  );
}
