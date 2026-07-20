import type { createClient } from "@/lib/supabase/server";
import type { EstoqueItemBaseRow } from "@/lib/supabase/types";
import type { AjusteEstoque } from "./estoque-ajustes";

export interface PlanoAjusteEstoqueBase {
  tamanhosPorItem: Map<string, Record<string, number>>;
  itensPorId: Map<string, EstoqueItemBaseRow>;
}

/**
 * Espelha `calcularAjustesEstoque`/`gravarPlanoAjustes` (./estoque-ajustes.ts) para o Futebol de
 * Base — mesma lógica de duas fases (calcular sem gravar, depois gravar), mas contra
 * `estoque_itens_base` em vez de `estoque_itens`. Como o Estoque do Base não tem a bifurcação
 * Esportivo/Médico (é uma lista só, sem coluna `categoria`), não recebe nem precisa de nenhum
 * parâmetro de categoria.
 */
export async function calcularAjustesEstoqueBase(
  supabase: ReturnType<typeof createClient>,
  ajustes: AjusteEstoque[],
): Promise<{ error: string } | { plano: PlanoAjusteEstoqueBase }> {
  if (ajustes.length === 0) return { error: "Adicione pelo menos um item." };

  const itemIds = Array.from(new Set(ajustes.map((a) => a.itemId)));
  const { data, error } = await supabase.from("estoque_itens_base").select("*").in("id", itemIds);
  if (error || !data) return { error: "Não foi possível conferir o estoque atual. Tente novamente." };

  const itens = data as EstoqueItemBaseRow[];
  const itensPorId = new Map(itens.map((item) => [item.id, item]));

  const tamanhosPorItem = new Map<string, Record<string, number>>();
  for (const item of itens) {
    tamanhosPorItem.set(item.id, { ...(item.tamanhos ?? {}) });
  }

  for (const ajuste of ajustes) {
    const item = itensPorId.get(ajuste.itemId);
    if (!item) return { error: "Um dos itens selecionados não foi encontrado no estoque." };
    const tamanhos = tamanhosPorItem.get(ajuste.itemId)!;
    const atual = Number(tamanhos[ajuste.tamanho] ?? 0);
    const novo = atual + ajuste.delta;
    if (novo < 0) {
      return { error: `Estoque insuficiente de "${item.nome}" (${ajuste.tamanho}): disponível ${atual}.` };
    }
    tamanhos[ajuste.tamanho] = novo;
  }

  return { plano: { tamanhosPorItem, itensPorId } };
}

export async function gravarPlanoAjustesBase(
  supabase: ReturnType<typeof createClient>,
  plano: PlanoAjusteEstoqueBase,
): Promise<string | null> {
  for (const [itemId, tamanhos] of plano.tamanhosPorItem) {
    const { error } = await supabase.from("estoque_itens_base").update({ tamanhos }).eq("id", itemId);
    if (error) return "A ficha foi registrada, mas houve um problema ao atualizar o estoque. Confira manualmente.";
  }
  return null;
}

/** Próximo número de ficha (Entrada ou Saída) do Base — sequencial, mas SEM corte por categoria
 * (diferente de `proximoNumero` do Profissional), já que aqui é uma lista só. */
export async function proximoNumeroBase(
  supabase: ReturnType<typeof createClient>,
  tabela: "estoque_saidas_base" | "estoque_entradas_base",
): Promise<number> {
  const { data } = await supabase
    .from(tabela)
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (((data as { numero: number } | null)?.numero) ?? 0) + 1;
}
