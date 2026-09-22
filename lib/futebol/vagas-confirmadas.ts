import type { createClient } from "@/lib/supabase/server";

/** "jogo_vagas_staff"/"jogo_vagas_staff_inscricoes" (Profissional) ou as tabelas equivalentes com
 * sufixo "_base". */
export interface TabelasVagasStaff {
  vagas: string;
  inscricoes: string;
}

/**
 * Quem está com vaga CONFIRMADA agora nesse jogo — consulta sempre fresca (nunca cacheada no
 * cliente), usada tanto pra sugerir o "Incluir" ao abrir a tela de Recibo (`page.tsx`) quanto, no
 * salvamento (`saveRecibo`/`saveReciboBase`), pra proteger quem confirmou vaga DEPOIS que a tela
 * foi carregada — ver o comentário em cima de `saveRecibo` em
 * `app/jogos/[id]/operacao-actions.ts` e docs/superpowers/specs/
 * 2026-09-12-recibo-automatico-vagas-design.md (seção "Limite conhecido", resolvida em 22/09).
 */
export async function staffComVagaConfirmada(
  supabase: ReturnType<typeof createClient>,
  tabelas: TabelasVagasStaff,
  jogoId: string,
): Promise<string[]> {
  const { data: vagasData } = await supabase.from(tabelas.vagas).select("id").eq("jogo_id", jogoId).maybeSingle();
  const vagasId = (vagasData as { id: string } | null)?.id ?? null;
  if (!vagasId) return [];

  const { data: inscricoesData } = await supabase
    .from(tabelas.inscricoes)
    .select("staff_id")
    .eq("vagas_id", vagasId)
    .eq("situacao", "confirmado");
  return ((inscricoesData ?? []) as { staff_id: string }[]).map((i) => i.staff_id);
}
