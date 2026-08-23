"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularLayoutAutomatico, type OrganogramaNo } from "@/lib/futebol/organograma";
import type { OrganogramaNoFormState } from "@/components/organograma-editor";

const CAMINHO = "/base/comissao-tecnica/organograma";

/**
 * Toda caixa que ainda não tem `pos_x`/`pos_y` salvo fica recalculando a posição toda vez que a
 * lista de caixas muda (é o layout automático, ver `lib/futebol/organograma.ts`) — na prática, isso
 * fazia caixa já organizada "pular" de lugar toda vez que o Mateus adicionava uma caixa nova em
 * outro canto do organograma, mesmo sem mexer nela. Chamada depois de qualquer criação/edição, essa
 * função "congela": calcula a posição automática de quem ainda está sem posição salva (com o
 * conjunto JÁ incluindo a caixa que acabou de ser salva) e grava esse valor de uma vez — dali em
 * diante só uma caixa nova entra no cálculo, nunca mais empurra quem já existia.
 */
async function congelarPosicoesAutomaticas(supabase: ReturnType<typeof createClient>): Promise<void> {
  const { data } = await supabase
    .from("organograma_base")
    .select("id, reporta_para, grupo, linha, ordem, pos_x, pos_y");
  const linhas = (data ?? []) as {
    id: string;
    reporta_para: string | null;
    grupo: string | null;
    linha: string | null;
    ordem: number;
    pos_x: number | null;
    pos_y: number | null;
  }[];
  const semPosicao = linhas.filter((l) => l.pos_x === null || l.pos_y === null);
  if (semPosicao.length === 0) return;

  const layout = calcularLayoutAutomatico(
    linhas.map(
      (l): OrganogramaNo => ({ id: l.id, reportaPara: l.reporta_para, grupo: l.grupo, linha: l.linha, ordem: l.ordem }),
    ),
  );

  await Promise.all(
    semPosicao.map((l) => {
      const pos = layout.get(l.id);
      if (!pos) return null;
      return supabase
        .from("organograma_base")
        .update({ pos_x: Math.round(pos.x), pos_y: Math.round(pos.y) })
        .eq("id", l.id);
    }),
  );
}

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

  await congelarPosicoesAutomaticas(supabase);
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
 * de confirmar.
 *
 * Usa o formato "com erro" do `DeleteButton` (em vez de "executa e esquece") — antes, um erro do
 * Supabase na exclusão desaparecia em silêncio: a linha continuava lá, mas a tela não avisava nada,
 * então parecia que o clique em "Sim, excluir" simplesmente não fazia nada. Agora qualquer erro
 * aparece pro Mateus em vez de sumir. */
export async function excluirNoOrganograma(
  _prevState: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const id = String(formData.get("id") ?? "");
  if (!id) return {};
  const supabase = createClient();
  const { error } = await supabase.from("organograma_base").delete().eq("id", id);
  if (error) return { error: `Não foi possível excluir: ${error.message}` };
  revalidatePath(CAMINHO);
  return {};
}
