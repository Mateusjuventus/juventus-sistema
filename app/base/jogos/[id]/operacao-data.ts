import { createClient } from "@/lib/supabase/server";
import type {
  AtletaBaseRow,
  ComissaoTecnicaBaseRow,
  ConvocacaoAtletaBaseRow,
  ConvocacaoBaseRow,
  ConvocacaoComissaoBaseRow,
  JogoBaseRow,
} from "@/lib/supabase/types";

/**
 * Espelha `app/jogos/[id]/operacao-data.ts` para o Futebol de Base — helper compartilhado pelas
 * abas de Rooming List e Ônibus (Credenciamento fica fora de escopo pro Futebol de Base, ver a
 * spec). Staff Operacional não participa da convocação — Recibo busca o staff ativo direto do
 * cadastro, sem depender de convocação.
 */
export interface ConvocadosJogoBase {
  jogo: JogoBaseRow;
  convocacao: ConvocacaoBaseRow | null;
  atletas: AtletaBaseRow[];
  comissao: ComissaoTecnicaBaseRow[];
}

export async function getJogoBaseEConvocados(jogoId: string): Promise<ConvocadosJogoBase | null> {
  const supabase = createClient();

  const [{ data: jogoData }, { data: convocacaoData }] = await Promise.all([
    supabase.from("jogos_base").select("*").eq("id", jogoId).single(),
    supabase.from("convocacoes_base").select("*").eq("jogo_id", jogoId).maybeSingle(),
  ]);

  if (!jogoData) return null;
  const jogo = jogoData as JogoBaseRow;
  const convocacao = convocacaoData as ConvocacaoBaseRow | null;

  if (!convocacao) return { jogo, convocacao: null, atletas: [], comissao: [] };

  const [{ data: caData }, { data: ccData }] = await Promise.all([
    supabase.from("convocacao_atletas_base").select("*").eq("convocacao_id", convocacao.id),
    supabase
      .from("convocacao_comissao_base")
      .select("*, pessoa:comissao_tecnica_base(*)")
      .eq("convocacao_id", convocacao.id),
  ]);

  const convocacaoAtletaIds = ((caData ?? []) as ConvocacaoAtletaBaseRow[]).map((c) => c.atleta_id);
  const comissao = ((ccData ?? []) as (ConvocacaoComissaoBaseRow & { pessoa: ComissaoTecnicaBaseRow | null })[])
    .map((c) => c.pessoa)
    .filter((p): p is ComissaoTecnicaBaseRow => Boolean(p));

  let atletas: AtletaBaseRow[] = [];
  if (convocacaoAtletaIds.length > 0) {
    const { data: atletasData } = await supabase.from("atletas_base").select("*").in("id", convocacaoAtletaIds);
    atletas = (atletasData ?? []) as AtletaBaseRow[];
  }

  return { jogo, convocacao, atletas, comissao };
}
