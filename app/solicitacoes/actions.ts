"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hojeBrasilia } from "@/lib/data-brasil";
import { uploadItemFotoIfPresent } from "@/lib/solicitacao-itens-upload";
import { recalcularValorTotal } from "@/lib/solicitacao-valor-total";
import { solicitacaoSchema, solicitacaoStatusSchema } from "@/lib/validation/schemas";
import type { SolicitacaoItemRow, SolicitacaoRow, SolicitacaoTipo } from "@/lib/supabase/types";

/** Tipos que recalculam o valor total a partir da soma dos itens (ver recalcularValorTotal). */
const TIPOS_COM_VALOR_CALCULADO: SolicitacaoTipo[] = ["pagamento", "reembolso", "transporte", "hospedagem"];

/** Próximo número sequencial da fila de Solicitações do Futebol Profissional — cada departamento
 * tem sua própria sequência independente (ver solicitacoes_base para o Futebol de Base). */
async function proximoNumero(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { data } = await supabase
    .from("solicitacoes")
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.numero ?? 0) + 1;
}

export interface SolicitacaoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

/** Tipos de solicitação que têm lista de itens. */
const TIPOS_COM_ITENS: SolicitacaoTipo[] = [
  "compra",
  "pagamento",
  "reembolso",
  "passagem_aerea",
  "exame_medico",
  "transporte",
  "hospedagem",
];

function parseForm(formData: FormData) {
  const raw = {
    tipo: String(formData.get("tipo") ?? ""),
    dataSolicitacao: String(formData.get("dataSolicitacao") ?? ""),
    solicitante: String(formData.get("solicitante") ?? ""),
    setor: String(formData.get("setor") ?? ""),
    descricaoNecessidade: String(formData.get("descricaoNecessidade") ?? ""),
    prazoSugerido: String(formData.get("prazoSugerido") ?? ""),
    valor: String(formData.get("valor") ?? "") || undefined,
    chavePix: String(formData.get("chavePix") ?? ""),
    chavePixTipo: String(formData.get("chavePixTipo") ?? ""),
    banco: String(formData.get("banco") ?? ""),
    agencia: String(formData.get("agencia") ?? ""),
    conta: String(formData.get("conta") ?? ""),
    tipoConta: String(formData.get("tipoConta") ?? ""),
    titularConta: String(formData.get("titularConta") ?? ""),
  };

  const result = solicitacaoSchema.safeParse(raw);
  return { raw, result };
}

/**
 * Salva os itens de uma solicitação já na criação/edição, direto do mesmo formulário — os nomes
 * dos campos que se repetem (um trio/conjunto por linha adicionada, ver
 * app/solicitacoes/solicitacao-form.tsx) mudam conforme o tipo:
 * - Compra: itemItem / itemQuantidade / itemFoto
 * - Pagamento / Reembolso: itemDescricao / itemObservacao / itemValor
 * - Passagem Aérea: itemPassageiro / itemOrigem / itemDestino / itemDataVoo / itemHorarioVoo / itemObservacao
 * - Transporte: mesmos campos de Passagem Aérea, mais itemValor
 * - Hospedagem: itemPassageiro / itemCidade / itemHotel / itemDataEntrada / itemDataSaida / itemTipoAcomodacao / itemValor / itemObservacao
 * Linhas em branco (sem o campo principal preenchido) são ignoradas. Depois de salvar os itens de
 * Pagamento/Reembolso/Transporte/Hospedagem, o valor total da solicitação é recalculado como a
 * soma de todos os itens.
 */
