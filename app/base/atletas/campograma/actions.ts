"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ATLETA_POSICAO_OPTIONS, atletaRapidoCampogramaSchema } from "@/lib/validation/schemas";

export interface MoverAtletaCampogramaState {
  error?: string;
}

/**
 * Move um atleta pra outra posição a partir do arrastar-e-soltar do Campograma (ver
 * docs/superpowers/specs/2026-08-26-campograma-foto-classificacao-design.md) — grava direto em
 * `atletas_base.posicao`, o mesmo campo do cadastro completo. Não reaproveita o `atletaBaseSchema`
 * inteiro (essa mutação atualiza um único campo, não o cadastro completo); valida só contra a lista
 * fixa das 9 posições, a mesma checada pelo schema.
 */
export async function moverAtletaCampograma(
  atletaId: string,
  novaPosicao: string,
): Promise<MoverAtletaCampogramaState> {
  if (!atletaId) return { error: "Atleta inválido." };
  if (!(ATLETA_POSICAO_OPTIONS as readonly string[]).includes(novaPosicao)) {
    return { error: "Posição inválida." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("atletas_base").update({ posicao: novaPosicao }).eq("id", atletaId);

  if (error) return { error: "Não foi possível mover o atleta. Tente novamente." };

  revalidatePath("/base/atletas/campograma");
  return {};
}

const CLASSIFICACOES_VALIDAS = ["g1", "g2", "g3", "dispensa"] as const;
// Sem "dispensado" de propósito — esse status continua exclusivo do fluxo formal do Relatório de
// Dispensa (ver docs/superpowers/specs/2026-09-02-campograma-edicao-rapida-design.md, seção 2).
const STATUS_VALIDOS_CAMPOGRAMA = ["liberado", "suspenso", "departamento_medico"] as const;

export interface SalvarClassificacaoStatusCampogramaState {
  error?: string;
}

/**
 * Salva Classificação + Status a partir do painel de edição rápida do Campograma (ver spec acima,
 * seção 3) — mesmo padrão de `moverAtletaCampograma`: grava direto os dois campos em
 * `atletas_base`, sem passar pelo `atletaBaseSchema` inteiro. "Dispensa (pendente)" é só um valor de
 * classificação — nunca muda `status` aqui; só o Relatório de Dispensa formal muda o status pra
 * "dispensado", e "dispensado" nem é uma opção aceita como status por esta ação.
 */
export async function salvarClassificacaoStatusCampograma(
  atletaId: string,
  classificacao: string | null,
  status: string,
): Promise<SalvarClassificacaoStatusCampogramaState> {
  if (!atletaId) return { error: "Atleta inválido." };
  if (classificacao !== null && !(CLASSIFICACOES_VALIDAS as readonly string[]).includes(classificacao)) {
    return { error: "Classificação inválida." };
  }
  if (!(STATUS_VALIDOS_CAMPOGRAMA as readonly string[]).includes(status)) {
    return { error: "Status inválido." };
  }

  const supabase = createClient();
  const { data: atleta } = await supabase
    .from("atletas_base")
    .select("categoria")
    .eq("id", atletaId)
    .maybeSingle();

  const { error } = await supabase
    .from("atletas_base")
    .update({ classificacao, status })
    .eq("id", atletaId);

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  // Diferente de `moverAtletaCampograma` (que só afeta o Campograma), Classificação e Status também
  // aparecem na listagem por categoria e potencialmente na página do próprio atleta — revalida os
  // três lugares.
  revalidatePath("/base/atletas/campograma");
  revalidatePath("/base/atletas");
  const categoriaAtleta = (atleta as { categoria?: string } | null)?.categoria;
  if (categoriaAtleta) revalidatePath(`/base/atletas/${categoriaAtleta}`);
  return {};
}

export interface CriarAtletaRapidoCampogramaState {
  error?: string;
  id?: string;
}

/**
 * Inclusão rápida de atleta pelo Campograma (ver spec acima, seção 4) — cria de verdade uma linha em
 * `atletas_base` (não passa pela Captação/Avaliação: é um atleta já ocupando uma posição no elenco
 * ativo, não um candidato em teste). RG/CPF/data de nascimento ficam `null`; o atleta fica sinalizado
 * como "Cadastro incompleto" nas listagens/página do atleta até serem preenchidos pelo formulário
 * normal de edição.
 */
export async function criarAtletaRapidoCampograma(
  nomeCompleto: string,
  posicao: string,
  categoria: string,
): Promise<CriarAtletaRapidoCampogramaState> {
  const parsed = atletaRapidoCampogramaSchema.safeParse({ nomeCompleto, posicao, categoria });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createClient();
  const id = randomUUID();
  const { error } = await supabase.from("atletas_base").insert({
    id,
    categoria: parsed.data.categoria,
    nome_completo: parsed.data.nomeCompleto,
    posicao: parsed.data.posicao,
    status: "liberado",
    rg: null,
    cpf: null,
    data_nascimento: null,
  });

  if (error) return { error: "Não foi possível incluir o atleta. Tente novamente." };

  revalidatePath("/base/atletas/campograma");
  revalidatePath("/base/atletas");
  revalidatePath(`/base/atletas/${parsed.data.categoria}`);
  return { id };
}
