"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nomeDaContaAtual } from "@/lib/auth/perfis";
import { contratoFormacaoSchema } from "@/lib/validation/schemas";
import { construirCamposContratoFormacao } from "@/lib/pdf/contrato-formacao-campos";
import {
  textoPadraoContratoPrincipal as textoPadraoContratoPrincipalMenor,
  textoPadraoClausulasAdicionais as textoPadraoClausulasAdicionaisMenor,
} from "@/lib/pdf/contrato-formacao-document";
import {
  textoPadraoContratoPrincipal as textoPadraoContratoPrincipalMaior,
  textoPadraoClausulasAdicionais as textoPadraoClausulasAdicionaisMaior,
} from "@/lib/pdf/contrato-formacao-maior-document";
import type { AtletaContratoRow, AtletaRow } from "@/lib/supabase/types";
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

function revalidarTudo(atletaId: string) {
  revalidatePath(`/atletas/${atletaId}`);
  revalidatePath(`/atletas/${atletaId}/ver`);
  revalidatePath("/atletas");
}

/**
 * Cria o Contrato de Formação — chamada pelo modal do botão "Contrato de Formação" dentro de
 * `ContratoSecao` (`components/contrato-formacao-button.tsx`; ver docs/superpowers/specs/2026-11-
 * 11-contrato-formacao-fase2-design.md pro desenho original, feito quando isso ainda era uma tela
 * própria). Encerra o contrato vigente atual do atleta (seja ele qual for — Amador, Definitivo,
 * Empréstimo, ou nenhum) e sobe este como o novo vigente, com `tipo_contrato = 'formacao'`, usando
 * a mesma RPC `criar_contrato_atleta` já existente (as 5 rubricas de remuneração formal não se
 * aplicam a este tipo — ver `contratoTemRemuneracaoFormal` — então vão zeradas). Em 12/11/2026,
 * trocado de `redirect()` pra devolver `{ success: true }` — o formulário agora roda dentro de um
 * modal (`ContratoFormacaoForm`'s `onSuccessClose`) em vez de navegar pra outra página.
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
  return { success: true };
}

/**
 * Edita o Contrato de Formação já vigente, NO MESMO REGISTRO — sem Aditivo, sem criar histórico
 * novo (ver docs/superpowers/specs/2026-11-11-contrato-formacao-fase2-design.md). Usa a função de
 * banco `atualizar_contrato_formacao_vigente` (ver supabase/migrations/0162_atleta_contrato_
 * formacao_tela_propria.sql), que só atualiza vigência/bolsa — diferente de `criar_contrato_
 * atleta`, nunca encerra o vigente nem insere linha nova. Mesma troca de `redirect()` por
 * `{ success: true }` de `criarContratoFormacao` acima (ver seu comentário).
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
  return { success: true };
}

export interface TextoContratoFormacaoResultado {
  textoContrato: string;
  textoClausulasAdicionais: string;
  /** true quando pelo menos um dos dois campos já tem texto personalizado salvo (não o padrão). */
  personalizado: boolean;
}

/**
 * Busca o texto a mostrar no editor de "Personalizar texto do contrato" (`components/contrato-
 * formacao-texto-modal.tsx`): o texto JÁ PERSONALIZADO do contrato, quando existir
 * (`texto_contrato_custom`/`texto_clausulas_adicionais_custom`), ou o texto padrão gerado a partir
 * do template (mesmos `campos` e mesma escolha menor/maior de idade usados na geração do PDF — ver
 * `construirCamposContratoFormacao`, compartilhado com `app/atletas/[id]/contrato/formacao/pdf/
 * route.tsx` pra nunca os dois lugares calcularem diferente). Ver docs/superpowers/specs/2026-11-16-
 * contrato-formacao-texto-personalizado-design.md.
 */
