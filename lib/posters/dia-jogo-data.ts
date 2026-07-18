import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type { JogoProgramacaoItemRow, JogoRow } from "@/lib/supabase/types";
import { buildConfrontoTexto } from "./jogo-texto";
import { formatDataFaixa } from "./concentracao-data";
import type { ItemProgramacaoTexto } from "./programacao-item";

export interface DiaJogoData {
  jogo: JogoRow;
  adversarioLogoUrl: string | null;
  dataFaixaTexto: string;
  itens: ItemProgramacaoTexto[];
  liberacaoTexto: string | null;
}

/**
 * Busca tudo que o pôster de Dia de Jogo precisa. A data usada é sempre `jogos.data_jogo` (não há
 * campo de data separado, ver spec). Devolve `null` quando o jogo não existe ou ainda não tem
 * nenhuma linha de cronograma cadastrada. A linha marcada como `eh_confronto` tem sua `atividade`
 * substituída aqui pelo texto do confronto (ex: "JUVENTUS X FERROVIÁRIA"), calculado a partir do
 * adversário/mandante do jogo — o mesmo texto usado no pôster de Relacionados.
 */
export async function buildDiaJogoData(jogoId: string): Promise<DiaJogoData | null> {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos").select("*").eq("id", jogoId).single();
  if (!jogoData) return null;
  const jogo = jogoData as JogoRow;

  const [{ data: itensData }, adversarioLogoUrl] = await Promise.all([
    supabase
      .from("jogo_programacao_itens")
      .select("*")
      .eq("jogo_id", jogoId)
      .eq("tipo", "dia_jogo")
      .order("ordem", { ascending: true }),
    getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
  ]);

  const itensRaw = (itensData ?? []) as JogoProgramacaoItemRow[];
  if (itensRaw.length === 0) return null;

  const confrontoTexto = buildConfrontoTexto(jogo);
  const itens: ItemProgramacaoTexto[] = itensRaw.map((item) => ({
    horario: item.horario,
    atividade: item.eh_confronto ? confrontoTexto : item.atividade,
    local: item.local,
  }));

  return {
    jogo,
    adversarioLogoUrl,
    dataFaixaTexto: formatDataFaixa(jogo.data_jogo),
    itens,
    liberacaoTexto: jogo.dia_jogo_liberacao,
  };
}
