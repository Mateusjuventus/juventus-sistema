"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Actions do cadastro de Hotéis. Cadastro simples (sem arquivo, sem numeração): a única
 * regra é o nome ser obrigatório — todo o resto do hotel costuma chegar aos poucos, então exigir
 * mais campos só atrapalharia quem quer salvar o hotel já com o telefone na mão.
 */

export interface HotelFormState {
  error?: string;
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function textoOuNull(formData: FormData, campo: string): string | null {
  const valor = texto(formData, campo);
  return valor === "" ? null : valor;
}

function numeroOuNull(formData: FormData, campo: string): number | null {
  const valor = texto(formData, campo).replace(",", ".");
  if (valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function marcado(formData: FormData, campo: string): boolean {
  return formData.get(campo) !== null;
}

function dadosDoForm(formData: FormData) {
  return {
    nome: texto(formData, "nome"),
    cnpj: textoOuNull(formData, "cnpj"),
    logradouro: textoOuNull(formData, "logradouro"),
    numero: textoOuNull(formData, "numero"),
    complemento: textoOuNull(formData, "complemento"),
    bairro: textoOuNull(formData, "bairro"),
    cidade: textoOuNull(formData, "cidade"),
    uf: textoOuNull(formData, "uf")?.toUpperCase() ?? null,
    cep: textoOuNull(formData, "cep"),
    telefone: textoOuNull(formData, "telefone"),
    whatsapp: textoOuNull(formData, "whatsapp"),
    email: textoOuNull(formData, "email"),
    site: textoOuNull(formData, "site"),
    contato_nome: textoOuNull(formData, "contatoNome"),
    contato_funcao: textoOuNull(formData, "contatoFuncao"),
    contato_telefone: textoOuNull(formData, "contatoTelefone"),
    contato_email: textoOuNull(formData, "contatoEmail"),
    diaria_referencia: numeroOuNull(formData, "diariaReferencia"),
    cafe_incluso: marcado(formData, "cafeIncluso"),
    estacionamento_onibus: marcado(formData, "estacionamentoOnibus"),
    sala_refeicao_grupo: marcado(formData, "salaRefeicaoGrupo"),
    horario_checkin: textoOuNull(formData, "horarioCheckin"),
    horario_checkout: textoOuNull(formData, "horarioCheckout"),
    observacoes: textoOuNull(formData, "observacoes"),
  };
}

export async function criarHotel(_prevState: HotelFormState, formData: FormData): Promise<HotelFormState> {
  const dados = dadosDoForm(formData);
  if (!dados.nome) return { error: "Informe o nome do hotel." };

  const supabase = createClient();
  const { data, error } = await supabase.from("hoteis").insert(dados).select("id").single();
  if (error || !data) return { error: `Não foi possível salvar: ${error?.message ?? "erro desconhecido"}` };

  revalidatePath("/hoteis");
  redirect(`/hoteis/${data.id as string}`);
}

export async function atualizarHotel(
  hotelId: string,
  _prevState: HotelFormState,
  formData: FormData,
): Promise<HotelFormState> {
  const dados = dadosDoForm(formData);
  if (!dados.nome) return { error: "Informe o nome do hotel." };

  const supabase = createClient();
  const { error } = await supabase.from("hoteis").update(dados).eq("id", hotelId);
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/hoteis");
  revalidatePath(`/hoteis/${hotelId}`);
  redirect(`/hoteis/${hotelId}`);
}

/** Hotel que o clube parou de usar sai da lista principal sem ser apagado — a rooming list antiga
 * guarda o texto do hotel, mas o histórico do cadastro (contato, diária) ainda serve de consulta. */
export async function alternarHotelAtivo(formData: FormData): Promise<void> {
  const hotelId = String(formData.get("id") ?? "");
  const ativo = String(formData.get("ativo") ?? "") === "1";
  if (!hotelId) return;
  const supabase = createClient();
  await supabase.from("hoteis").update({ ativo: !ativo }).eq("id", hotelId);
  revalidatePath("/hoteis");
  revalidatePath(`/hoteis/${hotelId}`);
}

export async function excluirHotel(formData: FormData): Promise<void> {
  const hotelId = String(formData.get("id") ?? "");
  if (!hotelId) return;
  const supabase = createClient();
  await supabase.from("hoteis").delete().eq("id", hotelId);
  revalidatePath("/hoteis");
  redirect("/hoteis");
}