export async function buscarTextoContratoFormacao(
  atletaId: string,
): Promise<TextoContratoFormacaoResultado | { error: string }> {
  if (!atletaId) return { error: "Atleta não identificado. Recarregue a página e tente novamente." };

  const supabase = createClient();
  const [{ data: atletaData }, { data: contratoData }] = await Promise.all([
    supabase.from("atletas").select("*").eq("id", atletaId).maybeSingle(),
    supabase.from("atleta_contratos").select("*").eq("atleta_id", atletaId).eq("vigente", true).maybeSingle(),
  ]);

  const atleta = atletaData as AtletaRow | null;
  const contrato = contratoData as AtletaContratoRow | null;
  if (!atleta || !contrato || contrato.tipo_contrato !== "formacao") {
    return { error: "Este atleta não tem um contrato de Formação vigente." };
  }

  const { maiorDeIdade, camposMenor, camposMaior } = construirCamposContratoFormacao(atleta, contrato);
  const textoContratoPadrao = maiorDeIdade
    ? textoPadraoContratoPrincipalMaior(camposMaior)
    : textoPadraoContratoPrincipalMenor(camposMenor);
  const textoClausulasAdicionaisPadrao = maiorDeIdade
    ? textoPadraoClausulasAdicionaisMaior(camposMaior)
    : textoPadraoClausulasAdicionaisMenor(camposMenor);

  return {
    textoContrato: contrato.texto_contrato_custom ?? textoContratoPadrao,
    textoClausulasAdicionais: contrato.texto_clausulas_adicionais_custom ?? textoClausulasAdicionaisPadrao,
    personalizado: contrato.texto_contrato_custom != null || contrato.texto_clausulas_adicionais_custom != null,
  };
}

export interface TextoContratoFormacaoFormState {
  error?: string;
  success?: boolean;
}

/**
 * Salva o texto personalizado do contrato vigente do atleta (os dois campos do editor). Campo
 * deixado em branco grava `null`, ou seja, volta a usar o texto padrão SÓ para aquele campo — a
 * assinatura nunca faz parte deste texto, continua sempre automática (ver `montarBlocos` nos dois
 * arquivos de documento).
 */
export async function atualizarTextoContratoFormacao(
  _prevState: TextoContratoFormacaoFormState,
  formData: FormData,
): Promise<TextoContratoFormacaoFormState> {
  const atletaId = String(formData.get("atletaId") ?? "");
  if (!atletaId) return { error: "Atleta não identificado. Recarregue a página e tente novamente." };

  const textoContrato = String(formData.get("textoContrato") ?? "").trim();
  const textoClausulasAdicionais = String(formData.get("textoClausulasAdicionais") ?? "").trim();

  const supabase = createClient();
  const { error } = await supabase
    .from("atleta_contratos")
    .update({
      texto_contrato_custom: textoContrato.length > 0 ? textoContrato : null,
      texto_clausulas_adicionais_custom: textoClausulasAdicionais.length > 0 ? textoClausulasAdicionais : null,
    })
    .eq("atleta_id", atletaId)
    .eq("vigente", true);

  if (error) return { error: "Não foi possível salvar o texto personalizado. Tente novamente." };

  revalidarTudo(atletaId);
  return { success: true };
}

/**
 * Restaura o texto padrão do contrato vigente do atleta — limpa os dois campos de personalização
 * (`texto_contrato_custom`/`texto_clausulas_adicionais_custom`), voltando ao texto gerado a partir
 * do template pros dois (contrato principal e Cláusulas Adicionais).
 */
export async function restaurarTextoPadraoContratoFormacao(
  _prevState: TextoContratoFormacaoFormState,
  formData: FormData,
): Promise<TextoContratoFormacaoFormState> {
  const atletaId = String(formData.get("atletaId") ?? "");
  if (!atletaId) return { error: "Atleta não identificado. Recarregue a página e tente novamente." };

  const supabase = createClient();
  const { error } = await supabase
    .from("atleta_contratos")
    .update({ texto_contrato_custom: null, texto_clausulas_adicionais_custom: null })
    .eq("atleta_id", atletaId)
    .eq("vigente", true);

  if (error) return { error: "Não foi possível restaurar o texto padrão. Tente novamente." };

  revalidarTudo(atletaId);
  return { success: true };
}