async function salvarItensInline(
  supabase: ReturnType<typeof createClient>,
  formData: FormData,
  solicitacaoId: string,
  tipo: SolicitacaoTipo,
): Promise<{ error?: string }> {
  if (tipo === "compra") {
    const quantidades = formData.getAll("itemQuantidade").map(String);
    const descricoes = formData.getAll("itemItem").map(String);
    const observacoes = formData.getAll("itemObservacao").map(String);
    const fotos = formData.getAll("itemFoto");

    let ordem = 0;
    for (let i = 0; i < descricoes.length; i++) {
      const item = descricoes[i]?.trim();
      if (!item) continue;
      const quantidade = quantidades[i]?.trim() || "1";

      const id = randomUUID();
      const { error: uploadError, path: fotoPath } = await uploadItemFotoIfPresent(supabase, fotos[i] ?? null, id);
      if (uploadError) return { error: uploadError };

      const { error } = await supabase.from("solicitacao_itens").insert({
        id,
        solicitacao_id: solicitacaoId,
        quantidade,
        item,
        observacao: observacoes[i]?.trim() || null,
        foto_path: fotoPath ?? null,
        ordem: ordem++,
      });
      if (error) return { error: "Não foi possível salvar os itens. Tente novamente." };
    }
    return {};
  }

  if (tipo === "pagamento" || tipo === "reembolso") {
    const descricoes = formData.getAll("itemDescricao").map(String);
    const observacoes = formData.getAll("itemObservacao").map(String);
    const valores = formData.getAll("itemValor").map(String);

    let ordem = 0;
    for (let i = 0; i < descricoes.length; i++) {
      const descricao = descricoes[i]?.trim();
      if (!descricao) continue;
      const valorStr = valores[i]?.trim();
      const valor = valorStr ? Number(valorStr) : null;

      const { error } = await supabase.from("solicitacao_itens").insert({
        id: randomUUID(),
        solicitacao_id: solicitacaoId,
        descricao,
        observacao: observacoes[i]?.trim() || null,
        valor,
        ordem: ordem++,
      });
      if (error) return { error: "Não foi possível salvar os itens. Tente novamente." };
    }

    await recalcularValorTotal(supabase, solicitacaoId);
    return {};
  }

  if (tipo === "passagem_aerea") {
    const passageiros = formData.getAll("itemPassageiro").map(String);
    const origens = formData.getAll("itemOrigem").map(String);
    const destinos = formData.getAll("itemDestino").map(String);
    const datasVoo = formData.getAll("itemDataVoo").map(String);
    const horariosVoo = formData.getAll("itemHorarioVoo").map(String);
    const observacoes = formData.getAll("itemObservacao").map(String);

    let ordem = 0;
    for (let i = 0; i < passageiros.length; i++) {
      const passageiro = passageiros[i]?.trim();
      if (!passageiro) continue;

      const { error } = await supabase.from("solicitacao_itens").insert({
        id: randomUUID(),
        solicitacao_id: solicitacaoId,
        passageiro,
        origem: origens[i]?.trim() || null,
        destino: destinos[i]?.trim() || null,
        data_voo: datasVoo[i]?.trim() || null,
        horario_voo: horariosVoo[i]?.trim() || null,
        observacao: observacoes[i]?.trim() || null,
        ordem: ordem++,
      });
      if (error) return { error: "Não foi possível salvar os itens. Tente novamente." };
    }
    return {};
  }

  if (tipo === "transporte") {
    const passageiros = formData.getAll("itemPassageiro").map(String);
    const origens = formData.getAll("itemOrigem").map(String);
    const destinos = formData.getAll("itemDestino").map(String);
    const datasVoo = formData.getAll("itemDataVoo").map(String);
    const horariosVoo = formData.getAll("itemHorarioVoo").map(String);
    const valores = formData.getAll("itemValor").map(String);
    const observacoes = formData.getAll("itemObservacao").map(String);

    let ordem = 0;
    for (let i = 0; i < passageiros.length; i++) {
      const passageiro = passageiros[i]?.trim();
      if (!passageiro) continue;
      const valorStr = valores[i]?.trim();
      const valor = valorStr ? Number(valorStr) : null;

      const { error } = await supabase.from("solicitacao_itens").insert({
        id: randomUUID(),
        solicitacao_id: solicitacaoId,
        passageiro,
        origem: origens[i]?.trim() || null,
        destino: destinos[i]?.trim() || null,
        data_voo: datasVoo[i]?.trim() || null,
        horario_voo: horariosVoo[i]?.trim() || null,
        valor,
        observacao: observacoes[i]?.trim() || null,
        ordem: ordem++,
      });
      if (error) return { error: "Não foi possível salvar os itens. Tente novamente." };
    }

    await recalcularValorTotal(supabase, solicitacaoId);
    return {};
  }

  if (tipo === "hospedagem") {
    const passageiros = formData.getAll("itemPassageiro").map(String);
    const cidades = formData.getAll("itemCidade").map(String);
    const hoteis = formData.getAll("itemHotel").map(String);
    const datasEntrada = formData.getAll("itemDataEntrada").map(String);
    const datasSaida = formData.getAll("itemDataSaida").map(String);
    const tiposAcomodacao = formData.getAll("itemTipoAcomodacao").map(String);
    const valores = formData.getAll("itemValor").map(String);
    const observacoes = formData.getAll("itemObservacao").map(String);

    let ordem = 0;
    for (let i = 0; i < passageiros.length; i++) {
      const passageiro = passageiros[i]?.trim();
      if (!passageiro) continue;
      const valorStr = valores[i]?.trim();
      const valor = valorStr ? Number(valorStr) : null;

      const { error } = await supabase.from("solicitacao_itens").insert({
        id: randomUUID(),
        solicitacao_id: solicitacaoId,
        passageiro,
        cidade: cidades[i]?.trim() || null,
        hotel: hoteis[i]?.trim() || null,
        data_entrada: datasEntrada[i]?.trim() || null,
        data_saida: datasSaida[i]?.trim() || null,
        tipo_acomodacao: tiposAcomodacao[i]?.trim() || null,
        valor,
        observacao: observacoes[i]?.trim() || null,
        ordem: ordem++,
      });
      if (error) return { error: "Não foi possível salvar os itens. Tente novamente." };
    }

    await recalcularValorTotal(supabase, solicitacaoId);
    return {};
  }

  if (tipo === "exame_medico") {
    const nomes = formData.getAll("itemPassageiro").map(String);
    const exames = formData.getAll("itemItem").map(String);
    const datasExame = formData.getAll("itemDataExame").map(String);
    const locais = formData.getAll("itemLocalExame").map(String);
    const observacoes = formData.getAll("itemObservacao").map(String);
    const houveTransportes = formData.getAll("itemHouveTransporte").map(String);
    const origens = formData.getAll("itemOrigem").map(String);
    const destinos = formData.getAll("itemDestino").map(String);
    const datasIda = formData.getAll("itemDataVoo").map(String);
    const horariosIda = formData.getAll("itemHorarioVoo").map(String);
    const origensVolta = formData.getAll("itemOrigemVolta").map(String);
    const destinosVolta = formData.getAll("itemDestinoVolta").map(String);
    const datasVolta = formData.getAll("itemDataVolta").map(String);
    const horariosVolta = formData.getAll("itemHorarioVolta").map(String);

    let ordem = 0;
    for (let i = 0; i < nomes.length; i++) {
      const nome = nomes[i]?.trim();
      if (!nome) continue;
      const houveTransporte = houveTransportes[i] === "sim";

      const { error } = await supabase.from("solicitacao_itens").insert({
        id: randomUUID(),
        solicitacao_id: solicitacaoId,
        passageiro: nome,
        item: exames[i]?.trim() || null,
        data_exame: datasExame[i]?.trim() || null,
        local_exame: locais[i]?.trim() || null,
        observacao: observacoes[i]?.trim() || null,
        houve_transporte: houveTransporte,
        origem: houveTransporte ? origens[i]?.trim() || null : null,
        destino: houveTransporte ? destinos[i]?.trim() || null : null,
        data_voo: houveTransporte ? datasIda[i]?.trim() || null : null,
        horario_voo: houveTransporte ? horariosIda[i]?.trim() || null : null,
        origem_volta: houveTransporte ? origensVolta[i]?.trim() || null : null,
        destino_volta: houveTransporte ? destinosVolta[i]?.trim() || null : null,
        data_volta: houveTransporte ? datasVolta[i]?.trim() || null : null,
        horario_volta: houveTransporte ? horariosVolta[i]?.trim() || null : null,
        ordem: ordem++,
      });
      if (error) return { error: "Não foi possível salvar os itens. Tente novamente." };
    }
    return {};
  }

  return {};
}

