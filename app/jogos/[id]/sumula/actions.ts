"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SumulaEventoTipo, SumulaTempo } from "@/lib/supabase/types";

export interface DadosJogoFormState {
  error?: string;
  success?: boolean;
}

/**
 * Salva o placar (escreve direto em `jogos.gols_pro`/`gols_contra` — mesma fonte de verdade da aba
 * "Dados do jogo") e a duração de cada tempo (`sumulas.duracao_primeiro_tempo`/`_segundo_tempo`).
 * O upsert por `jogo_id` cria a linha de `sumulas` na primeira vez que alguém salva aqui — mas
 * eventos podem ser lançados antes disso também (ver `adicionarEvento`, que faz o mesmo upsert).
 */
export async function salvarDadosJogo(
  _prevState: DadosJogoFormState,
  formData: FormData,
): Promise<DadosJogoFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  if (!jogoId) return { error: "Jogo não identificado. Recarregue a página e tente novamente." };

  const golsProRaw = String(formData.get("golsPro") ?? "").trim();
  const golsContraRaw = String(formData.get("golsContra") ?? "").trim();
  const duracaoPrimeiroRaw = String(formData.get("duracaoPrimeiroTempo") ?? "").trim();
  const duracaoSegundoRaw = String(formData.get("duracaoSegundoTempo") ?? "").trim();

  const duracaoPrimeiro = Number(duracaoPrimeiroRaw);
  const duracaoSegundo = Number(duracaoSegundoRaw);
  if (!duracaoPrimeiroRaw || !duracaoSegundoRaw || Number.isNaN(duracaoPrimeiro) || Number.isNaN(duracaoSegundo)) {
    return { error: "Preencha a duração dos dois tempos." };
  }

  const golsPro = golsProRaw ? Number(golsProRaw) : null;
  const golsContra = golsContraRaw ? Number(golsContraRaw) : null;
  if ((golsProRaw && Number.isNaN(golsPro)) || (golsContraRaw && Number.isNaN(golsContra))) {
    return { error: "Placar inválido." };
  }

  const supabase = createClient();

  const [{ error: jogoError }, { error: sumulaError }] = await Promise.all([
    supabase.from("jogos").update({ gols_pro: golsPro, gols_contra: golsContra }).eq("id", jogoId),
    supabase.from("sumulas").upsert(
      {
        jogo_id: jogoId,
        duracao_primeiro_tempo: duracaoPrimeiro,
        duracao_segundo_tempo: duracaoSegundo,
      },
      { onConflict: "jogo_id" },
    ),
  ]);

  if (jogoError || sumulaError) {
    return { error: "Não foi possível salvar os dados do jogo. Tente novamente." };
  }

  revalidatePath(`/jogos/${jogoId}/sumula`);
  revalidatePath(`/jogos/${jogoId}`);
  return { success: true };
}

export interface SumulaEventoFormState {
  error?: string;
  success?: boolean;
}

/**
 * Adiciona um evento à súmula — salva imediatamente (sem lote, ver a spec). Garante que a linha de
 * `sumulas` do jogo já existe (upsert por `jogo_id`, sem sobrescrever durações já salvas) antes de
 * inserir o evento, já que eventos podem ser o primeiro lançamento feito nesta aba.
 */
export async function adicionarEvento(
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
  if (tempo !== "primeiro" && tempo !== "segundo") return { error: "Tempo inválido." };
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

  revalidatePath(`/jogos/${jogoId}/sumula`);
  return { success: true };
}

/** Remove um evento — mesmo padrão do `DeleteButton` compartilhado (só recebe o `id`), busca a
 * súmula/jogo por trás pra saber qual página revalidar. */
export async function removerEvento(formData: FormData): Promise<void> {
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
    if (sumula) revalidatePath(`/jogos/${sumula.jogo_id}/sumula`);
  }
}
