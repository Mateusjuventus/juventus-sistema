"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { lerChavePessoa, normalizarPlaca } from "@/lib/futebol/veiculo";

/**
 * Server Actions do cadastro de Veículos / Placas.
 *
 * A placa é gravada NORMALIZADA (só letras e números, maiúsculas — ver `normalizarPlaca`), pra
 * "abc-1234" e "ABC1234" não virarem dois cadastros do mesmo carro; a formatação com hífen é
 * decidida na hora de exibir. Placa fora dos padrões brasileiros não é bloqueada — o formulário
 * só avisa, porque existe carro estrangeiro e veículo especial.
 */

export interface VeiculoFormState {
  error?: string;
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function textoOuNull(formData: FormData, campo: string): string | null {
  const valor = texto(formData, campo);
  return valor === "" ? null : valor;
}

function dadosDoForm(formData: FormData) {
  // Vínculo com pessoa cadastrada é opcional e só vale completo (tipo + id) — a checagem
  // `veiculos_pessoa_completa` no banco garante o mesmo do outro lado.
  const pessoa = lerChavePessoa(texto(formData, "pessoa"));

  return {
    nome: texto(formData, "nome"),
    documento: textoOuNull(formData, "documento"),
    placa: normalizarPlaca(texto(formData, "placa")),
    modelo: textoOuNull(formData, "modelo"),
    marca: textoOuNull(formData, "marca"),
    cor: textoOuNull(formData, "cor"),
    ano: (() => {
      const valor = texto(formData, "ano");
      if (valor === "") return null;
      const n = Number(valor);
      return Number.isInteger(n) && n >= 1950 && n <= 2100 ? n : null;
    })(),
    pessoa_tipo: pessoa?.tipo ?? null,
    pessoa_id: pessoa?.id ?? null,
    telefone: textoOuNull(formData, "telefone"),
    observacoes: textoOuNull(formData, "observacoes"),
  };
}

function validar(dados: ReturnType<typeof dadosDoForm>): string | null {
  if (!dados.nome) return "Informe o nome do condutor/responsável pelo veículo.";
  if (!dados.placa) return "Informe a placa do veículo.";
  return null;
}

export async function criarVeiculo(
  _prevState: VeiculoFormState,
  formData: FormData,
): Promise<VeiculoFormState> {
  const dados = dadosDoForm(formData);
  const erro = validar(dados);
  if (erro) return { error: erro };

  const supabase = createClient();
  const { data, error } = await supabase.from("veiculos").insert(dados).select("id").single();
  if (error || !data) return { error: `Não foi possível salvar: ${error?.message ?? "erro desconhecido"}` };

  revalidatePath("/veiculos");
  redirect("/veiculos");
}

export async function atualizarVeiculo(
  veiculoId: string,
  _prevState: VeiculoFormState,
  formData: FormData,
): Promise<VeiculoFormState> {
  const dados = dadosDoForm(formData);
  const erro = validar(dados);
  if (erro) return { error: erro };

  const supabase = createClient();
  const { error } = await supabase.from("veiculos").update(dados).eq("id", veiculoId);
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/veiculos");
  revalidatePath(`/veiculos/${veiculoId}`);
  redirect("/veiculos");
}

/** Veículo vendido/trocado sai da lista de seleção da Relação de Placas sem apagar o cadastro. */
export async function alternarVeiculoAtivo(formData: FormData): Promise<void> {
  const veiculoId = String(formData.get("id") ?? "");
  const ativo = String(formData.get("ativo") ?? "") === "1";
  if (!veiculoId) return;
  const supabase = createClient();
  await supabase.from("veiculos").update({ ativo: !ativo }).eq("id", veiculoId);
  revalidatePath("/veiculos");
}

export async function excluirVeiculo(formData: FormData): Promise<void> {
  const veiculoId = String(formData.get("id") ?? "");
  if (!veiculoId) return;
  const supabase = createClient();
  await supabase.from("veiculos").delete().eq("id", veiculoId);
  revalidatePath("/veiculos");
  redirect("/veiculos");
}
