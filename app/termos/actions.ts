"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { proximoNumero, TEXTO_PADRAO } from "@/lib/futebol/termo-retirada";
import type { TermoRetiradaTipo } from "@/lib/supabase/types";

/**
 * Server Actions do Termo de Responsabilidade — Retirada de Materiais (ver
 * docs/superpowers/specs/2026-08-11-termos-retirada-design.md).
 */

export interface TermoFormState {
  error?: string;
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function textoOuNull(formData: FormData, campo: string): string | null {
  const valor = texto(formData, campo);
  return valor === "" ? null : valor;
}

function tipoDoForm(formData: FormData): TermoRetiradaTipo {
  return texto(formData, "tipo") === "definitiva" ? "definitiva" : "emprestimo";
}

/** Itens do termo — o formulário manda um trio de campos por linha (`itemDescricao`,
 * `itemQuantidade`, `itemValor`), na mesma ordem; linha sem descrição é descartada. */
function parseItens(formData: FormData) {
  const descricoes = formData.getAll("itemDescricao").map(String);
  const quantidades = formData.getAll("itemQuantidade").map(String);
  const valores = formData.getAll("itemValor").map(String);

  return descricoes
    .map((descricao, i) => {
      const quantidade = Number(quantidades[i]?.replace(",", "."));
      const valorBruto = (valores[i] ?? "").trim();
      const valor = valorBruto === "" ? null : Number(valorBruto.replace(",", "."));
      return {
        descricao: descricao.trim(),
        quantidade: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1,
        valor_unitario: valor !== null && Number.isFinite(valor) && valor >= 0 ? valor : null,
        ordem: i,
      };
    })
    .filter((item) => item.descricao !== "");
}

function revalidarTermos(termoId?: string) {
  revalidatePath("/termos");
  if (termoId) revalidatePath(`/termos/${termoId}`);
}

export async function criarTermo(_prevState: TermoFormState, formData: FormData): Promise<TermoFormState> {
  const responsavel = texto(formData, "responsavelNome");
  if (!responsavel) return { error: "Informe o nome de quem está retirando o material." };

  const itens = parseItens(formData);
  if (itens.length === 0) return { error: "Adicione pelo menos um item ao termo." };

  const tipo = tipoDoForm(formData);
  const supabase = createClient();

  // Numeração sequencial única do termo (a de Estoque é por categoria; aqui é uma só).
  const { data: ultimo } = await supabase
    .from("termos_retirada")
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("termos_retirada")
    .insert({
      numero: proximoNumero((ultimo?.numero as number | undefined) ?? null),
      data: texto(formData, "data") || undefined,
      tipo,
      responsavel_nome: responsavel,
      responsavel_documento: textoOuNull(formData, "responsavelDocumento"),
      funcao: textoOuNull(formData, "funcao"),
      departamento: textoOuNull(formData, "departamento"),
      finalidade: textoOuNull(formData, "finalidade"),
      // Previsão de devolução só faz sentido em empréstimo.
      previsao_devolucao: tipo === "emprestimo" ? textoOuNull(formData, "previsaoDevolucao") : null,
      texto_responsabilidade: texto(formData, "textoResponsabilidade") || TEXTO_PADRAO[tipo],
      observacoes: textoOuNull(formData, "observacoes"),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: `Não foi possível salvar: ${error?.message ?? "erro desconhecido"}` };
  }

  const termoId = data.id as string;
  const { error: erroItens } = await supabase
    .from("termo_retirada_itens")
    .insert(itens.map((item) => ({ ...item, termo_id: termoId })));
  if (erroItens) return { error: `O termo foi criado, mas os itens falharam: ${erroItens.message}` };

  revalidarTermos(termoId);
  redirect(`/termos/${termoId}`);
}

export async function atualizarTermo(
  termoId: string,
  _prevState: TermoFormState,
  formData: FormData,
): Promise<TermoFormState> {
  const responsavel = texto(formData, "responsavelNome");
  if (!responsavel) return { error: "Informe o nome de quem está retirando o material." };

  const itens = parseItens(formData);
  if (itens.length === 0) return { error: "Adicione pelo menos um item ao termo." };

  const tipo = tipoDoForm(formData);
  const supabase = createClient();

  const { error } = await supabase
    .from("termos_retirada")
    .update({
      data: texto(formData, "data") || undefined,
      tipo,
      responsavel_nome: responsavel,
      responsavel_documento: textoOuNull(formData, "responsavelDocumento"),
      funcao: textoOuNull(formData, "funcao"),
      departamento: textoOuNull(formData, "departamento"),
      finalidade: textoOuNull(formData, "finalidade"),
      previsao_devolucao: tipo === "emprestimo" ? textoOuNull(formData, "previsaoDevolucao") : null,
      texto_responsabilidade: texto(formData, "textoResponsabilidade") || TEXTO_PADRAO[tipo],
      observacoes: textoOuNull(formData, "observacoes"),
    })
    .eq("id", termoId);
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  // Itens são substituídos por inteiro (a lista é curta e editada como um bloco só).
  await supabase.from("termo_retirada_itens").delete().eq("termo_id", termoId);
  const { error: erroItens } = await supabase
    .from("termo_retirada_itens")
    .insert(itens.map((item) => ({ ...item, termo_id: termoId })));
  if (erroItens) return { error: `Não foi possível salvar os itens: ${erroItens.message}` };

  revalidarTermos(termoId);
  redirect(`/termos/${termoId}`);
}

/** Registra (ou desfaz) a devolução de um empréstimo. */
export async function registrarDevolucao(termoId: string, formData: FormData): Promise<void> {
  const supabase = createClient();
  const desfazer = texto(formData, "desfazer") === "1";
  await supabase
    .from("termos_retirada")
    .update({
      devolvido_em: desfazer ? null : texto(formData, "devolvidoEm") || new Date().toISOString().slice(0, 10),
      devolucao_observacoes: desfazer ? null : textoOuNull(formData, "devolucaoObservacoes"),
    })
    .eq("id", termoId);
  revalidarTermos(termoId);
}

export async function excluirTermo(formData: FormData): Promise<void> {
  const termoId = texto(formData, "id");
  if (!termoId) return;
  const supabase = createClient();
  await supabase.from("termos_retirada").delete().eq("id", termoId);
  revalidatePath("/termos");
  redirect("/termos");
}
