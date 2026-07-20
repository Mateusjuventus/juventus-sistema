"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import {
  type AjusteEstoque,
} from "@/lib/estoque/estoque-ajustes";
import {
  calcularAjustesEstoqueBase,
  gravarPlanoAjustesBase,
  proximoNumeroBase,
} from "@/lib/estoque/estoque-ajustes-base";
import {
  ESTOQUE_ITEM_NOVO_VALUE,
  estoqueEntradaSchema,
  estoqueItemSchema,
  estoqueSaidaSchema,
} from "@/lib/validation/schemas";
import type { EstoqueEntradaItemBaseRow, EstoqueSaidaItemBaseRow } from "@/lib/supabase/types";

/**
 * Espelha `app/estoque/[categoria]/actions.ts` para o Futebol de Base — mesma lógica de
 * catálogo/Entrada/Saída, contra as tabelas `_base`, SEM nenhum parâmetro/coluna de categoria (o
 * Estoque do Base é uma lista única, só material esportivo — ver a spec).
 */
export interface EstoqueItemFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

export interface EstoqueMovimentoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

function parseItemForm(formData: FormData) {
  const raw = {
    nome: String(formData.get("nome") ?? ""),
    codigo: String(formData.get("codigo") ?? ""),
    mg: String(formData.get("mg") ?? ""),
  };
  const result = estoqueItemSchema.safeParse(raw);
  return { raw, result };
}

function buildTamanhos(formData: FormData): Record<string, number> {
  const tamanhosRaw = formData.getAll("itemTamanho").map(String);
  const quantidadesRaw = formData.getAll("itemQuantidade").map(String);
  const tamanhos: Record<string, number> = {};
  for (let i = 0; i < tamanhosRaw.length; i++) {
    const tamanho = tamanhosRaw[i]?.trim();
    if (!tamanho) continue;
    tamanhos[tamanho] = Number(quantidadesRaw[i]) || 0;
  }
  return tamanhos;
}

export async function createItemBase(
  _prevState: EstoqueItemFormState,
  formData: FormData,
): Promise<EstoqueItemFormState> {
  const { raw, result } = parseItemForm(formData);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const { error } = await supabase.from("estoque_itens_base").insert({
    nome: result.data.nome,
    codigo: result.data.codigo || null,
    mg: result.data.mg || null,
    tamanhos: buildTamanhos(formData),
  });
  if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };

  revalidatePath("/base/estoque");
  redirect("/base/estoque");
}

export async function updateItemBase(
  _prevState: EstoqueItemFormState,
  formData: FormData,
): Promise<EstoqueItemFormState> {
  const id = String(formData.get("id") ?? "");

  const { raw, result } = parseItemForm(formData);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("estoque_itens_base")
    .update({
      nome: result.data.nome,
      codigo: result.data.codigo || null,
      mg: result.data.mg || null,
      tamanhos: buildTamanhos(formData),
    })
    .eq("id", id);
  if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };

  revalidatePath("/base/estoque");
  redirect("/base/estoque");
}

export async function deleteItemBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();
  await supabase.from("estoque_itens_base").delete().eq("id", id);
  revalidatePath("/base/estoque");
}

function lerLinhasItens(formData: FormData, sinal: 1 | -1): AjusteEstoque[] {
  const itemIds = formData.getAll("itemId").map(String);
  const tamanhos = formData.getAll("itemTamanho").map(String);
  const quantidades = formData.getAll("itemQuantidade").map(String);

  const ajustes: AjusteEstoque[] = [];
  for (let i = 0; i < itemIds.length; i++) {
    const itemId = itemIds[i]?.trim();
    const tamanho = tamanhos[i]?.trim();
    const quantidade = Number(quantidades[i]);
    if (!itemId || !tamanho || !quantidade || quantidade <= 0) continue;
    ajustes.push({ itemId, tamanho, delta: sinal * quantidade });
  }
  return ajustes;
}

