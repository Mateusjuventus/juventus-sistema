import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type { JogoProgramacaoItemRow, JogoRow } from "@/lib/supabase/types";
import { diaDaSemana } from "./relacionados-data";
import type { ItemProgramacaoTexto } from "./programacao-item";

export interface ConcentracaoData {
  jogo: JogoRow;
  adversarioLogoUrl: string | null;
  dataFaixaTexto: string;
  itens: ItemProgramacaoTexto[];
  regras: string[];
}

/** "06/05 - QUARTA-FEIRA" — dia/mês (sem ano) e dia da semana, igual à referência do Mateus. */
export function formatDataFaixa(dataIso: string): string {
  const [, mes, dia] = dataIso.split("-");
  return `${dia}/${mes} - ${diaDaSemana(dataIso).toUpperCase()}`;
}

/**
 * Busca tudo que o pôster de Concentração precisa. Devolve `null` quando o jogo não existe, ainda
 * não tem a data de concentração preenchida, ou ainda não tem nenhuma linha de cronograma — mesma
 * regra de habilitação usada na aba Programação (`app/jogos/[id]/programacao/page.tsx`).
 */
export async function buildConcentracaoData(jogoId: string): Promise<ConcentracaoData | null> {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos").select("*").eq("id", jogoId).single();
  if (!jogoData) return null;
  const jogo = jogoData as JogoRow;
  if (!jogo.concentracao_data) return null;

  const [{ data: itensData }, adversarioLogoUrl] = await Promise.all([
    supabase
      .from("jogo_programacao_itens")
      .select("*")
      .eq("jogo_id", jogoId)
      .eq("tipo", "concentracao")
      .order("ordem", { ascending: true }),
    getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
  ]);

  const itensRaw = (itensData ?? []) as JogoProgramacaoItemRow[];
  if (itensRaw.length === 0) return null;

  const itens: ItemProgramacaoTexto[] = itensRaw.map((item) => ({
    horario: item.horario,
    atividade: item.atividade,
    local: item.local,
  }));

  const regras = jogo.concentracao_regras
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);

  return {
    jogo,
    adversarioLogoUrl,
    dataFaixaTexto: formatDataFaixa(jogo.concentracao_data),
    itens,
    regras,
  };
}
