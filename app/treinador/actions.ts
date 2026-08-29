"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { parecerCaptacaoSchema } from "@/lib/validation/schemas";
import { hojeBrasilia } from "@/lib/data-brasil";
import { payloadMudancaStatusCaptacao, type CaptacaoStatusDecidido } from "@/lib/futebol/captacao";
import { autoAssinarComoCreator } from "@/lib/assinaturas/actions";
import { notificarSignerConfiguravel } from "@/lib/notificacoes/actions";
import type { ConfiguracaoParecerCaptacaoBaseRow } from "@/lib/supabase/types";

/**
 * Server Action do Treinador (ver docs/superpowers/specs/2026-08-19-parecer-final-treinador-
 * design.md) — preenche o Parecer Final de Avaliação de um candidato: as 4 notas, os comentários e
 * o veredito (Aprovado/Dispensado). Ao salvar, o `status` do candidato muda sozinho pro veredito
 * escolhido, com a MESMA regra de carimbar `data_termino` que `mudarStatusCaptacao`
 * (app/base/captacao/actions.ts) já usa — daí a extração de `payloadMudancaStatusCaptacao`
 * (lib/futebol/captacao.ts), compartilhada pelas duas Server Actions.
 */

export interface ParecerFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

export async function salvarParecerCaptacao(
  candidatoId: string,
  _prevState: ParecerFormState,
  formData: FormData,
): Promise<ParecerFormState> {
  const supabase = createClient();

  // Dupla checagem de permissão: `getCategoriasTreinador` já só devolve algo não-vazio pra quem
  // está logado com role "treinador" — cobre tanto "não é treinador" quanto "é treinador mas sem
  // nenhuma categoria liberada ainda" (não deveria poder fazer nada de qualquer forma). A checagem
  // de qual categoria especificamente vem depois, contra o candidato de verdade — a tela já filtra
  // por categoria, mas Server Actions são endpoints públicos e não devem confiar só na tela.
  const categorias = await getCategoriasTreinador(supabase);
  if (categorias.length === 0) return { error: "Você não tem permissão para fazer isso." };

  const raw = {
    notaTecnica: String(formData.get("notaTecnica") ?? ""),
    notaFisica: String(formData.get("notaFisica") ?? ""),
    notaTatica: String(formData.get("notaTatica") ?? ""),
    notaComportamental: String(formData.get("notaComportamental") ?? ""),
    comentarios: String(formData.get("comentarios") ?? ""),
    veredito: String(formData.get("veredito") ?? ""),
  };
  const result = parecerCaptacaoSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const { data: candidato } = await supabase
    .from("captacao_base")
    .select("categoria, status, data_termino, nome_completo, numero")
    .eq("id", candidatoId)
    .maybeSingle();
  if (!candidato || candidato.status !== "avaliacao") {
    return { error: "Este candidato não está mais disponível pra avaliação." };
  }
  if (!candidato.categoria || !categorias.includes(candidato.categoria)) {
    return { error: "Você não tem permissão para avaliar este candidato." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const data = result.data;
  const statusPayload = payloadMudancaStatusCaptacao(
    data.veredito as CaptacaoStatusDecidido,
    candidato.data_termino,
    hojeBrasilia(),
  );

  const { error } = await supabase
    .from("captacao_base")
    .update({
      nota_tecnica: data.notaTecnica,
      nota_fisica: data.notaFisica,
      nota_tatica: data.notaTatica,
      nota_comportamental: data.notaComportamental,
      parecer_comentarios: data.comentarios || null,
      parecer_preenchido_em: new Date().toISOString(),
      parecer_preenchido_por: user.id,
      ...statusPayload,
    })
    .eq("id", candidatoId);
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  // O parecer acabou de ser decidido (aprovado/dispensado/não compareceu) — a partir daqui o bloco
  // de assinatura fica visível na tela (ver app/base/captacao/[id]/page.tsx). A linha marcada
  // "ehTreinador" assina sozinha agora, com quem realmente enviou (não precisa vincular ninguém
  // antes — varia por categoria); as outras linhas configuradas são avisadas (sino + push).
  await assinarComoTreinadorEAvisarDemais(supabase, candidatoId, user.id, candidato.nome_completo, candidato.numero);

  revalidatePath("/treinador");
  revalidatePath("/base/captacao");
  revalidatePath(`/base/captacao/${candidatoId}`);
  redirect("/treinador");
}

/** Best-effort — nunca derruba o salvamento do parecer em si. */
async function assinarComoTreinadorEAvisarDemais(
  supabase: ReturnType<typeof createClient>,
  candidatoId: string,
  treinadorId: string,
  nomeCompleto: string,
  numero: number,
): Promise<void> {
  const { data: configData } = await supabase
    .from("configuracoes_parecer_captacao_base")
    .select("assinaturas")
    .limit(1)
    .maybeSingle();
  const config = configData as Pick<ConfiguracaoParecerCaptacaoBaseRow, "assinaturas"> | null;
  const assinaturas = (config?.assinaturas ?? []).filter((a) => a.nome.trim());

  await Promise.all(
    assinaturas.map((a) =>
      a.ehTreinador
        ? autoAssinarComoCreator("parecer_captacao_base", candidatoId, a.id, treinadorId)
        : notificarSignerConfiguravel({
            usuarioVinculado: a.usuarioId,
            tipo: "assinatura_pendente",
            mensagem: `Parecer Final — ${nomeCompleto} (Nº ${numero}) está esperando sua assinatura.`,
            link: `/base/captacao/${candidatoId}`,
          }),
    ),
  );
}
