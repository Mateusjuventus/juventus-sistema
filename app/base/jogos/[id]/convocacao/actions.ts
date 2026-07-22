"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Espelha `app/jogos/[id]/convocacao/actions.ts` para o Futebol de Base. */
export interface ConvocacaoFormState {
  error?: string;
  success?: boolean;
}

export async function saveConvocacaoBase(
  _prevState: ConvocacaoFormState,
  formData: FormData,
): Promise<ConvocacaoFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  if (!jogoId) return { error: "Jogo não identificado. Recarregue a página e tente novamente." };

  const capitaoAtletaId = String(formData.get("capitaoAtletaId") ?? "") || null;

  const atletaStatus: { atletaId: string; status: "titular" | "reserva" }[] = [];
  const comissaoIds: string[] = [];
  const staffIds: string[] = [];

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("atleta_")) {
      if (value === "titular" || value === "reserva") {
        atletaStatus.push({ atletaId: key.slice("atleta_".length), status: value });
      }
    } else if (key.startsWith("comissao_")) {
      comissaoIds.push(key.slice("comissao_".length));
    } else if (key.startsWith("staff_")) {
      staffIds.push(key.slice("staff_".length));
    }
  }

  if (capitaoAtletaId && !atletaStatus.some((a) => a.atletaId === capitaoAtletaId)) {
    return { error: "O capitão precisa ser um atleta marcado como titular ou reserva." };
  }

  const supabase = createClient();

  const { data: convocacao, error: convocacaoError } = await supabase
    .from("convocacoes_base")
    .upsert({ jogo_id: jogoId, capitao_atleta_id: capitaoAtletaId }, { onConflict: "jogo_id" })
    .select("id")
    .single();

  if (convocacaoError || !convocacao) {
    return { error: "Não foi possível salvar a convocação. Tente novamente." };
  }

  const convocacaoId = convocacao.id as string;

  await Promise.all([
    supabase.from("convocacao_atletas_base").delete().eq("convocacao_id", convocacaoId),
    supabase.from("convocacao_comissao_base").delete().eq("convocacao_id", convocacaoId),
    supabase.from("convocacao_staff_base").delete().eq("convocacao_id", convocacaoId),
  ]);

  const inserts: Promise<unknown>[] = [];
  if (atletaStatus.length > 0) {
    inserts.push(
      Promise.resolve(
        supabase.from("convocacao_atletas_base").insert(
          atletaStatus.map((a) => ({
            convocacao_id: convocacaoId,
            atleta_id: a.atletaId,
            status: a.status,
          })),
        ),
      ),
    );
  }
  if (comissaoIds.length > 0) {
    inserts.push(
      Promise.resolve(
        supabase.from("convocacao_comissao_base").insert(
          comissaoIds.map((id) => ({ convocacao_id: convocacaoId, comissao_id: id })),
        ),
      ),
    );
  }
  if (staffIds.length > 0) {
    inserts.push(
      Promise.resolve(
        supabase.from("convocacao_staff_base").insert(
          staffIds.map((id) => ({ convocacao_id: convocacaoId, staff_id: id })),
        ),
      ),
    );
  }
  await Promise.all(inserts);

  revalidatePath(`/base/jogos/${jogoId}/convocacao`);
  return { success: true };
}
