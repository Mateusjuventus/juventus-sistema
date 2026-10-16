"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nomeDaContaAtual } from "@/lib/auth/perfis";
import { atletaContratoSchema } from "@/lib/validation/schemas";
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

  const result = atletaContratoSchema.safeParse(raw);
  return { raw, result };
}

/**
 * "Novo contrato" (aba Contrato) — chama a função de banco `criar_contrato_atleta`
 * (ver supabase/migrations/0137_atleta_contrato.sql), que encerra o contrato vigente atual (se
 * existir) e insere este como o novo vigente numa operação atômica só, e sincroniza
 * `tipo_contrato`/`data_fim_contrato` de volta em `atletas` (continuam lidos direto por
 * `AtletasResumoFiltros`, ver `app/atletas/page.tsx`). Ver docs/superpowers/specs/
 * 2026-10-16-atleta-dados-esportivos-contrato-design.md.
 */
export async function criarContrato(
  _prevState: ContratoFormState,
  formData: FormData,
): Promise<ContratoFormState> {
  const atletaId = String(formData.get("atletaId") ?? "");
  if (!atletaId) return { error: "Atleta não identificado. Recarregue a página e tente novamente." };

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
  const { error } = await supabase.rpc("criar_contrato_atleta", {
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

  // Contrato não é mais uma aba própria (ver `components/contrato-secao.tsx`) — volta pra tela de
  // onde "Novo contrato" foi clicado (Ver atleta ou Editar atleta), não pra uma página fixa.
  const origem = String(formData.get("origem") ?? "") === "editar" ? "editar" : "ver";
  const destino = origem === "editar" ? `/atletas/${atletaId}` : `/atletas/${atletaId}/ver`;

  revalidatePath(`/atletas/${atletaId}`);
  revalidatePath(`/atletas/${atletaId}/ver`);
  revalidatePath("/atletas");
  redirect(destino);
}
