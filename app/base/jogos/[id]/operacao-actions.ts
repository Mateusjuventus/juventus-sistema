"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TipoQuarto } from "@/lib/supabase/types";
import { chavePixValida } from "@/lib/validation/chave-pix";

/**
 * Espelha `app/jogos/[id]/operacao-actions.ts` para o Futebol de Base: rooming list, ônibus e
 * recibo de pagamento (Credenciamento por zona fica fora de escopo, ver a spec).
 */

function revalidarAbaBase(jogoId: string, aba: "rooming-list" | "onibus" | "recibo") {
  revalidatePath(`/base/jogos/${jogoId}/${aba}`);
}

const LIMITE_POR_TIPO_QUARTO: Record<TipoQuarto, number> = { single: 1, duplo: 2, triplo: 3 };
const LABEL_TIPO_QUARTO: Record<TipoQuarto, string> = { single: "single", duplo: "duplo", triplo: "triplo" };

// =========================================================
// ROOMING LIST
// =========================================================

export interface RoomingListFormState {
  error?: string;
  success?: boolean;
}

export async function saveRoomingListBase(
  _prevState: RoomingListFormState,
  formData: FormData,
): Promise<RoomingListFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  if (!jogoId) return { error: "Jogo não identificado. Recarregue a página e tente novamente." };

  const hotelNome = String(formData.get("hotelNome") ?? "").trim() || null;
  const hotelEndereco = String(formData.get("hotelEndereco") ?? "").trim() || null;
  const checkin = String(formData.get("checkin") ?? "").trim() || null;
  const checkout = String(formData.get("checkout") ?? "").trim() || null;
  const quartosCount = Number(formData.get("quartosCount") ?? 0) || 0;

  const quartos: { tipo: TipoQuarto; numeroApartamento: string | null }[] = [];
  for (let i = 0; i < quartosCount; i++) {
    const tipo = String(formData.get(`quarto_${i}_tipo`) ?? "");
    if (tipo === "single" || tipo === "duplo" || tipo === "triplo") {
      const numeroApartamento = String(formData.get(`quarto_${i}_numero_apartamento`) ?? "").trim() || null;
      quartos.push({ tipo, numeroApartamento });
    }
  }

  const ocupacaoPorQuarto = new Map<number, { pessoaTipo: "atleta" | "comissao" | "staff"; pessoaId: string }[]>();
  for (const [key, value] of formData.entries()) {
    const valueStr = String(value);
    if (!valueStr) continue;
    let pessoaTipo: "atleta" | "comissao" | "staff" | null = null;
    if (key.startsWith("pessoa_atleta_")) pessoaTipo = "atleta";
    else if (key.startsWith("pessoa_comissao_")) pessoaTipo = "comissao";
    else if (key.startsWith("pessoa_staff_")) pessoaTipo = "staff";
    if (!pessoaTipo) continue;

    const pessoaId = key.slice(`pessoa_${pessoaTipo}_`.length);
    const quartoIndex = Number(valueStr);
    if (Number.isNaN(quartoIndex) || quartoIndex < 0 || quartoIndex >= quartos.length) continue;
    const lista = ocupacaoPorQuarto.get(quartoIndex) ?? [];
    lista.push({ pessoaTipo, pessoaId });
    ocupacaoPorQuarto.set(quartoIndex, lista);
  }

  for (let i = 0; i < quartos.length; i++) {
    const ocupantes = ocupacaoPorQuarto.get(i) ?? [];
    const limite = LIMITE_POR_TIPO_QUARTO[quartos[i].tipo];
    if (ocupantes.length > limite) {
      return {
        error: `O quarto ${i + 1} (${LABEL_TIPO_QUARTO[quartos[i].tipo]}) tem mais gente do que o tipo de quarto permite. Ajuste antes de salvar.`,
      };
    }
  }

  const supabase = createClient();

  const { data: roomingList, error: roomingListError } = await supabase
    .from("rooming_list_base")
    .upsert(
      { jogo_id: jogoId, hotel_nome: hotelNome, hotel_endereco: hotelEndereco, checkin, checkout },
      { onConflict: "jogo_id" },
    )
    .select("id")
    .single();

  if (roomingListError || !roomingList) {
    return { error: "Não foi possível salvar a rooming list. Tente novamente." };
  }

  const roomingListId = roomingList.id as string;

  await supabase.from("rooming_list_quartos_base").delete().eq("rooming_list_id", roomingListId);

  for (let i = 0; i < quartos.length; i++) {
    const { data: quartoRow, error: quartoError } = await supabase
      .from("rooming_list_quartos_base")
      .insert({
        rooming_list_id: roomingListId,
        tipo: quartos[i].tipo,
        ordem: i + 1,
        numero_apartamento: quartos[i].numeroApartamento,
      })
      .select("id")
      .single();

    if (quartoError || !quartoRow) {
      return { error: "Não foi possível salvar os quartos. Tente novamente." };
    }

    const ocupantes = ocupacaoPorQuarto.get(i) ?? [];
    if (ocupantes.length > 0) {
      const { error: ocupantesError } = await supabase.from("rooming_list_ocupantes_base").insert(
        ocupantes.map((o) => ({
          quarto_id: quartoRow.id,
          pessoa_tipo: o.pessoaTipo,
          pessoa_id: o.pessoaId,
        })),
      );
      if (ocupantesError) {
        return { error: `Não foi possível salvar as pessoas do quarto ${i + 1}. Tente novamente.` };
      }
    }
  }

  revalidarAbaBase(jogoId, "rooming-list");
  return { success: true };
}