export async function createSolicitacao(
  _prevState: SolicitacaoFormState,
  formData: FormData,
): Promise<SolicitacaoFormState> {
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;
  const numero = await proximoNumero(supabase);

  const { data: criada, error } = await supabase
    .from("solicitacoes")
    .insert({
      numero,
      tipo: data.tipo,
      data_solicitacao: data.dataSolicitacao,
      solicitante: data.solicitante,
      setor: data.setor,
      descricao_necessidade: data.descricaoNecessidade || null,
      prazo_sugerido: data.prazoSugerido || null,
      valor: null,
      chave_pix: data.chavePix || null,
      chave_pix_tipo: data.chavePixTipo || null,
      banco: data.banco || null,
      agencia: data.agencia || null,
      conta: data.conta || null,
      tipo_conta: data.tipoConta || null,
      titular_conta: data.titularConta || null,
    })
    .select("id")
    .single();

  if (error || !criada) {
    return { error: "Não foi possível salvar a solicitação. Tente novamente.", values: raw };
  }

  if (TIPOS_COM_ITENS.includes(data.tipo)) {
    const { error: itensError } = await salvarItensInline(supabase, formData, criada.id, data.tipo);
    if (itensError) {
      return { error: `Solicitação salva, mas houve um problema com os itens: ${itensError}`, values: raw };
    }
  }

  revalidatePath("/solicitacoes");
  if (TIPOS_COM_ITENS.includes(data.tipo)) {
    redirect(`/solicitacoes/${criada.id}`);
  }
  redirect("/solicitacoes");
}

