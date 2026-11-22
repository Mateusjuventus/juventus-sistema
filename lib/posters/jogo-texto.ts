import type { JogoRow } from "@/lib/supabase/types";
import { clube } from "@/lib/clube";

/**
 * Textos derivados do jogo, reaproveitados por mais de um pôster — ex: "PALMEIRAS X JUVENTUS"
 * aparece no Relacionados e também na linha de confronto do Dia de Jogo (quando marcada como
 * `eh_confronto`). Segue a mesma regra de mandante já usada em Convocação: jogo em casa, Juventus
 * primeiro; jogo fora, adversário primeiro.
 */
export function buildConfrontoTexto(jogo: Pick<JogoRow, "mandante" | "adversario_nome">): string {
  const primeiro = jogo.mandante ? clube.nomeCurto.toLocaleUpperCase("pt-BR") : jogo.adversario_nome.toUpperCase();
  const segundo = jogo.mandante ? jogo.adversario_nome.toUpperCase() : clube.nomeCurto.toLocaleUpperCase("pt-BR");
  return `${primeiro} X ${segundo}`;
}