// =========================================================
// ÔNIBUS
// =========================================================

export interface OnibusFormState {
  error?: string;
  success?: boolean;
}

/** Espelha `saveOnibus` de `app/jogos/[id]/operacao-actions.ts` para o Futebol de Base. */
export async function saveOnibusBase(
  _prevState: OnibusFormState,
  formData: FormData,
): Promise<OnibusFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  if (!jogoId) return { error: "Jogo não identificado. Recarregue a página e tente novamente." };

  const horario = String(formData.get("horario") ?? "").trim() || null;

  const passageiros: { pessoaTipo: "atleta" | "comissao"; pessoaId: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (String(value) !== "on") continue;
    let pessoaTipo: "atleta" | "comissao" | null = null;
    if (key.startsWith("vai_atleta_")) pessoaTipo = "atleta";
    else if (key.startsWith("vai_comissao_")) pessoaTipo = "comissao";
    if (!pessoaTipo) continue;
    passageiros.push({ pessoaTipo, pessoaId: key.slice(`vai_${pessoaTipo}_`.length) });
  }

  const supabase = createClient();

  const { data: onibusExistente } = await supabase
    .from("onibus_lista_base")
    .select("id")
    .eq("jogo_id", jogoId)
    .eq("onibus_numero", 1)
    .maybeSingle();

  let onibusId = (onibusExistente as { id: string } | null)?.id;

  if (onibusId) {
    const { error } = await supabase
      .from("onibus_lista_base")
      .update({ horario_saida: horario })
      .eq("id", onibusId);
    if (error) return { error: "Não foi possível salvar a lista de ônibus. Tente novamente." };
    const { error: deleteError } = await supabase
      .from("onibus_passageiros_base")
      .delete()
      .eq("onibus_lista_id", onibusId);
    if (deleteError) return { error: "Não foi possível salvar a lista de ônibus. Tente novamente." };
  } else {
    const { data: onibusRow, error } = await supabase
      .from("onibus_lista_base")
      .insert({ jogo_id: jogoId, onibus_numero: 1, horario_saida: horario })
      .select("id")
      .single();
    if (error || !onibusRow) return { error: "Não foi possível salvar a lista de ônibus. Tente novamente." };
    onibusId = (onibusRow as { id: string }).id;
  }

  if (passageiros.length > 0) {
    const { error: passageirosError } = await supabase.from("onibus_passageiros_base").insert(
      passageiros.map((p) => ({
        onibus_lista_id: onibusId,
        pessoa_tipo: p.pessoaTipo,
        pessoa_id: p.pessoaId,
      })),
    );
    if (passageirosError) {
      return { error: "Não foi possível salvar os passageiros do ônibus. Tente novamente." };
    }
  }

  revalidarAbaBase(jogoId, "onibus");
  return { success: true };
}

// =========================================================
// RECIBO DE PAGAMENTO
// =========================================================

export interface ReciboFormState {
  error?: string;
  success?: boolean;
}

