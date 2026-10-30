"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SumulaEventoTipo, SumulaTempo } from "@/lib/supabase/types";

/** Espelha `app/jogos/[id]/sumula/actions.ts` para o Futebol de Base. */

export interface DadosJogoFormState {
  error?: string;
  success?: boolean;
}

export async function salvarDadosJogoBase(
  _prevState: DadosJogoFormState,
  formData: FormData,
): Promise<DadosJogoFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  if (!jogoId) return { error: "Jogo não identificado. Recarregue a página e tente novamente." };

  const golsProRaw = String(formData.get("golsPro") ?? "").trim();
  const golsContraRaw = String(formData.get("golsContra") ?? "").trim();
  const penaltisProRaw = String(formData.get("penaltisPro") ?? "").trim();
  const penaltisContraRaw = String(formData.get("penaltisContra") ?? "").trim();
  const duracaoPrimeiroRaw = String(formData.get("duracaoPrimeiroTempo") ?? "").trim();
  const duracaoSegundoRaw = String(formData.get("duracaoSegundoTempo") ?? "").trim();
  // Só enviado pela tela quando o jogo está numa competição de 3 tempos (ver
  // docs/superpowers/specs/2026-10-21-competicoes-formato-partida-design.md) — ausente/branco em
  // todo o resto dos jogos, que continuam com só 2 tempos.
  const duracaoTerceiroRaw = String(formData.get("duracaoTerceiroTempo") ?? "").trim();
  // Acréscimo (tempo extra/compensação) de cada tempo, à parte da duração acima — ver
  // 0147_sumula_acrescimo.sql. Em branco conta como 0 (nenhum acréscimo), nunca obrigatório.
  const acrescimoPrimeiroRaw = String(formData.get("acrescimoPrimeiroTempo") ?? "").trim();
  const acrescimoSegundoRaw = String(formData.get("acrescimoSegundoTempo") ?? "").trim();
  const acrescimoTerceiroRaw = String(formData.get("acrescimoTerceiroTempo") ?? "").trim();

  const duracaoPrimeiro = Number(duracaoPrimeiroRaw);
  const duracaoSegundo = Number(duracaoSegundoRaw);
  if (!duracaoPrimeiroRaw || !duracaoSegundoRaw || Number.isNaN(duracaoPrimeiro) || Number.isNaN(duracaoSegundo)) {
    return { error: "Preencha a duração dos dois tempos." };
  }
  let duracaoTerceiro: number | null = null;
  if (duracaoTerceiroRaw) {
    duracaoTerceiro = Number(duracaoTerceiroRaw);
    if (Number.isNaN(duracaoTerceiro)) return { error: "Duração do 3º tempo inválida." };
  }

  const acrescimoPrimeiro = acrescimoPrimeiroRaw ? Number(acrescimoPrimeiroRaw) : 0;
  const acrescimoSegundo = acrescimoSegundoRaw ? Number(acrescimoSegundoRaw) : 0;
  const acrescimoTerceiro = acrescimoTerceiroRaw ? Number(acrescimoTerceiroRaw) : 0;
  if (
    Number.isNaN(acrescimoPrimeiro) ||
    Number.isNaN(acrescimoSegundo) ||
    Number.isNaN(acrescimoTerceiro) ||
    acrescimoPrimeiro < 0 ||
    acrescimoSegundo < 0 ||
    acrescimoTerceiro < 0
  ) {
    return { error: "Acréscimo inválido." };
  }

  const golsPro = golsProRaw ? Number(golsProRaw) : null;
  const golsContra = golsContraRaw ? Number(golsContraRaw) : null;
  if ((golsProRaw && Number.isNaN(golsPro)) || (golsContraRaw && Number.isNaN(golsContra))) {
    return { error: "Placar inválido." };
  }

  const penaltisPro = penaltisProRaw ? Number(penaltisProRaw) : null;
  const penaltisContra = penaltisContraRaw ? Number(penaltisContraRaw) : null;
  if ((penaltisProRaw && Number.isNaN(penaltisPro)) || (penaltisContraRaw && Number.isNaN(penaltisContra))) {
    return { error: "Placar de pênaltis inválido." };
  }

  const supabase = createClient();

  const [{ error: jogoError }, { error: sumulaError }] = await Promise.all([
    supabase
      .from("jogos")
      .update({ gols_pro: golsPro, gols_contra: golsContra, penaltis_pro: penaltisPro, penaltis_contra: penaltisContra })
      .eq("id", jogoId),
    supabase.from("sumulas").upsert(
      {
        jogo_id: jogoId,
        duracao_primeiro_tempo: duracaoPrimeiro,
        duracao_segundo_tempo: duracaoSegundo,
        duracao_terceiro_tempo: duracaoTerceiro,
        acrescimo_primeiro_tempo: acrescimoPrimeiro,
        acrescimo_segundo_tempo: acrescimoSegundo,
        acrescimo_terceiro_tempo: acrescimoTerceiro,
      },
      { onConflict: "jogo_id" },
    ),
  ]);

  if (jogoError || sumulaError) {
    return { error: "Não foi possível salvar os dados do jogo. Tente novamente." };
  }

  revalidatePath(`/base/jogos/${jogoId}/sumula`);
  revalidatePath(`/base/jogos/${jogoId}`);
  return { success: true };
}

