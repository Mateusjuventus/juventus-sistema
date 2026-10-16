"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nomeDaContaAtual } from "@/lib/auth/perfis";
import { atletaBaseContratoSchema } from "@/lib/validation/schemas";
import type { ContratoFormState } from "@/components/contrato-form";

function parseForm(formData: FormData) {
  const raw = {
    tipoContrato: String(formData.get("tipoContrato") ?? ""),
    clubeOrigem: String(formData.get("clubeOrigem") ?? ""),
    vigenciaInicio: String(formData.get("vigenciaInicio") ?? ""),
    vigenciaFim: String(formData.get("vigenciaFim") ?? ""),
    salarioCtps: String(formData.get("salarioCtps") ?? "0"),
    direitoImagem: String(formData.get("direitoImagem") ?? "0"),
    bonificacao: String(formData.get("bonificacao") ?? "0"),
    auxilioMoradia: String(formData.get("auxilioMoradia") ?? "0"),
    outros: String(formData.get("outros") ?? "0"),
  };

  const result = atletaBaseContratoSchema.safeParse(raw);
  return { raw, result };
}

/** Espelha `app/atletas/[id]/contrato/actions.ts` para o Futebol de Base — chama
 * `criar_contrato_atleta_base` (ver supabase/migrations/0137_atleta_contrato.sql). */
export async function criarContratoBase(
  _prevState: ContratoFormState,
  formData: FormData,
): Promise<ContratoFormState> {
  const atletaId = String(formData.get("atletaId") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  if (!atletaId || !categoria) {
    return { error: "Atleta não identificado. Recarregue a página e tente novamente." };
  }

  const { raw, result } = parseForm(formData);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nomeAtual = await nomeDaContaAtual(supabase);

  const data = result.data;
  const { error } = await supabase.rpc("criar_contrato_atleta_base", {
    p_atleta_id: atletaId,
    p_tipo_contrato: data.tipoContrato,
    p_clube_origem: data.clubeOrigem || null,
    p_vigencia_inicio: data.vigenciaInicio || null,
    p_vigencia_fim: data.vigenciaFim || null,
    p_salario_ctps: data.salarioCtps,
    p_direito_imagem: data.direitoImagem,
    p_bonificacao: data.bonificacao,
    p_auxilio_moradia: data.auxilioMoradia,
    p_outros: data.outros,
    p_criado_por_perfil_id: user?.id ?? null,
    p_criado_por_nome: nomeAtual,
  });

  if (error) return { error: "Não foi possível salvar o contrato. Tente novamente.", values: raw };

  revalidatePath(`/base/atletas/${categoria}/${atletaId}/contrato`);
  revalidatePath(`/base/atletas/${categoria}`);
  redirect(`/base/atletas/${categoria}/${atletaId}/contrato`);
}
