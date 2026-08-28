"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { relatorioDispensaSchema } from "@/lib/validation/schemas";
import { autoAssinarComoCreator } from "@/lib/assinaturas/actions";
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
  const { error } = await supabase
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
    .eq("id", atletaId);
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  // Quem preenche por aqui é sempre alguém do Departamento — auto-assina esse papel (ver
  // docs/superpowers/specs/2026-08-28-assinatura-digital-notificacoes-design.md); o papel
  // "treinador" fica como estava (pendente, ou já assinado antes, se foi ele quem gerou primeiro).
  await autoAssinarComoCreator("dispensa_base", atletaId, "departamento", user.id);

  revalidatePath(`/base/atletas/${categoria}`);
  revalidatePath(`/base/atletas/${categoria}/${atletaId}/ver`);
  revalidatePath("/base/atletas/campograma");
  redirect(`/base/atletas/${categoria}/${atletaId}/ver`);
}
