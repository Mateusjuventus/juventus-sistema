"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Actions das Vagas de Staff de um jogo (ver
 * docs/superpowers/specs/2026-08-14-vagas-staff-design.md).
 *
 * Nada aqui decide quem entra: isso acontece na função `pegar_vaga_staff` do banco, chamada pela
 * tela pública. Estas ações são só a administração — abrir/fechar, definir quantas vagas cada
 * função tem, remover alguém e promover da espera.
 */

// O tipo vive no componente compartilhado (components/vagas-form.tsx), usado pelo Profissional e
// pela Base — reexportado aqui pra quem já importava daqui não quebrar.
export type { VagasFormState } from "@/components/vagas-form";
import type { VagasFormState } from "@/components/vagas-form";
import type { AdicionarStaffVagaState } from "@/components/adicionar-staff-vaga-form";

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function textoOuNull(formData: FormData, campo: string): string | null {
  const valor = texto(formData, campo);
  return valor === "" ? null : valor;
}

async function idDasVagas(supabase: ReturnType<typeof createClient>, jogoId: string): Promise<string | null> {
  const { data } = await supabase.from("jogo_vagas_staff").select("id").eq("jogo_id", jogoId).maybeSingle();
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
export async function salvarVagas(
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
      .from("jogo_vagas_staff")
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
      .from("jogo_vagas_staff")
      .update({
        horario_apresentacao: textoOuNull(formData, "horarioApresentacao"),
        local_apresentacao: textoOuNull(formData, "localApresentacao"),
        observacoes: textoOuNull(formData, "observacoes"),
      })
      .eq("id", vagasId);
    if (error) return { error: `Não foi possível salvar: ${error.message}` };
  }

  const [{ data: atuaisData }, { data: inscricoesData }] = await Promise.all([
    supabase.from("jogo_vagas_staff_funcoes").select("id, funcao_id").eq("vagas_id", vagasId),
    supabase.from("jogo_vagas_staff_inscricoes").select("vaga_funcao_id").eq("vagas_id", vagasId),
  ]);

  const atuais = (atuaisData ?? []) as { id: string; funcao_id: string }[];
  const comInscritos = new Set(((inscricoesData ?? []) as { vaga_funcao_id: string }[]).map((i) => i.vaga_funcao_id));
  const mantidas = new Set(funcoes.map((f) => f.funcao_id));

  const removidaComGente = atuais.find((a) => !mantidas.has(a.funcao_id) && comInscritos.has(a.id));
  if (removidaComGente) {
    return {
      error:
        "Uma das funções que você tirou já tem gente inscrita. Remova as pessoas dessa função primeiro — " +
        "elas some" + "riam da lista sem saber.",
    };
  }

  for (const atual of atuais) {
    if (!mantidas.has(atual.funcao_id)) {
      await supabase.from("jogo_vagas_staff_funcoes").delete().eq("id", atual.id);
    }
  }

  for (const f of funcoes) {
    const existente = atuais.find((a) => a.funcao_id === f.funcao_id);
    if (existente) {
      await supabase
        .from("jogo_vagas_staff_funcoes")
        .update({ quantidade: f.quantidade, horario_apresentacao: f.horario_apresentacao })
        .eq("id", existente.id);
    } else {
      await supabase.from("jogo_vagas_staff_funcoes").insert({ ...f, vagas_id: vagasId });
    }
  }

  revalidatePath(`/jogos/${jogoId}/vagas`);
  return { success: true };
}

/** Abre ou fecha a captação. Fechar não apaga nada — o link passa a mostrar "encerrado". */
export async function alternarVagasAbertas(jogoId: string, formData: FormData): Promise<void> {
  const abrir = String(formData.get("abrir") ?? "") === "1";
  const supabase = createClient();
  await supabase.from("jogo_vagas_staff").update({ aberto: abrir }).eq("jogo_id", jogoId);
  revalidatePath(`/jogos/${jogoId}/vagas`);
}

/** Tira alguém da lista — a vaga volta a aparecer como livre no link. */
export async function removerInscricao(jogoId: string, formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("jogo_vagas_staff_inscricoes").delete().eq("id", id);
  revalidatePath(`/jogos/${jogoId}/vagas`);
}

/**
 * Chama alguém da lista de espera. É manual de propósito: quando abre uma vaga por desistência, a
 * escolha de quem entra costuma depender de quem está mais perto ou já trabalhou naquela função —
 * promover o primeiro da fila automaticamente tiraria essa decisão do Mateus.
 */
export async function chamarDaEspera(jogoId: string, formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("jogo_vagas_staff_inscricoes").update({ situacao: "confirmado" }).eq("id", id);
  revalidatePath(`/jogos/${jogoId}/vagas`);
}

/**
 * Coloca alguém na lista direto, sem passar pelo link público — ver a explicação em
 * `components/adicionar-staff-vaga-form.tsx`. A pessoa e a função/vaga são escolhidas à mão pelo
 * Mateus, então não faz o cruzamento automático de função que o link público faz (é justamente
 * esse cruzamento que pode falhar). Igual à troca de função e ao "Chamar" da espera, não trava por
 * limite de vaga — entra como 'confirmado' mesmo se a função já estiver cheia, porque quem está
 * usando esta porta já sabe o que está fazendo.
 */
export async function adicionarStaffManual(
  jogoId: string,
  _prevState: AdicionarStaffVagaState,
  formData: FormData,
): Promise<AdicionarStaffVagaState> {
  const staffId = texto(formData, "staffId");
  const vagaFuncaoId = texto(formData, "vagaFuncaoId");
  if (!staffId || !vagaFuncaoId) return { error: "Escolha a pessoa e a função." };

  const supabase = createClient();
  const vagasId = await idDasVagas(supabase, jogoId);
  if (!vagasId) return { error: "Abra as vagas deste jogo antes de adicionar alguém." };

  const { error } = await supabase.from("jogo_vagas_staff_inscricoes").insert({
    vagas_id: vagasId,
    vaga_funcao_id: vagaFuncaoId,
    staff_id: staffId,
    situacao: "confirmado",
  });

  if (error) {
    if (error.code === "23505") return { error: "Essa pessoa já está na lista deste jogo." };
    return { error: `Não foi possível adicionar: ${error.message}` };
  }

  revalidatePath(`/jogos/${jogoId}/vagas`);
  return { success: true };
}

/**
 * Move alguém pra outra função do mesmo jogo — a pessoa pegou a vaga errada, ou o Mateus precisa
 * remanejar pra cobrir um buraco. Não trava por limite de vaga da função de destino: a tela já
 * mostra quantas vagas cada função tem preenchidas, então quem decide com essa informação na mão é
 * o Mateus, não o sistema (mesmo raciocínio de `chamarDaEspera` acima).
 */
export async function trocarFuncaoInscricao(jogoId: string, formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const vagaFuncaoId = String(formData.get("vagaFuncaoId") ?? "");
  if (!id || !vagaFuncaoId) return;
  const supabase = createClient();
  await supabase.from("jogo_vagas_staff_inscricoes").update({ vaga_funcao_id: vagaFuncaoId }).eq("id", id);
  revalidatePath(`/jogos/${jogoId}/vagas`);
}
