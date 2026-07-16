"use client";

import { useState } from "react";
import { FieldGroup, FormSection, TextField } from "@/components/fields";
import { labelNomeItem, labelUnidade, placeholderUnidade } from "@/lib/estoque/labels";
import { ESTOQUE_ITEM_NOVO_VALUE } from "@/lib/validation/schemas";
import type { EstoqueCategoria, EstoqueItemRow } from "@/lib/supabase/types";

interface LinhaSaida {
  rowId: string;
  itemId: string;
}

/**
 * Linhas de item de uma Saída — sempre um item que já existe no catálogo (não dá pra retirar algo
 * que não está cadastrado), por isso é um <select> travado na lista atual. Mesmo padrão de lista
 * dinâmica já usado em Solicitações: cada linha usa os MESMOS nomes de campo
 * (itemId/itemTamanho/itemQuantidade); no servidor, lê-se todas as ocorrências na mesma ordem (ver
 * lerLinhasItens em ./actions.ts). A dica de "em estoque" abaixo de cada linha é só informativa —
 * se não houver quantidade suficiente do tamanho/unidade escolhido, o servidor recusa com uma
 * mensagem clara na hora de registrar.
 */
export function SaidaItensFields({ itens, categoria }: { itens: EstoqueItemRow[]; categoria: EstoqueCategoria }) {
  const [rows, setRows] = useState<LinhaSaida[]>(() => [{ rowId: crypto.randomUUID(), itemId: "" }]);

  return (
    <FormSection title="Itens">
      <p className="-mt-1 text-sm text-neutral-500">
        Selecione o item e informe {categoria === "medico" ? "a unidade" : "o tamanho"} e a quantidade retirada.
      </p>
      <div className="space-y-4">
        {rows.map((row, i) => {
          const itemSelecionado = itens.find((it) => it.id === row.itemId);
          const tamanhosDisponiveis = Object.entries(itemSelecionado?.tamanhos ?? {});
          return (
            <div key={row.rowId} className="rounded-md border border-neutral-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-600">Item {i + 1}</p>
                {rows.length > 1 ? (
                  <button
                    type="button"
                    className="text-sm font-medium text-red-700 hover:underline"
                    onClick={() => setRows((r) => r.filter((x) => x.rowId !== row.rowId))}
                  >
                    Remover
                  </button>
                ) : null}
              </div>
              <FieldGroup>
                <div>
                  <label htmlFor={`itemId-${row.rowId}`} className="field-label">
                    Item<span className="text-red-700"> *</span>
                  </label>
                  <select
                    id={`itemId-${row.rowId}`}
                    name="itemId"
                    className="field-input"
                    value={row.itemId}
                    onChange={(e) =>
                      setRows((r) =>
                        r.map((x) => (x.rowId === row.rowId ? { ...x, itemId: e.target.value } : x)),
                      )
                    }
                  >
                    <option value="">Selecione...</option>
                    {itens.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.nome}
                        {it.codigo ? ` (${it.codigo})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <TextField
                  label={labelUnidade(categoria)}
                  name="itemTamanho"
                  id={`itemTamanho-${row.rowId}`}
                  autoComplete="off"
                  placeholder={placeholderUnidade(categoria)}
                />
                <TextField
                  label="Quantidade"
                  name="itemQuantidade"
                  id={`itemQuantidade-${row.rowId}`}
                  type="number"
                  min={0}
                  autoComplete="off"
                  placeholder="0"
                />
              </FieldGroup>
              {tamanhosDisponiveis.length > 0 ? (
                <p className="mt-2 text-xs text-neutral-400">
                  Em estoque: {tamanhosDisponiveis.map(([t, q]) => `${t}: ${q}`).join(" · ")}
                </p>
              ) : itemSelecionado ? (
                <p className="mt-2 text-xs text-neutral-400">Este item ainda não tem nenhuma quantidade cadastrada.</p>
              ) : null}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="btn-secondary mt-4"
        onClick={() => setRows((r) => [...r, { rowId: crypto.randomUUID(), itemId: "" }])}
      >
        + Adicionar item
      </button>
    </FormSection>
  );
}

interface LinhaEntrada {
  rowId: string;
  /** "" (nada escolhido ainda), o id de um item já cadastrado, ou ESTOQUE_ITEM_NOVO_VALUE. */
  itemId: string;
}

/**
 * Linhas de item de uma Entrada — pra cada linha, a pessoa escolhe explicitamente "Item já
 * cadastrado" (um <select> com a lista atual, igual à Saída) ou "+ Cadastrar item novo" (revela os
 * campos de nome/código/mg pra cadastrar na hora). Mesmo padrão já usado em Staff Operacional
 * (NOVA_FUNCAO_VALUE) e em Financeiro (NOVA_CATEGORIA_GASTO_VALUE): um valor especial no próprio
 * select em vez de um campo de texto livre tentando adivinhar. No servidor, cada linha usa os
 * MESMOS nomes de campo (itemId/itemNome/itemCodigo/itemMg/itemTamanho/itemQuantidade); os campos
 * de item novo são lidos só quando itemId da linha é ESTOQUE_ITEM_NOVO_VALUE — ver
 * resolverItensEntrada em ./actions.ts. Por isso ficam sempre montados (como campo oculto quando a
 * linha não está em modo "item novo"), pra manter os índices alinhados entre as linhas.
 */
export function EntradaItensFields({ itens, categoria }: { itens: EstoqueItemRow[]; categoria: EstoqueCategoria }) {
  const [rows, setRows] = useState<LinhaEntrada[]>(() => [{ rowId: crypto.randomUUID(), itemId: "" }]);

  return (
    <FormSection title="Itens">
      <p className="-mt-1 text-sm text-neutral-500">
        Pra cada item, escolha um já cadastrado ou &quot;+ Cadastrar item novo&quot;, e informe{" "}
        {categoria === "medico" ? "a unidade" : "o tamanho"} e a quantidade que chegou.
      </p>
      <div className="space-y-4">
        {rows.map((row, i) => {
          const itemSelecionado = itens.find((it) => it.id === row.itemId);
          const modoNovo = row.itemId === ESTOQUE_ITEM_NOVO_VALUE;
          const tamanhosDisponiveis = Object.entries(itemSelecionado?.tamanhos ?? {});
          return (
            <div key={row.rowId} className="rounded-md border border-neutral-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-600">Item {i + 1}</p>
                {rows.length > 1 ? (
                  <button
                    type="button"
                    className="text-sm font-medium text-red-700 hover:underline"
                    onClick={() => setRows((r) => r.filter((x) => x.rowId !== row.rowId))}
                  >
                    Remover
                  </button>
                ) : null}
              </div>
              <FieldGroup>
                <div>
                  <label htmlFor={`itemId-${row.rowId}`} className="field-label">
                    Item<span className="text-red-700"> *</span>
                  </label>
                  <select
                    id={`itemId-${row.rowId}`}
                    name="itemId"
                    className="field-input"
                    value={row.itemId}
                    onChange={(e) =>
                      setRows((r) =>
                        r.map((x) => (x.rowId === row.rowId ? { ...x, itemId: e.target.value } : x)),
                      )
                    }
                  >
                    <option value="">Selecione...</option>
                    {itens.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.nome}
                        {it.codigo ? ` (${it.codigo})` : ""}
                      </option>
                    ))}
                    <option value={ESTOQUE_ITEM_NOVO_VALUE}>+ Cadastrar item novo</option>
                  </select>
                </div>
                {modoNovo ? (
                  <>
                    <TextField
                      label={labelNomeItem(categoria)}
                      name="itemNome"
                      id={`itemNome-${row.rowId}`}
                      required
                      autoComplete="off"
                      placeholder={categoria === "medico" ? "Ex: Dipirona 500mg comprimido" : "Ex: Camiseta Polo"}
                    />
                    <TextField
                      label="Código (opcional)"
                      name="itemCodigo"
                      id={`itemCodigo-${row.rowId}`}
                      autoComplete="off"
                      placeholder="Opcional"
                    />
                    {categoria === "medico" ? (
                      <TextField
                        label="Mg / dosagem (opcional)"
                        name="itemMg"
                        id={`itemMg-${row.rowId}`}
                        autoComplete="off"
                        placeholder="Ex: 500mg — opcional"
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    <input type="hidden" name="itemNome" value="" />
                    <input type="hidden" name="itemCodigo" value="" />
                    {categoria === "medico" ? <input type="hidden" name="itemMg" value="" /> : null}
                  </>
                )}
                <TextField
                  label={labelUnidade(categoria)}
                  name="itemTamanho"
                  id={`itemTamanho-${row.rowId}`}
                  autoComplete="off"
                  placeholder={placeholderUnidade(categoria)}
                />
                <TextField
                  label="Quantidade"
                  name="itemQuantidade"
                  id={`itemQuantidade-${row.rowId}`}
                  type="number"
                  min={0}
                  autoComplete="off"
                  placeholder="0"
                />
              </FieldGroup>
              {!modoNovo && tamanhosDisponiveis.length > 0 ? (
                <p className="mt-2 text-xs text-neutral-400">
                  Já em estoque: {tamanhosDisponiveis.map(([t, q]) => `${t}: ${q}`).join(" · ")}
                </p>
              ) : !modoNovo && itemSelecionado ? (
                <p className="mt-2 text-xs text-neutral-400">Este item ainda não tem nenhuma quantidade cadastrada.</p>
              ) : modoNovo ? (
                <p className="mt-2 text-xs text-neutral-400">Este item será cadastrado no catálogo ao registrar a entrada.</p>
              ) : null}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="btn-secondary mt-4"
        onClick={() => setRows((r) => [...r, { rowId: crypto.randomUUID(), itemId: "" }])}
      >
        + Adicionar item
      </button>
    </FormSection>
  );
}