export async function updateSolicitacao(
  _prevState: SolicitacaoFormState,
  formData: FormData,
): Promise<SolicitacaoFormState> {
  const id = String(formData.get("id") ?? "");
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  const { error } = await supabase
    .from("solicitacoes")
    .update({
      tipo: data.tipo,
      data_solicitacao: data.dataSolicitacao,
      solicitante: data.solicitante,
      setor: data.setor,
      descricao_necessidade: data.descricaoNecessidade || null,
      prazo_sugerido: data.prazoSugerido || null,
      chave_pix: data.chavePix || null,
      chave_pix_tipo: data.chavePixTipo || null,
      banco: data.banco || null,
      agencia: data.agencia || null,
      conta: data.conta || null,
      tipo_conta: data.tipoConta || null,
      titular_conta: data.titularConta || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar a solicitação. Tente novamente.", values: raw };

  if (TIPOS_COM_ITENS.includes(data.tipo)) {
    const { error: itensError } = await salvarItensInline(supabase, formData, id, data.tipo);
    if (itensError) {
      return { error: `Solicitação salva, mas houve um problema com os itens: ${itensError}`, values: raw };
    }
  }

  revalidatePath("/solicitacoes");
  revalidatePath(`/solicitacoes/${id}`);
  redirect(`/solicitacoes/${id}`);
}

export async function deleteSolicitacao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();
  await supabase.from("solicitacoes").delete().eq("id", id);
  revalidatePath("/solicitacoes");
}

/**
 * Duplica uma solicitação inteira — dados da solicitação (tipo, solicitante, setor, chave PIX,
 * dados bancários etc.) e todos os seus itens (compra, pagamento, passageiros...). A cópia recebe
 * um número novo, status "Pendente" e a data de hoje (é um pedido novo), pra você poder ajustar só
 * o que for diferente em vez de preencher tudo de novo do zero.
 */
export async function duplicarSolicitacao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const { data: originalData } = await supabase.from("solicitacoes").select("*").eq("id", id).single();
  if (!originalData) return;
  const original = originalData as SolicitacaoRow;

  const numero = await proximoNumero(supabase);

  const { data: nova, error } = await supabase
    .from("solicitacoes")
    .insert({
      numero,
      tipo: original.tipo,
      data_solicitacao: hojeBrasilia(),
      solicitante: original.solicitante,
      setor: original.setor,
      descricao_necessidade: original.descricao_necessidade,
      prazo_sugerido: original.prazo_sugerido,
      valor: null,
      chave_pix: original.chave_pix,
      chave_pix_tipo: original.chave_pix_tipo,
      banco: original.banco,
      agencia: original.agencia,
      conta: original.conta,
      tipo_conta: original.tipo_conta,
      titular_conta: original.titular_conta,
      status: "pendente",
    })
    .select("id")
    .single();

  if (error || !nova) return;

  if (TIPOS_COM_ITENS.includes(original.tipo)) {
    const { data: itensData } = await supabase
      .from("solicitacao_itens")
      .select("*")
      .eq("solicitacao_id", id)
      .order("ordem", { ascending: true });
    const itens = (itensData ?? []) as SolicitacaoItemRow[];

    if (itens.length > 0) {
      await supabase.from("solicitacao_itens").insert(
        itens.map((item) => ({
          id: randomUUID(),
          solicitacao_id: nova.id,
          quantidade: item.quantidade,
          item: item.item,
          foto_path: item.foto_path,
          descricao: item.descricao,
          observacao: item.observacao,
          valor: item.valor,
          passageiro: item.passageiro,
          origem: item.origem,
          destino: item.destino,
          data_voo: item.data_voo,
          horario_voo: item.horario_voo,
          cidade: item.cidade,
          hotel: item.hotel,
          data_entrada: item.data_entrada,
          data_saida: item.data_saida,
          tipo_acomodacao: item.tipo_acomodacao,
          data_exame: item.data_exame,
          local_exame: item.local_exame,
          houve_transporte: item.houve_transporte,
          origem_volta: item.origem_volta,
          destino_volta: item.destino_volta,
          data_volta: item.data_volta,
          horario_volta: item.horario_volta,
          ordem: item.ordem,
        })),
      );
    }

    if (TIPOS_COM_VALOR_CALCULADO.includes(original.tipo)) {
      await recalcularValorTotal(supabase, nova.id);
    }
  }

  revalidatePath("/solicitacoes");
  redirect(`/solicitacoes/${nova.id}`);
}

/** Troca rápida de status direto na listagem, sem precisar abrir a solicitação para editar. */
export async function updateSolicitacaoStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("status") ?? "");
  const result = solicitacaoStatusSchema.safeParse({ status: raw });
  if (!result.success || !id) return;

  const supabase = createClient();
  await supabase.from("solicitacoes").update({ status: result.data.status }).eq("id", id);
  revalidatePath("/solicitacoes");
  revalidatePath(`/solicitacoes/${id}`);
}