/** Espelha `saveRecibo` (app/jogos/[id]/operacao-actions.ts) — Recibo de Pagamento é só pra Staff
 * Operacional, Comissão Técnica não entra aqui. */
export async function saveReciboBase(
  _prevState: ReciboFormState,
  formData: FormData,
): Promise<ReciboFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  if (!jogoId) return { error: "Jogo não identificado. Recarregue a página e tente novamente." };

  const linhas: {
    pessoaTipo: "staff";
    pessoaId: string;
    nome: string;
    funcaoJogo: string | null;
    valor: number | null;
    chavePix: string | null;
    chavePixTipo: "cpf" | "cnpj" | "email" | "telefone" | "aleatoria" | null;
    pago: boolean;
  }[] = [];

  // O checkbox "Incluir" é quem decide quem participa desse jogo — só pessoas marcadas viram
  // linha em recibos_jogo_base (e por consequência entram nos PDFs). Checkbox desmarcado não é
  // enviado no FormData, então o loop já pula naturalmente quem foi desmarcado.
  for (const [key] of formData.entries()) {
    if (!key.startsWith("incluir_staff_")) continue;
    const pessoaTipo = "staff";
    const pessoaId = key.slice(`incluir_${pessoaTipo}_`.length);
    const funcaoJogo = String(formData.get(`funcao_${pessoaTipo}_${pessoaId}`) ?? "").trim() || null;
    const valorRaw = String(formData.get(`valor_${pessoaTipo}_${pessoaId}`) ?? "").trim();
    const valor = valorRaw ? Number(valorRaw) : null;
    const chavePix = String(formData.get(`chavePix_${pessoaTipo}_${pessoaId}`) ?? "").trim() || null;
    const chavePixTipoRaw = String(formData.get(`chavePixTipo_${pessoaTipo}_${pessoaId}`) ?? "");
    const chavePixTipo =
      chavePixTipoRaw === "cpf" ||
      chavePixTipoRaw === "cnpj" ||
      chavePixTipoRaw === "email" ||
      chavePixTipoRaw === "telefone" ||
      chavePixTipoRaw === "aleatoria"
        ? chavePixTipoRaw
        : null;
    const pago = formData.get(`pago_${pessoaTipo}_${pessoaId}`) === "on";
    const nome = String(formData.get(`nome_${pessoaTipo}_${pessoaId}`) ?? "") || "essa pessoa";
    linhas.push({
      pessoaTipo,
      pessoaId,
      nome,
      funcaoJogo,
      valor: Number.isNaN(valor) ? null : valor,
      chavePix,
      chavePixTipo,
      pago,
    });
  }

  for (const linha of linhas) {
    if (!chavePixValida(linha.chavePix, linha.chavePixTipo)) {
      return {
        error: `Chave PIX incompleta para o tipo selecionado (${linha.nome}). Confira antes de salvar.`,
      };
    }
  }

  const supabase = createClient();

  await supabase.from("recibos_jogo_base").delete().eq("jogo_id", jogoId);

  if (linhas.length > 0) {
    const { error: insertError } = await supabase.from("recibos_jogo_base").insert(
      linhas.map((l) => ({
        jogo_id: jogoId,
        pessoa_tipo: l.pessoaTipo,
        pessoa_id: l.pessoaId,
        funcao_jogo: l.funcaoJogo,
        valor: l.valor,
        chave_pix: l.chavePix,
        chave_pix_tipo: l.chavePixTipo,
        pago: l.pago,
      })),
    );
    if (insertError) {
      console.error("saveReciboBase: falha ao inserir em recibos_jogo_base", insertError);
      // 23514 = violação de check constraint — ver o mesmo tratamento em saveRecibo
      // (app/jogos/[id]/operacao-actions.ts) para detalhes da migração 0039.
      if (insertError.code === "23514") {
        return {
          error:
            "Não foi possível salvar: o tipo de chave PIX de alguém aqui (Telefone, CNPJ ou Aleatória) ainda não é aceito pelo banco de dados. É preciso rodar a migração 0039_chave_pix_aleatoria_e_unificacao_recibo.sql no Supabase antes de salvar recibos com esse tipo.",
        };
      }
      return { error: "Não foi possível salvar os recibos. Tente novamente." };
    }
  }

  revalidarAbaBase(jogoId, "recibo");
  return { success: true };
}
