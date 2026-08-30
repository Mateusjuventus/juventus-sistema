"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasConvocacao } from "./permissoes";

/**
 * Server Action de Convocação do Futebol de Base — compartilhada entre `/base/jogos/[id]/
 * convocacao` e `/treinador/jogos/[id]/convocacao` (ver docs/superpowers/plans/2026-08-30-
 * treinador-programacao-plan.md, Fase 6). Morava só em `app/base/jogos/[id]/convocacao/actions.ts`
 * antes do treinador precisar chamá-la também; movida pra cá pra não duplicar a lógica de negócio, e
 * ganhou a checagem explícita de permissão que faltava (antes dependia só do middleware bloquear
 * `/base/*` de quem não tem o módulo Jogos — o que não cobre `/treinador/*`, que o middleware não
 * bloqueia por módulo).
 */
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

  const supabase = createClient();

  // Dupla checagem de permissão (mesmo padrão de `app/treinador/actions.ts`): a tela já filtra por
  // categoria, mas Server Actions são endpoints públicos e não devem confiar só na tela.
  const [categorias, { data: jogo }] = await Promise.all([
    getCategoriasConvocacao(supabase),
    supabase.from("jogos_base").select("categoria").eq("id", jogoId).maybeSingle(),
  ]);
  if (categorias.length === 0) return { error: "Você não tem permissão para fazer isso." };
  if (!jogo || !categorias.includes(jogo.categoria)) {
    return { error: "Você não tem permissão para convocar este jogo." };
  }

  const capitaoAtletaId = String(formData.get("capitaoAtletaId") ?? "") || null;

  const atletaStatus: { atletaId: string; status: "titular" | "reserva" }[] = [];
  const comissaoIds: string[] = [];
  // Número da camisa NESSA convocação (jogo) — só Base, a numeração não é fixa por atleta como no
  // Profissional (ver ConvocacaoAtletaBaseRow). Em branco vira `null`.
  const numeroCamisaPorAtleta = new Map<string, number | null>();

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("atleta_")) {
      if (value === "titular" || value === "reserva") {
        atletaStatus.push({ atletaId: key.slice("atleta_".length), status: value });
      }
    } else if (key.startsWith("camisa_")) {
      const atletaId = key.slice("camisa_".length);
      const numero = Number(value);
      numeroCamisaPorAtleta.set(atletaId, String(value).trim() && Number.isFinite(numero) ? numero : null);
    } else if (key.startsWith("comissao_")) {
      comissaoIds.push(key.slice("comissao_".length));
    }
  }

  if (capitaoAtletaId && !atletaStatus.some((a) => a.atletaId === capitaoAtletaId)) {
    return { error: "O capitão precisa ser um atleta marcado como titular ou reserva." };
  }

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
            numero_camisa: numeroCamisaPorAtleta.get(a.atletaId) ?? null,
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
  await Promise.all(inserts);

  revalidatePath(`/base/jogos/${jogoId}/convocacao`);
  revalidatePath(`/treinador/jogos/${jogoId}/convocacao`);
  return { success: true };
}
