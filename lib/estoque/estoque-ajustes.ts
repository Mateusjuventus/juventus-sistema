import type { createClient } from "@/lib/supabase/server";
import type { EstoqueCategoria, EstoqueItemRow } from "@/lib/supabase/types";

export interface AjusteEstoque {
  itemId: string;
  tamanho: string;
  /** Positivo = Entrada (soma), negativo = Saída (subtrai). */
  delta: number;
}

export interface PlanoAjusteEstoque {
  /** Quantidades já calculadas (por item), prontas pra gravar — ver gravarPlanoAjustes. */
  tamanhosPorItem: Map<string, Record<string, number>>;
  /** Itens originais (antes do ajuste), pra montar os "retratos" (nome/código) salvos na ficha. */
  itensPorId: Map<string, EstoqueItemRow>;
}

/**
 * Primeira fase de uma Entrada/Saída: confere se os ajustes de quantidade são possíveis (nenhum
 * tamanho pode ficar negativo) SEM gravar nada ainda — só lê o estoque atual e calcula em memória.
 * Isso permite montar a ficha (estoque_entradas/estoque_saidas + itens) só depois de confirmar que
 * o ajuste é válido, e só gravar a mudança de quantidade por último (ver gravarPlanoAjustes),
 * assim, se algo falhar no meio do caminho, o cenário mais provável é "ficha registrada mas
 * quantidade ainda não abatida" (fácil de perceber e corrigir) em vez de "quantidade abatida sem
 * nenhum registro do que aconteceu".
 */
export async function calcularAjustesEstoque(
  supabase: ReturnType<typeof createClient>,
  ajustes: AjusteEstoque[],
): Promise<{ error: string } | { plano: PlanoAjusteEstoque }> {
  if (ajustes.length === 0) return { error: "Adicione pelo menos um item." };

  const itemIds = Array.from(new Set(ajustes.map((a) => a.itemId)));
  const { data, error } = await supabase.from("estoque_itens").select("*").in("id", itemIds);
  if (error || !data) return { error: "Não foi possível conferir o estoque atual. Tente novamente." };

  const itens = data as EstoqueItemRow[];
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

/** Segunda fase: grava de fato as quantidades já calculadas por calcularAjustesEstoque. */
export async function gravarPlanoAjustes(
  supabase: ReturnType<typeof createClient>,
  plano: PlanoAjusteEstoque,
): Promise<string | null> {
  for (const [itemId, tamanhos] of plano.tamanhosPorItem) {
    const { error } = await supabase.from("estoque_itens").update({ tamanhos }).eq("id", itemId);
    if (error) return "A ficha foi registrada, mas houve um problema ao atualizar o estoque. Confira manualmente.";
  }
  return null;
}

/** Soma todas as quantidades (todos os tamanhos) de um item — usado pra mostrar o total por linha
 * e o total geral do estoque. */
export function totalItem(item: EstoqueItemRow): number {
  return Object.values(item.tamanhos ?? {}).reduce((soma, qtd) => soma + Number(qtd || 0), 0);
}

/** Próximo número de ficha (Entrada ou Saída), sequencial e independente por categoria — nunca
 * reaproveita números já usados naquela categoria. */
export async function proximoNumero(
  supabase: ReturnType<typeof createClient>,
  tabela: "estoque_saidas" | "estoque_entradas",
  categoria: EstoqueCategoria,
): Promise<number> {
  const { data } = await supabase
    .from(tabela)
    .select("numero")
    .eq("categoria", categoria)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (((data as { numero: number } | null)?.numero) ?? 0) + 1;
}
