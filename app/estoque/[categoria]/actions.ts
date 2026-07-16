"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseCategoria } from "@/lib/estoque/categoria";
import {
  type AjusteEstoque,
  calcularAjustesEstoque,
  gravarPlanoAjustes,
  proximoNumero,
} from "@/lib/estoque/estoque-ajustes";
import { estoqueEntradaSchema, estoqueItemSchema, estoqueSaidaSchema } from "@/lib/validation/schemas";
import type { EstoqueCategoria, EstoqueItemRow } from "@/lib/supabase/types";

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

/** Monta o objeto {tamanho: quantidade} a partir das linhas dinâmicas do formulário (mesmo nome
 * repetido em cada linha — ver app/estoque/[categoria]/itens/item-form.tsx). Linhas sem tamanho
 * preenchido são ignoradas; se o mesmo tamanho aparecer duas vezes, a última linha vence. */
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

export async function createItem(
  _prevState: EstoqueItemFormState,
  formData: FormData,
): Promise<EstoqueItemFormState> {
  const categoria = parseCategoria(String(formData.get("categoria") ?? ""));
  if (!categoria) return { error: "Categoria inválida." };

  const { raw, result } = parseItemForm(formData);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const { error } = await supabase.from("estoque_itens").insert({
    categoria,
    nome: result.data.nome,
    codigo: result.data.codigo || null,
    mg: result.data.mg || null,
    tamanhos: buildTamanhos(formData),
  });
  if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };

  revalidatePath(`/estoque/${categoria}`);
  redirect(`/estoque/${categoria}`);
}

export async function updateItem(
  _prevState: EstoqueItemFormState,
  formData: FormData,
): Promise<EstoqueItemFormState> {
  const id = String(formData.get("id") ?? "");
  const categoria = parseCategoria(String(formData.get("categoria") ?? ""));
  if (!categoria) return { error: "Categoria inválida." };

  const { raw, result } = parseItemForm(formData);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("estoque_itens")
    .update({
      nome: result.data.nome,
      codigo: result.data.codigo || null,
      mg: result.data.mg || null,
      tamanhos: buildTamanhos(formData),
    })
    .eq("id", id);
  if (error) return { error: "Não foi possível salvar o item. Tente novamente.", values: raw };

  revalidatePath(`/estoque/${categoria}`);
  redirect(`/estoque/${categoria}`);
}

export async function deleteItem(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();
  // O botão de exclusão (components/delete-button.tsx) só manda o "id" — pra saber pra qual
  // categoria revalidar a página depois, busca o próprio item antes de apagar.
  const { data } = await supabase.from("estoque_itens").select("categoria").eq("id", id).single();
  await supabase.from("estoque_itens").delete().eq("id", id);
  if (data) revalidatePath(`/estoque/${(data as { categoria: string }).categoria}`);
}

/** Lê as linhas dinâmicas item/tamanho/quantidade comuns a Entrada e Saída (mesmos nomes de campo
 * nos dois formulários) e monta a lista de ajustes de quantidade. Linhas sem item, tamanho ou
 * quantidade preenchidos são ignoradas. `sinal` é +1 pra Entrada (soma) e -1 pra Saída (subtrai). */
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

/**
 * Lê as linhas dinâmicas da Entrada (nome/código/mg/tamanho/quantidade — ver EntradaItensFields em
 * ../movimento-itens-fields.tsx) e resolve cada uma pra um item do catálogo: se o nome digitado
 * bater (sem diferenciar maiúsculas/minúsculas) com um item já cadastrado na categoria, usa esse
 * item; senão, cadastra um item novo na hora (com o código/mg informados, se houver, e sem nenhum
 * tamanho/unidade ainda — a própria entrada é quem soma a quantidade logo em seguida). Assim, dá
 * pra lançar a entrada de um produto novo sem precisar cadastrar o item à parte antes. Linhas sem
 * nome, tamanho ou quantidade preenchidos são ignoradas.
 */
