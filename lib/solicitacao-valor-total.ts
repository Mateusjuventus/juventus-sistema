import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Em Pagamento/Reembolso, o campo "valor" da solicitação é sempre a soma dos valores dos itens —
 * recalculado toda vez que um item é adicionado (ver salvarItensInline em
 * app/solicitacoes/actions.ts) ou removido (ver deleteSolicitacaoItem em
 * app/solicitacoes/[id]/itens/actions.ts), pra nunca ficar desatualizado.
 */
export async function recalcularValorTotal(supabase: SupabaseClient, solicitacaoId: string): Promise<void> {
  const { data } = await supabase.from("solicitacao_itens").select("valor").eq("solicitacao_id", solicitacaoId);
  const soma = (data ?? []).reduce((acc: number, row: { valor: number | null }) => acc + (Number(row.valor) || 0), 0);
  await supabase
    .from("solicitacoes")
    .update({ valor: soma > 0 ? soma : null })
    .eq("id", solicitacaoId);
}

/** Espelha `recalcularValorTotal` para o Futebol de Base (`solicitacoes_base`/`solicitacao_itens_base`). */
export async function recalcularValorTotalBase(supabase: SupabaseClient, solicitacaoId: string): Promise<void> {
  const { data } = await supabase.from("solicitacao_itens_base").select("valor").eq("solicitacao_id", solicitacaoId);
  const soma = (data ?? []).reduce((acc: number, row: { valor: number | null }) => acc + (Number(row.valor) || 0), 0);
  await supabase
    .from("solicitacoes_base")
    .update({ valor: soma > 0 ? soma : null })
    .eq("id", solicitacaoId);
}
