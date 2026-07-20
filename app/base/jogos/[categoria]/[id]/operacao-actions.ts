"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TipoQuarto } from "@/lib/supabase/types";

/**
 * Espelha `app/jogos/[id]/operacao-actions.ts` para o Futebol de Base: rooming list, ônibus e
 * recibo de pagamento (Credenciamento por zona fica fora de escopo, ver a spec). Como essas
 * actions só recebem o `jogoId` pelo FormData (não a categoria), busca a categoria do próprio
 * jogo antes de revalidar — mesmo padrão usado em `deleteAtletaBase`/`deleteComissaoBase`.
 */

async function revalidarAbaBase(
  supabase: ReturnType<typeof createClient>,
  jogoId: string,
  aba: "rooming-list" | "onibus" | "recibo",
) {
  const { data: jogo } = await supabase.from("jogos_base").select("categoria").eq("id", jogoId).maybeSingle();
  if (jogo) revalidatePath(`/base/jogos/${jogo.categoria}/${jogoId}/${aba}`);
}

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

  const quartos: { tipo: TipoQuarto }[] = [];
  for (let i = 0; i < quartosCount; i++) {
    const tipo = String(formData.get(`quarto_${i}_tipo`) ?? "");
    if (tipo === "single" || tipo === "duplo") quartos.push({ tipo });
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
    const limite = quartos[i].tipo === "single" ? 1 : 2;
    if (ocupantes.length > limite) {
      return {
        error: `O quarto ${i + 1} (${quartos[i].tipo === "single" ? "single" : "duplo"}) tem mais gente do que o tipo de quarto permite. Ajuste antes de salvar.`,
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
      .insert({ rooming_list_id: roomingListId, tipo: quartos[i].tipo, ordem: i + 1 })
      .select("id")
      .single();

    if (quartoError || !quartoRow) {
      return { error: "Não foi possível salvar os quartos. Tente novamente." };
    }

    const ocupantes = ocupacaoPorQuarto.get(i) ?? [];
    if (ocupantes.length > 0) {
      await supabase.from("rooming_list_ocupantes_base").insert(
        ocupantes.map((o) => ({
          quarto_id: quartoRow.id,
          pessoa_tipo: o.pessoaTipo,
          pessoa_id: o.pessoaId,
        })),
      );
    }
  }

  await revalidarAbaBase(supabase, jogoId, "rooming-list");
  return { success: true };
}

// =========================================================
// ÔNIBUS
// =========================================================

export interface OnibusFormState {
  error?: string;
  success?: boolean;
}

export async function saveOnibusBase(
  _prevState: OnibusFormState,
  formData: FormData,
): Promise<OnibusFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  if (!jogoId) return { error: "Jogo não identificado. Recarregue a página e tente novamente." };

  const onibusCount = Number(formData.get("onibusCount") ?? 0) || 0;
  const onibusList: { numero: number; horario: string | null }[] = [];
  for (let i = 0; i < onibusCount; i++) {
    const numero = Number(formData.get(`onibus_${i}_numero`) ?? 0);
    if (!numero) continue;
    const horario = String(formData.get(`onibus_${i}_horario`) ?? "").trim() || null;
    onibusList.push({ numero, horario });
  }

  const passageirosPorOnibus = new Map<
    number,
    { pessoaTipo: "atleta" | "comissao" | "staff"; pessoaId: string }[]
  >();
  for (const [key, value] of formData.entries()) {
    const valueStr = String(value);
    if (!valueStr) continue;
    let pessoaTipo: "atleta" | "comissao" | "staff" | null = null;
    if (key.startsWith("pessoa_atleta_")) pessoaTipo = "atleta";
    else if (key.startsWith("pessoa_comissao_")) pessoaTipo = "comissao";
    else if (key.startsWith("pessoa_staff_")) pessoaTipo = "staff";
    if (!pessoaTipo) continue;

    const pessoaId = key.slice(`pessoa_${pessoaTipo}_`.length);
    const onibusIndex = Number(valueStr);
    if (Number.isNaN(onibusIndex) || onibusIndex < 0 || onibusIndex >= onibusList.length) continue;
    const lista = passageirosPorOnibus.get(onibusIndex) ?? [];
    lista.push({ pessoaTipo, pessoaId });
    passageirosPorOnibus.set(onibusIndex, lista);
  }

  const supabase = createClient();

  const { data: onibusExistentes } = await supabase
    .from("onibus_lista_base")
    .select("id")
    .eq("jogo_id", jogoId);
  const idsExistentes = (onibusExistentes ?? []).map((o) => o.id as string);
  if (idsExistentes.length > 0) {
    await supabase.from("onibus_lista_base").delete().in("id", idsExistentes);
  }

  for (let i = 0; i < onibusList.length; i++) {
    const { data: onibusRow, error: onibusError } = await supabase
      .from("onibus_lista_base")
      .insert({
        jogo_id: jogoId,
        onibus_numero: onibusList[i].numero,
        horario_saida: onibusList[i].horario,
      })
      .select("id")
      .single();

    if (onibusError || !onibusRow) {
      return { error: "Não foi possível salvar os ônibus. Tente novamente." };
    }

    const passageiros = passageirosPorOnibus.get(i) ?? [];
    if (passageiros.length > 0) {
      await supabase.from("onibus_passageiros_base").insert(
        passageiros.map((p) => ({
          onibus_lista_id: onibusRow.id,
          pessoa_tipo: p.pessoaTipo,
          pessoa_id: p.pessoaId,
        })),
      );
    }
  }

  await revalidarAbaBase(supabase, jogoId, "onibus");
  return { success: true };
}

