"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { relatorioDispensaSchema } from "@/lib/validation/schemas";
import { autoAssinarComoCreator, buscarAssinaturas } from "@/lib/assinaturas/actions";
import { criarNotificacao } from "@/lib/notificacoes/actions";
import type { RelatorioDispensaFormState } from "@/components/relatorio-dispensa-form";

/**
 * Server Action do Relatório de Dispensa preenchido pelo cadastro interno (ver docs/superpowers/
 * specs/2026-08-25-classificacao-dispensa-atleta-base-design.md, seção 3) — diferente da versão do
 * Treinador (`app/treinador/atletas/[id]/dispensa/actions.ts`): o Mateus pode gerar pela primeira
 * vez OU editar/gerar de novo um relatório que já existe (do treinador ou dele mesmo), sem
 * restrição de categoria nem de "já foi salvo antes". Ao salvar, o atleta passa pro status
 * "Dispensado" — só em `atletas_base`.
 */
export async function salvarRelatorioDispensaAdmin(
  atletaId: string,
  categoria: string,
  _prevState: RelatorioDispensaFormState,
  formData: FormData,
): Promise<RelatorioDispensaFormState> {
  const supabase = createClient();

  const raw = {
    dispensaData: String(formData.get("dispensaData") ?? ""),
    motivo: String(formData.get("motivo") ?? ""),
    notaTecnica: String(formData.get("notaTecnica") ?? ""),
    notaFisica: String(formData.get("notaFisica") ?? ""),
    notaTatica: String(formData.get("notaTatica") ?? ""),
    notaComportamental: String(formData.get("notaComportamental") ?? ""),
  };
  const result = relatorioDispensaSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const data = result.data;
  const { data: atletaAtualizado, error } = await supabase
    .from("atletas_base")
    .update({
      status: "dispensado",
      dispensa_data: data.dispensaData,
      dispensa_motivo: data.motivo,
      dispensa_nota_tecnica: data.notaTecnica,
      dispensa_nota_fisica: data.notaFisica,
      dispensa_nota_tatica: data.notaTatica,
      dispensa_nota_comportamental: data.notaComportamental,
      dispensado_por: user.id,
      dispensado_em: new Date().toISOString(),
    })
    .eq("id", atletaId)
    .select("nome_completo")
    .single();
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  // Quem preenche por aqui é sempre alguém do Departamento — auto-assina esse papel (ver
  // docs/superpowers/specs/2026-08-28-assinatura-digital-notificacoes-design.md); o papel
  // "treinador" fica como estava (pendente, ou já assinado antes, se foi ele quem gerou primeiro).
  await autoAssinarComoCreator("dispensa_base", atletaId, "departamento", user.id);

  // Fase 3 — antes disso ninguém avisava o Treinador quando é o Departamento quem gera o relatório
  // primeiro. Só avisa se o papel "treinador" ainda estiver pendente (senão ele já assinou antes,
  // sendo ele quem gerou primeiro, e não faz sentido reavisar).
  const jaAssinado = (await buscarAssinaturas("dispensa_base", atletaId)).some((a) => a.papel === "treinador");
  if (!jaAssinado) {
    const { data: treinadores } = await supabase
      .from("perfis")
      .select("id")
      .eq("role", "treinador")
      .contains("categorias_treinador", [categoria]);
    await Promise.all(
      (treinadores ?? []).map((t) =>
        criarNotificacao({
          usuarioId: t.id,
          tipo: "assinatura_pendente",
          mensagem: `Relatório de Dispensa de ${atletaAtualizado?.nome_completo ?? "um atleta"} está esperando sua assinatura.`,
          link: `/treinador/atletas/${atletaId}/dispensa`,
        }),
      ),
    );
  }

  revalidatePath(`/base/atletas/${categoria}`);
  revalidatePath(`/base/atletas/${categoria}/${atletaId}/ver`);
  revalidatePath("/base/atletas/campograma");
  redirect(`/base/atletas/${categoria}/${atletaId}/ver`);
}
