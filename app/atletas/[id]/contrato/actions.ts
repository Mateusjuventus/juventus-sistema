"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nomeDaContaAtual } from "@/lib/auth/perfis";
import { atletaContratoEvolucaoSalarialSchema, atletaContratoSchema } from "@/lib/validation/schemas";
import type { ContratoFormState } from "@/components/contrato-form";
import type { EvolucaoSalarialFormState } from "@/components/evolucao-salarial-form";

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
    direitoEconomicoJuventusPct: String(formData.get("direitoEconomicoJuventusPct") ?? ""),
    direitoEconomicoAtletaPct: String(formData.get("direitoEconomicoAtletaPct") ?? ""),
    direitoEconomicoTerceiroNome: String(formData.get("direitoEconomicoTerceiroNome") ?? ""),
    direitoEconomicoTerceiroPct: String(formData.get("direitoEconomicoTerceiroPct") ?? ""),
  };

  const result = atletaContratoSchema.safeParse(raw);
  return { raw, result };
}

/**
 * "Novo contrato" (aba Contrato) — única ação pro Futebol Profissional e pro Futebol de Base
 * desde a unificação de 28/10/2026 (ver docs/superpowers/specs/2026-10-28-unificacao-atletas-
 * design.md): a mesma função `criar_contrato_atleta` (ver supabase/migrations/0137_atleta_
 * contrato.sql) já grava na tabela unificada `atleta_contratos` pra qualquer categoria. Encerra o
 * contrato vigente atual (se existir) e insere este como o novo vigente numa operação atômica só,
 * e sincroniza `tipo_contrato`/`data_fim_contrato` de volta em `atletas` (continuam lidos direto
 * por `AtletasResumoFiltros`, ver `app/atletas/page.tsx`). Ver docs/superpowers/specs/
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
    p_direito_economico_juventus_pct: data.direitoEconomicoJuventusPct ?? null,
    p_direito_economico_atleta_pct: data.direitoEconomicoAtletaPct ?? null,
    p_direito_economico_terceiro_nome: data.direitoEconomicoTerceiroNome || null,
    p_direito_economico_terceiro_pct: data.direitoEconomicoTerceiroPct ?? null,
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

/**
 * "+ Adicionar evolução" (dentro do contrato vigente, em `ContratoSecao`) — ver docs/superpowers/
 * specs/2026-11-04-contrato-atleta-extensoes-design.md. Mesmo padrão de
 * `adicionarContatoEmergencia` (app/atletas/actions.ts): sem redirect, só revalida a página do
 * atleta (`atletaId` vem num campo oculto do formulário, já que a tabela só guarda `contrato_id`).
 */
export async function salvarEvolucaoSalarial(
  _prevState: EvolucaoSalarialFormState,
  formData: FormData,
): Promise<EvolucaoSalarialFormState> {
  const contratoId = String(formData.get("contratoId") ?? "");
  const atletaId = String(formData.get("atletaId") ?? "");
  if (!contratoId || !atletaId) return { error: "Contrato não identificado. Recarregue a página e tente novamente." };

  const raw = {
    rubrica: String(formData.get("rubrica") ?? ""),
    dataVigencia: String(formData.get("dataVigencia") ?? ""),
    novoValor: String(formData.get("novoValor") ?? ""),
  };
  const result = atletaContratoEvolucaoSalarialSchema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Dados inválidos." };

  const supabase = createClient();
  const nomeAtual = await nomeDaContaAtual(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("atleta_contrato_evolucao_salarial").insert({
    contrato_id: contratoId,
    rubrica: result.data.rubrica,
    data_vigencia: result.data.dataVigencia,
    novo_valor: result.data.novoValor,
    criado_por_perfil_id: user?.id ?? null,
    criado_por_nome: nomeAtual,
  });

  if (error) return { error: "Não foi possível salvar a evolução salarial. Tente novamente." };

  revalidatePath(`/atletas/${atletaId}`);
  revalidatePath(`/atletas/${atletaId}/ver`);
  return { success: true };
}

/** Remove uma evolução salarial — mesmo padrão de `removerContatoEmergencia`
 * (app/atletas/actions.ts): sem confirmação/estado de erro, só apaga e revalida. */
export async function removerEvolucaoSalarial(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const atletaId = String(formData.get("atletaId") ?? "");
  if (!id || !atletaId) return;

  const supabase = createClient();
  await supabase.from("atleta_contrato_evolucao_salarial").delete().eq("id", id);

  revalidatePath(`/atletas/${atletaId}`);
  revalidatePath(`/atletas/${atletaId}/ver`);
}