async function resolverItensEntradaBase(
  supabase: ReturnType<typeof createClient>,
  formData: FormData,
): Promise<{ error: string } | { ajustes: AjusteEstoque[] }> {
  const itemIds = formData.getAll("itemId").map(String);
  const nomes = formData.getAll("itemNome").map(String);
  const codigos = formData.getAll("itemCodigo").map(String);
  const tamanhos = formData.getAll("itemTamanho").map(String);
  const quantidades = formData.getAll("itemQuantidade").map(String);

  type Linha = { itemIdOuNovo: string; nome: string; codigo: string; tamanho: string; quantidade: number };
  const linhas: Linha[] = [];
  for (let i = 0; i < itemIds.length; i++) {
    const itemIdOuNovo = itemIds[i]?.trim();
    const tamanho = tamanhos[i]?.trim();
    const quantidade = Number(quantidades[i]);
    if (!itemIdOuNovo || !tamanho || !quantidade || quantidade <= 0) continue;
    linhas.push({
      itemIdOuNovo,
      nome: nomes[i]?.trim() ?? "",
      codigo: codigos[i]?.trim() ?? "",
      tamanho,
      quantidade,
    });
  }
  if (linhas.length === 0) return { ajustes: [] };

  const { data, error } = await supabase.from("estoque_itens_base").select("nome");
  if (error) return { error: "Não foi possível conferir o catálogo do estoque. Tente novamente." };
  const nomesExistentes = new Set(((data ?? []) as { nome: string }[]).map((it) => it.nome.trim().toLowerCase()));

  const novosPorNome = new Map<string, string>();
  const ajustes: AjusteEstoque[] = [];

  for (const linha of linhas) {
    if (linha.itemIdOuNovo !== ESTOQUE_ITEM_NOVO_VALUE) {
      ajustes.push({ itemId: linha.itemIdOuNovo, tamanho: linha.tamanho, delta: linha.quantidade });
      continue;
    }

    if (!linha.nome) {
      return { error: "Informe o nome do item nas linhas marcadas como \"+ Cadastrar item novo\"." };
    }
    const chave = linha.nome.toLowerCase();

    let itemId = novosPorNome.get(chave);
    if (!itemId) {
      if (nomesExistentes.has(chave)) {
        return {
          error: `Já existe um item chamado "${linha.nome}" no catálogo. Selecione-o na lista em vez de cadastrar novo.`,
        };
      }
      const { data: criado, error: criarError } = await supabase
        .from("estoque_itens_base")
        .insert({ nome: linha.nome, codigo: linha.codigo || null, tamanhos: {} })
        .select("id")
        .single();
      if (criarError || !criado) {
        return { error: `Não foi possível cadastrar o item "${linha.nome}". Tente novamente.` };
      }
      itemId = (criado as { id: string }).id;
      novosPorNome.set(chave, itemId);
    }

    ajustes.push({ itemId, tamanho: linha.tamanho, delta: linha.quantidade });
  }

  return { ajustes };
}