// =========================================================
// RECIBO DE PAGAMENTO
// =========================================================

export interface ReciboFormState {
  error?: string;
  success?: boolean;
}

export async function saveReciboBase(
  _prevState: ReciboFormState,
  formData: FormData,
): Promise<ReciboFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  if (!jogoId) return { error: "Jogo não identificado. Recarregue a página e tente novamente." };

  const linhas: {
    pessoaTipo: "comissao" | "staff";
    pessoaId: string;
    funcaoJogo: string | null;
    valor: number | null;
    chavePix: string | null;
    chavePixTipo: "celular" | "email" | "cpf" | "aleatoria" | null;
    pago: boolean;
  }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("funcao_comissao_") && !key.startsWith("funcao_staff_")) continue;
    const pessoaTipo = key.startsWith("funcao_comissao_") ? "comissao" : "staff";
    const pessoaId = key.slice(`funcao_${pessoaTipo}_`.length);
    const funcaoJogo = String(value ?? "").trim() || null;
    const valorRaw = String(formData.get(`valor_${pessoaTipo}_${pessoaId}`) ?? "").trim();
    const valor = valorRaw ? Number(valorRaw) : null;
    const chavePix = String(formData.get(`chavePix_${pessoaTipo}_${pessoaId}`) ?? "").trim() || null;
    const chavePixTipoRaw = String(formData.get(`chavePixTipo_${pessoaTipo}_${pessoaId}`) ?? "");
    const chavePixTipo =
      chavePixTipoRaw === "celular" || chavePixTipoRaw === "email" || chavePixTipoRaw === "cpf" || chavePixTipoRaw === "aleatoria"
        ? chavePixTipoRaw
        : null;
    const pago = formData.get(`pago_${pessoaTipo}_${pessoaId}`) === "on";
    linhas.push({
      pessoaTipo,
      pessoaId,
      funcaoJogo,
      valor: Number.isNaN(valor) ? null : valor,
      chavePix,
      chavePixTipo,
      pago,
    });
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
    if (insertError) return { error: "Não foi possível salvar os recibos. Tente novamente." };
  }

  await revalidarAbaBase(supabase, jogoId, "recibo");
  return { success: true };
}