export interface SumulaEventoFormState {
  error?: string;
  success?: boolean;
}

export async function adicionarEventoBase(
  _prevState: SumulaEventoFormState,
  formData: FormData,
): Promise<SumulaEventoFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  const tempo = String(formData.get("tempo") ?? "") as SumulaTempo;
  const tipo = String(formData.get("tipo") ?? "") as SumulaEventoTipo;
  const minutoRaw = String(formData.get("minuto") ?? "").trim();
  const atletaId = String(formData.get("atletaId") ?? "").trim();
  const atletaEntrouId = String(formData.get("atletaEntrouId") ?? "").trim();
  const atletaAssistenciaId = String(formData.get("atletaAssistenciaId") ?? "").trim();

  if (!jogoId) return { error: "Jogo não identificado. Recarregue a página e tente novamente." };
  if (tempo !== "primeiro" && tempo !== "segundo" && tempo !== "terceiro") return { error: "Tempo inválido." };
  if (!["gol", "cartao_amarelo", "cartao_vermelho", "substituicao"].includes(tipo)) {
    return { error: "Tipo de evento inválido." };
  }

  const minuto = Number(minutoRaw);
  if (!minutoRaw || Number.isNaN(minuto) || minuto < 0) {
    return { error: "Informe o minuto do evento." };
  }
  if (!atletaId) {
    return { error: tipo === "substituicao" ? "Selecione quem saiu." : "Selecione o atleta." };
  }
  if (tipo === "substituicao" && !atletaEntrouId) {
    return { error: "Selecione quem entrou." };
  }

  const supabase = createClient();

  const { data: sumula, error: sumulaError } = await supabase
    .from("sumulas")
    .upsert({ jogo_id: jogoId }, { onConflict: "jogo_id" })
    .select("id")
    .single();

  if (sumulaError || !sumula) {
    return { error: "Não foi possível salvar o evento. Tente novamente." };
  }

  const sumulaId = sumula.id as string;

  const { count } = await supabase
    .from("sumula_eventos")
    .select("*", { count: "exact", head: true })
    .eq("sumula_id", sumulaId);
  const proximaOrdem = count ?? 0;

  const { error: insertError } = await supabase.from("sumula_eventos").insert({
    sumula_id: sumulaId,
    tipo,
    tempo,
    minuto,
    atleta_id: atletaId,
    atleta_entrou_id: tipo === "substituicao" ? atletaEntrouId : null,
    atleta_assistencia_id: tipo === "gol" && atletaAssistenciaId ? atletaAssistenciaId : null,
    ordem: proximaOrdem,
  });

  if (insertError) {
    return { error: "Não foi possível salvar o evento. Tente novamente." };
  }

  revalidatePath(`/base/jogos/${jogoId}/sumula`);
  return { success: true };
}

export async function removerEventoBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const { data: evento } = await supabase
    .from("sumula_eventos")
    .select("sumula_id")
    .eq("id", id)
    .single();

  await supabase.from("sumula_eventos").delete().eq("id", id);

  if (evento) {
    const { data: sumula } = await supabase
      .from("sumulas")
      .select("jogo_id")
      .eq("id", evento.sumula_id)
      .single();
    if (sumula) revalidatePath(`/base/jogos/${sumula.jogo_id}/sumula`);
  }
}
