"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Espelha `app/jogos/[id]/vagas/actions.ts` para o Futebol de Base — mesma lógica, tabelas
 * `jogo_vagas_staff_base*` (ver docs/superpowers/specs/2026-08-14-vagas-staff-design.md e
 * 0075_vagas_staff_base.sql).
 *
 * Nada aqui decide quem entra: isso acontece na função `pegar_vaga_staff_base` do banco, chamada
 * pela tela pública. Estas ações são só a administração — abrir/fechar, definir quantas vagas cada
 * função tem, remover alguém e promover da espera.
 */

export type { VagasFormState } from "@/components/vagas-form";
import type { VagasFormState } from "@/components/vagas-form";

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function textoOuNull(formData: FormData, campo: string): string | null {
  const valor = texto(formData, campo);
  return valor === "" ? null : valor;
}

async function idDasVagas(supabase: ReturnType<typeof createClient>, jogoId: string): Promise<string | null> {
  const { data } = await supabase.from("jogo_vagas_staff_base").select("id").eq("jogo_id", jogoId).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * Cria a abertura de vagas do jogo (o token da URL pública é gerado pelo banco) ou atualiza os
 * dados gerais. As funções são substituídas por inteiro: a lista é curta e editada como um bloco.
 *
 * Uma função que já tem gente inscrita NÃO pode ser removida às cegas — apagar a linha levaria a
 * inscrição junto (cascade) e alguém que já se organizou pro jogo sumiria sem aviso. Por isso a
 * ação recusa a remoção e explica o que fazer.
 */
export async function salvarVagasBase(
  jogoId: string,
  _prevState: VagasFormState,
  formData: FormData,
): Promise<VagasFormState> {
  const supabase = createClient();

  const funcaoIds = formData.getAll("funcaoId").map(String);
  const quantidades = formData.getAll("quantidade").map(String);
  const horarios = formData.getAll("horarioFuncao").map(String);

  const funcoes = funcaoIds
    .map((funcaoId, i) => ({
      funcao_id: funcaoId.trim(),
      quantidade: Math.trunc(Number(quantidades[i])),
      horario_apresentacao: (horarios[i] ?? "").trim() || null,
    }))
    .filter((f) => f.funcao_id !== "" && Number.isFinite(f.quantidade) && f.quantidade > 0);

  const repetida = funcoes.find((f, i) => funcoes.findIndex((o) => o.funcao_id === f.funcao_id) !== i);
  if (repetida) return { error: "A mesma função aparece duas vezes. Some as vagas numa linha só." };

  let vagasId = await idDasVagas(supabase, jogoId);

  if (!vagasId) {
    const { data, error } = await supabase
      .from("jogo_vagas_staff_base")
      .insert({
        jogo_id: jogoId,
        horario_apresentacao: textoOuNull(formData, "horarioApresentacao"),
        local_apresentacao: textoOuNull(formData, "localApresentacao"),
        observacoes: textoOuNull(formData, "observacoes"),
      })
      .select("id")
      .single();
    if (error || !data) return { error: `Não foi possível abrir as vagas: ${error?.message ?? "erro desconhecido"}` };
    vagasId = data.id as string;
  } else {
    const { error } = await supabase
      .from("jogo_vagas_staff_base")
      .update({
        horario_apresentacao: textoOuNull(formData, "horarioApresentacao"),
        local_apresentacao: textoOuNull(formData, "localApresentacao"),
        observacoes: textoOuNull(formData, "observacoes"),
      })
      .eq("id", vagasId);
    if (error) return { error: `Não foi possível salvar: ${error.message}` };
  }

  const [{ data: atuaisData }, { data: inscricoesData }] = await Promise.all([
    supabase.from("jogo_vagas_staff_base_funcoes").select("id, funcao_id").eq("vagas_id", vagasId),
    supabase.from("jogo_vagas_staff_base_inscricoes").select("vaga_funcao_id").eq("vagas_id", vagasId),
  ]);

  const atuais = (atuaisData ?? []) as { id: string; funcao_id: string }[];
  const comInscritos = new Set(((inscricoesData ?? []) as { vaga_funcao_id: string }[]).map((i) => i.vaga_funcao_id));
  const mantidas = new Set(funcoes.map((f) => f.funcao_id));

  const removidaComGente = atuais.find((a) => !mantidas.has(a.funcao_id) && comInscritos.has(a.id));
  if (removidaComGente) {
    return {
      error:
        "Uma das funções que você tirou já tem gente inscrita. Remova as pessoas dessa função primeiro — " +
        "elas sumiriam da lista sem saber.",
    };
  }

  for (const atual of atuais) {
    if (!mantidas.has(atual.funcao_id)) {
      await supabase.from("jogo_vagas_staff_base_funcoes").delete().eq("id", atual.id);
    }
  }

  for (const f of funcoes) {
    const existente = atuais.find((a) => a.funcao_id === f.funcao_id);
    if (existente) {
      await supabase
        .from("jogo_vagas_staff_base_funcoes")
        .update({ quantidade: f.quantidade, horario_apresentacao: f.horario_apresentacao })
        .eq("id", existente.id);
    } else {
      await supabase.from("jogo_vagas_staff_base_funcoes").insert({ ...f, vagas_id: vagasId });
    }
  }

  revalidatePath(`/base/jogos/${jogoId}/vagas`);
  return { success: true };
}

/** Abre ou fecha a captação. Fechar não apaga nada — o link passa a mostrar "encerrado". */
export async function alternarVagasAbertasBase(jogoId: string, formData: FormData): Promise<void> {
  const abrir = String(formData.get("abrir") ?? "") === "1";
  const supabase = createClient();
  await supabase.from("jogo_vagas_staff_base").update({ aberto: abrir }).eq("jogo_id", jogoId);
  revalidatePath(`/base/jogos/${jogoId}/vagas`);
}

/** Tira alguém da lista — a vaga volta a aparecer como livre no link. */
export async function removerInscricaoBase(jogoId: string, formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("jogo_vagas_staff_base_inscricoes").delete().eq("id", id);
  revalidatePath(`/base/jogos/${jogoId}/vagas`);
}

/**
 * Chama alguém da lista de espera. É manual de propósito — ver o comentário equivalente no
 * Profissional (`app/jogos/[id]/vagas/actions.ts`).
 */
export async function chamarDaEsperaBase(jogoId: string, formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("jogo_vagas_staff_base_inscricoes").update({ situacao: "confirmado" }).eq("id", id);
  revalidatePath(`/base/jogos/${jogoId}/vagas`);
}

/**
 * Move alguém pra outra função do mesmo jogo — ver o comentário equivalente no Profissional
 * (`app/jogos/[id]/vagas/actions.ts`).
 */
export async function trocarFuncaoInscricaoBase(jogoId: string, formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const vagaFuncaoId = String(formData.get("vagaFuncaoId") ?? "");
  if (!id || !vagaFuncaoId) return;
  const supabase = createClient();
  await supabase.from("jogo_vagas_staff_base_inscricoes").update({ vaga_funcao_id: vagaFuncaoId }).eq("id", id);
  revalidatePath(`/base/jogos/${jogoId}/vagas`);
}