export async function createEntradaBase(
  _prevState: EstoqueMovimentoFormState,
  formData: FormData,
): Promise<EstoqueMovimentoFormState> {
  const raw = {
    data: String(formData.get("data") ?? ""),
    fornecedor: String(formData.get("fornecedor") ?? ""),
    notaFiscal: String(formData.get("notaFiscal") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  };
  const result = estoqueEntradaSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const resolvido = await resolverItensEntradaBase(supabase, formData);
  if ("error" in resolvido) return { error: resolvido.error, values: raw };
  const ajustes = resolvido.ajustes;
  if (ajustes.length === 0) {
    return { error: "Adicione pelo menos um item com tamanho e quantidade.", values: raw };
  }

  const calculo = await calcularAjustesEstoqueBase(supabase, ajustes);
  if ("error" in calculo) return { error: calculo.error, values: raw };

  const numero = await proximoNumeroBase(supabase, "estoque_entradas_base");
  const { data: entradaCriada, error: entradaError } = await supabase
    .from("estoque_entradas_base")
    .insert({
      numero,
      data: result.data.data,
      fornecedor: result.data.fornecedor || null,
      nota_fiscal: result.data.notaFiscal || null,
      observacoes: result.data.observacoes || null,
    })
    .select("id")
    .single();
  if (entradaError || !entradaCriada) {
    return { error: "Não foi possível registrar a entrada. Tente novamente.", values: raw };
  }

  let ordem = 0;
  for (const ajuste of ajustes) {
    const item = calculo.plano.itensPorId.get(ajuste.itemId);
    const { error: itemError } = await supabase.from("estoque_entrada_itens_base").insert({
      entrada_id: entradaCriada.id,
      item_id: ajuste.itemId,
      nome: item?.nome ?? "",
      tamanho: ajuste.tamanho,
      codigo: item?.codigo ?? null,
      quantidade: ajuste.delta,
      ordem: ordem++,
    });
    if (itemError) {
      return { error: "A entrada foi registrada, mas houve um problema ao salvar os itens.", values: raw };
    }
  }

  const ajusteError = await gravarPlanoAjustesBase(supabase, calculo.plano);
  if (ajusteError) return { error: ajusteError, values: raw };

  revalidatePath("/base/estoque");
  revalidatePath("/base/estoque/historico");
  redirect(`/base/estoque/entrada/${entradaCriada.id}`);
}

export async function createSaidaBase(
  _prevState: EstoqueMovimentoFormState,
  formData: FormData,
): Promise<EstoqueMovimentoFormState> {
  const raw = {
    data: String(formData.get("data") ?? ""),
    nomeDestinatario: String(formData.get("nomeDestinatario") ?? ""),
    funcao: String(formData.get("funcao") ?? ""),
    departamento: String(formData.get("departamento") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  };
  const result = estoqueSaidaSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const ajustes = lerLinhasItens(formData, -1);
  if (ajustes.length === 0) {
    return { error: "Adicione pelo menos um item com tamanho e quantidade.", values: raw };
  }

  const supabase = createClient();
  const calculo = await calcularAjustesEstoqueBase(supabase, ajustes);
  if ("error" in calculo) return { error: calculo.error, values: raw };

  const numero = await proximoNumeroBase(supabase, "estoque_saidas_base");
  const { data: saidaCriada, error: saidaError } = await supabase
    .from("estoque_saidas_base")
    .insert({
      numero,
      data: result.data.data,
      nome_destinatario: result.data.nomeDestinatario,
      funcao: result.data.funcao || null,
      departamento: result.data.departamento || null,
      observacoes: result.data.observacoes || null,
    })
    .select("id")
    .single();
  if (saidaError || !saidaCriada) {
    return { error: "Não foi possível registrar a saída. Tente novamente.", values: raw };
  }

  let ordem = 0;
  for (const ajuste of ajustes) {
    const item = calculo.plano.itensPorId.get(ajuste.itemId);
    const { error: itemError } = await supabase.from("estoque_saida_itens_base").insert({
      saida_id: saidaCriada.id,
      item_id: ajuste.itemId,
      nome: item?.nome ?? "",
      tamanho: ajuste.tamanho,
      codigo: item?.codigo ?? null,
      quantidade: -ajuste.delta,
      ordem: ordem++,
    });
    if (itemError) {
      return { error: "A saída foi registrada, mas houve um problema ao salvar os itens.", values: raw };
    }
  }

  const ajusteError = await gravarPlanoAjustesBase(supabase, calculo.plano);
  if (ajusteError) return { error: ajusteError, values: raw };

  revalidatePath("/base/estoque");
  revalidatePath("/base/estoque/historico");
  redirect(`/base/estoque/saida/${saidaCriada.id}`);
}

export async function deleteEntradaBase(formData: FormData): Promise<void> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: itensData } = await supabase
    .from("estoque_entrada_itens_base")
    .select("*")
    .eq("entrada_id", id);
  const itens = (itensData ?? []) as EstoqueEntradaItemBaseRow[];

  const ajustes: AjusteEstoque[] = itens
    .filter((item) => item.item_id && item.tamanho)
    .map((item) => ({ itemId: item.item_id as string, tamanho: item.tamanho as string, delta: -Number(item.quantidade) }));

  if (ajustes.length > 0) {
    const calculo = await calcularAjustesEstoqueBase(supabase, ajustes);
    if ("error" in calculo) return;

    await supabase.from("estoque_entrada_itens_base").delete().eq("entrada_id", id);
    await supabase.from("estoque_entradas_base").delete().eq("id", id);
    await gravarPlanoAjustesBase(supabase, calculo.plano);
  } else {
    await supabase.from("estoque_entrada_itens_base").delete().eq("entrada_id", id);
    await supabase.from("estoque_entradas_base").delete().eq("id", id);
  }

  revalidatePath("/base/estoque");
  revalidatePath("/base/estoque/historico");
  redirect("/base/estoque/historico");
}

export async function deleteSaidaBase(formData: FormData): Promise<void> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: itensData } = await supabase.from("estoque_saida_itens_base").select("*").eq("saida_id", id);
  const itens = (itensData ?? []) as EstoqueSaidaItemBaseRow[];

  const ajustes: AjusteEstoque[] = itens
    .filter((item) => item.item_id && item.tamanho)
    .map((item) => ({ itemId: item.item_id as string, tamanho: item.tamanho as string, delta: Number(item.quantidade) }));

  if (ajustes.length > 0) {
    const calculo = await calcularAjustesEstoqueBase(supabase, ajustes);
    if ("error" in calculo) return;

    await supabase.from("estoque_saida_itens_base").delete().eq("saida_id", id);
    await supabase.from("estoque_saidas_base").delete().eq("id", id);
    await gravarPlanoAjustesBase(supabase, calculo.plano);
  } else {
    await supabase.from("estoque_saida_itens_base").delete().eq("saida_id", id);
    await supabase.from("estoque_saidas_base").delete().eq("id", id);
  }

  revalidatePath("/base/estoque");
  revalidatePath("/base/estoque/historico");
  redirect("/base/estoque/historico");
}
