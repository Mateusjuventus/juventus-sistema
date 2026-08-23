"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { OrganogramaNoFormState } from "@/components/organograma-editor";

const CAMINHO = "/base/comissao-tecnica/organograma";

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function textoOuNull(formData: FormData, campo: string): string | null {
  const valor = texto(formData, campo);
  return valor === "" ? null : valor;
}

/**
 * Cria ou atualiza uma caixa do Organograma da Base (ver
 * docs/superpowers/specs/2026-08-23-organograma-base-design.md). Vinculando a uma pessoa da
 * Comissão Técnica, `nome`/`cargo` locais são zerados de propósito — a tela sempre mostra o nome/
 * função de lá pra essa caixa, então guardar os dois ao mesmo tempo só criaria risco de ficarem
 * desencontrados.
 */
export async function salvarNoOrganograma(
  _prevState: OrganogramaNoFormState,
  formData: FormData,
): Promise<OrganogramaNoFormState> {
  const id = textoOuNull(formData, "id");
  const comissaoTecnicaBaseId = textoOuNull(formData, "comissaoTecnicaBaseId");
  const nome = textoOuNull(formData, "nome");
  const cargo = textoOuNull(formData, "cargo");
  const grupo = textoOuNull(formData, "grupo");
  const linha = textoOuNull(formData, "linha");
  const reportaPara = textoOuNull(formData, "reportaPara");

  if (!comissaoTecnicaBaseId && !cargo) {
    return { error: "Escolha uma pessoa da Comissão Técnica ou preencha ao menos o cargo da caixa." };
  }
  if (reportaPara && id && reportaPara === id) {
    return { error: "Uma caixa não pode reportar pra ela mesma." };
  }

  const supabase = createClient();
  const dados = {
    comissao_tecnica_base_id: comissaoTecnicaBaseId,
    nome: comissaoTecnicaBaseId ? null : nome,
    cargo: comissaoTecnicaBaseId ? null : cargo,
    grupo,
    linha,
    reporta_para: reportaPara,
  };

  if (id) {
    const { error } = await supabase.from("organograma_base").update(dados).eq("id", id);
    if (error) return { error: `Não foi possível salvar: ${error.message}` };
  } else {
    const { count } = await supabase.from("organograma_base").select("id", { count: "exact", head: true });
    const { error } = await supabase.from("organograma_base").insert({ ...dados, ordem: count ?? 0 });
    if (error) return { error: `Não foi possível criar: ${error.message}` };
  }

  revalidatePath(CAMINHO);
  return { success: true };
}

/** Salva a posição arrastada. Chamada direto pelo componente cliente (não é um `<form>`), disparada
 * a cada soltar de arrasto — por isso não devolve estado nenhum pra tela, só grava. */
export async function moverNoOrganograma(id: string, x: number, y: number): Promise<void> {
  if (!id) return;
  const supabase = createClient();
  await supabase
    .from("organograma_base")
    .update({ pos_x: Math.round(x), pos_y: Math.round(y) })
    .eq("id", id);
  revalidatePath(CAMINHO);
}

/** Exclui a caixa. Não cascateia: quem reportava pra ela (`reporta_para`, `on delete set null`) fica
 * sem líder direto em vez de ser apagado junto — o painel já avisa quantas pessoas isso afeta antes
 * de confirmar. */
export async function excluirNoOrganograma(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("organograma_base").delete().eq("id", id);
  revalidatePath(CAMINHO);
}