async function resolverItensEntrada(
  supabase: ReturnType<typeof createClient>,
  formData: FormData,
  categoria: EstoqueCategoria,
): Promise<{ error: string } | { ajustes: AjusteEstoque[] }> {
  const nomes = formData.getAll("itemNome").map(String);
  const codigos = formData.getAll("itemCodigo").map(String);
  const mgs = formData.getAll("itemMg").map(String);
  const tamanhos = formData.getAll("itemTamanho").map(String);
  const quantidades = formData.getAll("itemQuantidade").map(String);

  const linhas: { nome: string; codigo: string; mg: string; tamanho: string; quantidade: number }[] = [];
  for (let i = 0; i < nomes.length; i++) {
    const nome = nomes[i]?.trim();
    const tamanho = tamanhos[i]?.trim();
    const quantidade = Number(quantidades[i]);
    if (!nome || !tamanho || !quantidade || quantidade <= 0) continue;
    linhas.push({ nome, codigo: codigos[i]?.trim() ?? "", mg: mgs[i]?.trim() ?? "", tamanho, quantidade });
  }
  if (linhas.length === 0) return { ajustes: [] };

  const { data, error } = await supabase.from("estoque_itens").select("*").eq("categoria", categoria);
  if (error) return { error: "Não foi possível conferir o catálogo do estoque. Tente novamente." };
  const itensExistentes = (data ?? []) as EstoqueItemRow[];

  // Cache dos itens novos já cadastrados nesta mesma entrada, pra não cadastrar duas vezes o mesmo
  // nome se ele aparecer em mais de uma linha da mesma ficha.
  const novosPorNome = new Map<string, string>();
  const ajustes: AjusteEstoque[] = [];

  for (const linha of linhas) {
    const chave = linha.nome.toLowerCase();
    let itemId =
      itensExistentes.find((it) => it.nome.trim().toLowerCase() === chave)?.id ?? novosPorNome.get(chave);

    if (!itemId) {
      const { data: criado, error: criarError } = await supabase
        .from("estoque_itens")
        .insert({
          categoria,
          nome: linha.nome,
          codigo: linha.codigo || null,
          mg: linha.mg || null,
          tamanhos: {},
        })
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

export async function createEntrada(
  _prevState: EstoqueMovimentoFormState,
  formData: FormData,
): Promise<EstoqueMovimentoFormState> {
  const categoria = parseCategoria(String(formData.get("categoria") ?? ""));
  if (!categoria) return { error: "Categoria inválida." };

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
  const resolvido = await resolverItensEntrada(supabase, formData, categoria);
  if ("error" in resolvido) return { error: resolvido.error, values: raw };
  const ajustes = resolvido.ajustes;
  if (ajustes.length === 0) {
    return { error: "Adicione pelo menos um item com tamanho e quantidade.", values: raw };
  }

  const calculo = await calcularAjustesEstoque(supabase, ajustes);
  if ("error" in calculo) return { error: calculo.error, values: raw };

  const numero = await proximoNumero(supabase, "estoque_entradas", categoria);
  const { data: entradaCriada, error: entradaError } = await supabase
    .from("estoque_entradas")
    .insert({
      categoria,
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
    const { error: itemError } = await supabase.from("estoque_entrada_itens").insert({
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

  const ajusteError = await gravarPlanoAjustes(supabase, calculo.plano);
  if (ajusteError) return { error: ajusteError, values: raw };

  revalidatePath(`/estoque/${categoria}`);
  revalidatePath(`/estoque/${categoria}/historico`);
  redirect(`/estoque/${categoria}`);
}

export async function createSaida(
  _prevState: EstoqueMovimentoFormState,
  formData: FormData,
): Promise<EstoqueMovimentoFormState> {
  const categoria = parseCategoria(String(formData.get("categoria") ?? ""));
  if (!categoria) return { error: "Categoria inválida." };

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
  const calculo = await calcularAjustesEstoque(supabase, ajustes);
  if ("error" in calculo) return { error: calculo.error, values: raw };

  const numero = await proximoNumero(supabase, "estoque_saidas", categoria);
  const { data: saidaCriada, error: saidaError } = await supabase
    .from("estoque_saidas")
    .insert({
      categoria,
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
    const { error: itemError } = await supabase.from("estoque_saida_itens").insert({
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

  const ajusteError = await gravarPlanoAjustes(supabase, calculo.plano);
  if (ajusteError) return { error: ajusteError, values: raw };

  revalidatePath(`/estoque/${categoria}`);
  revalidatePath(`/estoque/${categoria}/historico`);
  redirect(`/estoque/${categoria}/saida/${saidaCriada.id}`);
}
