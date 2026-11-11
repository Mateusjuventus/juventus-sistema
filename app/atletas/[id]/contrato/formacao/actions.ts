"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nomeDaContaAtual } from "@/lib/auth/perfis";
import { contratoFormacaoSchema } from "@/lib/validation/schemas";
import type { ContratoFormacaoFormState } from "@/components/contrato-formacao-form";

function parseForm(formData: FormData) {
  const raw = {
    maeNome: String(formData.get("maeNome") ?? ""),
    maeTelefone: String(formData.get("maeTelefone") ?? ""),
    emailMae: String(formData.get("emailMae") ?? ""),
    maeCpf: String(formData.get("maeCpf") ?? ""),
    paiNome: String(formData.get("paiNome") ?? ""),
    paiTelefone: String(formData.get("paiTelefone") ?? ""),
    emailPai: String(formData.get("emailPai") ?? ""),
    paiCpf: String(formData.get("paiCpf") ?? ""),
    vigenciaBidInicio: String(formData.get("vigenciaBidInicio") ?? ""),
    vigenciaBidFim: String(formData.get("vigenciaBidFim") ?? ""),
    vigenciaInicio: String(formData.get("vigenciaInicio") ?? ""),
    vigenciaFim: String(formData.get("vigenciaFim") ?? ""),
    bolsaAprendizagem: String(formData.get("bolsaAprendizagem") ?? "0"),
  };

  const result = contratoFormacaoSchema.safeParse(raw);
  return { raw, result };
}

/** Grava os campos de Responsáveis e Vigência do BID direto em `atletas` — mesmas colunas usadas
 * pelo cadastro normal (`app/atletas/actions.ts`), nunca uma cópia separada (ver docs/superpowers/
 * specs/2026-11-11-contrato-formacao-fase2-design.md). Compartilhado pelas duas actions abaixo. */
async function salvarDadosAtleta(
  supabase: ReturnType<typeof createClient>,
  atletaId: string,
  data: ReturnType<typeof contratoFormacaoSchema.parse>,
) {
  return supabase
    .from("atletas")
    .update({
      mae_nome: data.maeNome || null,
      mae_telefone: data.maeTelefone || null,
      email_mae: data.emailMae || null,
      mae_cpf: data.maeCpf || null,
      pai_nome: data.paiNome || null,
      pai_telefone: data.paiTelefone || null,
      email_pai: data.emailPai || null,
      pai_cpf: data.paiCpf || null,
      vigencia_bid_inicio: data.vigenciaBidInicio || null,
      vigencia_bid_fim: data.vigenciaBidFim || null,
    })
    .eq("id", atletaId);
}

function destinoVolta(formData: FormData, atletaId: string): string {
  const origem = String(formData.get("origem") ?? "") === "editar" ? "editar" : "ver";
  return origem === "editar" ? `/atletas/${atletaId}` : `/atletas/${atletaId}/ver`;
}

function revalidarTudo(atletaId: string) {
  revalidatePath(`/atletas/${atletaId}`);
  revalidatePath(`/atletas/${atletaId}/ver`);
  revalidatePath(`/atletas/${atletaId}/contrato/formacao`);
  revalidatePath("/atletas");
}

/**
 * Cria o Contrato de Formação pela tela própria — ver docs/superpowers/specs/2026-11-11-
 * contrato-formacao-fase2-design.md. Encerra o contrato vigente atual do atleta (seja ele qual
 * for — Amador, Definitivo, Empréstimo, ou nenhum) e sobe este como o novo vigente, com
 * `tipo_contrato = 'formacao'`, usando a mesma RPC `criar_contrato_atleta` já existente (as 5
 * rubricas de remuneração formal não se aplicam a este tipo — ver `contratoTemRemuneracaoFormal`
 * — então vão zeradas).
 */
export async function criarContratoFormacao(
  _prevState: ContratoFormacaoFormState,
  formData: FormData,
): Promise<ContratoFormacaoFormState> {
  const atletaId = String(formData.get("atletaId") ?? "");
  if (!atletaId) return { error: "Atleta não identificado. Recarregue a página e tente novamente." };

  const { raw, result } = parseForm(formData);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  const { error: errorAtleta } = await salvarDadosAtleta(supabase, atletaId, data);
  if (errorAtleta) return { error: "Não foi possível salvar os dados do atleta. Tente novamente.", values: raw };

  const nomeAtual = await nomeDaContaAtual(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.rpc("criar_contrato_atleta", {
    p_atleta_id: atletaId,
    p_tipo_contrato: "formacao",
    p_clube_origem: null,
    p_vigencia_inicio: data.vigenciaInicio || null,
    p_vigencia_fim: data.vigenciaFim || null,
    p_salario_ctps: 0,
    p_direito_imagem: 0,
    p_bonificacao: 0,
    p_auxilio_moradia: 0,
    p_outros: 0,
    p_criado_por_perfil_id: user?.id ?? null,
    p_criado_por_nome: nomeAtual,
    p_direito_economico_juventus_pct: null,
    p_direito_economico_atleta_pct: null,
    p_direito_economico_terceiro_nome: null,
    p_direito_economico_terceiro_pct: null,
    p_bolsa_aprendizagem: data.bolsaAprendizagem,
  });

  if (error) return { error: "Não foi possível criar o contrato de Formação. Tente novamente.", values: raw };

  revalidarTudo(atletaId);
  redirect(destinoVolta(formData, atletaId));
}

/**
 * Edita o Contrato de Formação já vigente, NO MESMO REGISTRO — sem Aditivo, sem criar histórico
 * novo (ver docs/superpowers/specs/2026-11-11-contrato-formacao-fase2-design.md). Usa a função de
 * banco `atualizar_contrato_formacao_vigente` (ver supabase/migrations/0162_atleta_contrato_
 * formacao_tela_propria.sql), que só atualiza vigência/bolsa — diferente de `criar_contrato_
 * atleta`, nunca encerra o vigente nem insere linha nova.
 */
export async function atualizarContratoFormacao(
  _prevState: ContratoFormacaoFormState,
  formData: FormData,
): Promise<ContratoFormacaoFormState> {
  const atletaId = String(formData.get("atletaId") ?? "");
  if (!atletaId) return { error: "Atleta não identificado. Recarregue a página e tente novamente." };

  const { raw, result } = parseForm(formData);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  const { error: errorAtleta } = await salvarDadosAtleta(supabase, atletaId, data);
  if (errorAtleta) return { error: "Não foi possível salvar os dados do atleta. Tente novamente.", values: raw };

  const { error } = await supabase.rpc("atualizar_contrato_formacao_vigente", {
    p_atleta_id: atletaId,
    p_vigencia_inicio: data.vigenciaInicio || null,
    p_vigencia_fim: data.vigenciaFim || null,
    p_bolsa_aprendizagem: data.bolsaAprendizagem,
  });

  if (error) return { error: "Não foi possível salvar as alterações. Tente novamente.", values: raw };

  revalidarTudo(atletaId);
  redirect(destinoVolta(formData, atletaId));
}
