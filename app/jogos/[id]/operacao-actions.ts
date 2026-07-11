"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TipoQuarto } from "@/lib/supabase/types";

/**
 * Server actions das abas de "Operação de Jogo" (o que antes eram os módulos separados Logística
 * de Jogo e Operação de Jogo, agora unificados como abas do próprio jogo): rooming list, ônibus,
 * credenciamento por zona e recibo de pagamento.
 * Ver docs/superpowers/specs/2026-07-09-convocacao-presskit-logistica-design.md.
 */

function revalidateAba(jogoId: string, aba: "rooming-list" | "onibus" | "credenciamento" | "recibo") {
  revalidatePath(`/jogos/${jogoId}/${aba}`);
}

// =========================================================
// ROOMING LIST
// =========================================================

export interface RoomingListFormState {
  error?: string;
  success?: boolean;
}

export async function saveRoomingList(
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

  const ocupacaoPorQuarto = new Map<number, { pessoaTipo: "comissao" | "staff"; pessoaId: string }[]>();
  for (const [key, value] of formData.entries()) {
    const valueStr = String(value);
    if (!valueStr) continue;
    if (key.startsWith("pessoa_comissao_") || key.startsWith("pessoa_staff_")) {
      const pessoaTipo = key.startsWith("pessoa_comissao_") ? "comissao" : "staff";
      const pessoaId = key.slice(`pessoa_${pessoaTipo}_`.length);
      const quartoIndex = Number(valueStr);
      if (Number.isNaN(quartoIndex) || quartoIndex < 0 || quartoIndex >= quartos.length) continue;
      const lista = ocupacaoPorQuarto.get(quartoIndex) ?? [];
      lista.push({ pessoaTipo, pessoaId });
      ocupacaoPorQuarto.set(quartoIndex, lista);
    }
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
    .from("rooming_list")
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

  await supabase.from("rooming_list_quartos").delete().eq("rooming_list_id", roomingListId);

  for (let i = 0; i < quartos.length; i++) {
    const { data: quartoRow, error: quartoError } = await supabase
      .from("rooming_list_quartos")
      .insert({ rooming_list_id: roomingListId, tipo: quartos[i].tipo, ordem: i + 1 })
      .select("id")
      .single();

    if (quartoError || !quartoRow) {
      return { error: "Não foi possível salvar os quartos. Tente novamente." };
    }

    const ocupantes = ocupacaoPorQuarto.get(i) ?? [];
    if (ocupantes.length > 0) {
      await supabase.from("rooming_list_ocupantes").insert(
        ocupantes.map((o) => ({
          quarto_id: quartoRow.id,
          pessoa_tipo: o.pessoaTipo,
          pessoa_id: o.pessoaId,
        })),
      );
    }
  }

  revalidateAba(jogoId, "rooming-list");
  return { success: true };
}

// =========================================================
// ÔNIBUS
// =========================================================

export interface OnibusFormState {
  error?: string;
  success?: boolean;
}

export async function saveOnibus(
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
    .from("onibus_lista")
    .select("id")
    .eq("jogo_id", jogoId);
  const idsExistentes = (onibusExistentes ?? []).map((o) => o.id as string);
  if (idsExistentes.length > 0) {
    await supabase.from("onibus_lista").delete().in("id", idsExistentes);
  }

  for (let i = 0; i < onibusList.length; i++) {
    const { data: onibusRow, error: onibusError } = await supabase
      .from("onibus_lista")
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
      await supabase.from("onibus_passageiros").insert(
        passageiros.map((p) => ({
          onibus_lista_id: onibusRow.id,
          pessoa_tipo: p.pessoaTipo,
          pessoa_id: p.pessoaId,
        })),
      );
    }
  }

  revalidateAba(jogoId, "onibus");
  return { success: true };
}

// =========================================================
// CREDENCIAMENTO POR ZONA
// =========================================================

export interface CredenciamentoFormState {
  error?: string;
  success?: boolean;
}

export async function saveCredenciamento(
  _prevState: CredenciamentoFormState,
  formData: FormData,
): Promise<CredenciamentoFormState> {
  const jogoId = String(formData.get("jogoId") ?? "");
  if (!jogoId) return { error: "Jogo não identificado. Recarregue a página e tente novamente." };

  const atribuicoes: {
    pessoaTipo: "comissao" | "staff";
    pessoaId: string;
    catalogoId: string;
    vagaExtra: boolean;
  }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("pessoa_comissao_") && !key.startsWith("pessoa_staff_")) continue;
    const valueStr = String(value);
    if (!valueStr) continue;
    const pessoaTipo = key.startsWith("pessoa_comissao_") ? "comissao" : "staff";
    const pessoaId = key.slice(`pessoa_${pessoaTipo}_`.length);
    const vagaExtra = formData.get(`vagaExtra_${pessoaTipo}_${pessoaId}`) === "on";
    atribuicoes.push({ pessoaTipo, pessoaId, catalogoId: valueStr, vagaExtra });
  }

  const supabase = createClient();

  const { data: catalogoData } = await supabase.from("credenciamento_catalogo").select("*");
  const catalogo = new Map((catalogoData ?? []).map((c) => [c.id as string, c]));

  const usoPorCatalogo = new Map<string, number>();
  for (const a of atribuicoes) {
    if (a.vagaExtra) continue;
    usoPorCatalogo.set(a.catalogoId, (usoPorCatalogo.get(a.catalogoId) ?? 0) + 1);
  }

  const excedentes: string[] = [];
  for (const [catalogoId, uso] of usoPorCatalogo.entries()) {
    const item = catalogo.get(catalogoId);
    if (item && uso > item.vagas_totais) {
      excedentes.push(`${item.zona} / ${item.funcao} (${uso} de ${item.vagas_totais} vagas)`);
    }
  }

  if (excedentes.length > 0) {
    return {
      error: `Sem vagas suficientes em: ${excedentes.join("; ")}. Marque "vaga extra" para quem passar do limite, ou escolha outra função.`,
    };
  }

  await supabase.from("credenciamento_jogo").delete().eq("jogo_id", jogoId);

  if (atribuicoes.length > 0) {
    const { error: insertError } = await supabase.from("credenciamento_jogo").insert(
      atribuicoes.map((a) => ({
        jogo_id: jogoId,
        credenciamento_catalogo_id: a.catalogoId,
        pessoa_tipo: a.pessoaTipo,
        pessoa_id: a.pessoaId,
        vaga_extra: a.vagaExtra,
      })),
    );
    if (insertError) return { error: "Não foi possível salvar o credenciamento. Tente novamente." };
  }

  revalidateAba(jogoId, "credenciamento");
  return { success: true };
}

// =========================================================
// RECIBO DE PAGAMENTO
// =========================================================

export interface ReciboFormState {
  error?: string;
  success?: boolean;
}

export async function saveRecibo(
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

  await supabase.from("recibos_jogo").delete().eq("jogo_id", jogoId);

  if (linhas.length > 0) {
    const { error: insertError } = await supabase.from("recibos_jogo").insert(
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

  revalidateAba(jogoId, "recibo");
  return { success: true };
}
