"use client";

import { useState } from "react";
import { FieldGroup, FormSection, SuggestionField, TextField } from "@/components/fields";
import { labelNomeItem, labelUnidade, placeholderUnidade } from "@/lib/estoque/labels";
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
  nome: string;
}

/**
 * Linhas de item de uma Entrada — o item é digitado pelo nome (com sugestões dos itens já
 * cadastrados naquela categoria, mas aceita qualquer texto novo). Se o nome digitado bater com um
 * item que já existe (sem diferenciar maiúsculas/minúsculas), a entrada soma nesse item; se não
 * bater com nenhum, o item é cadastrado automaticamente na hora de registrar a entrada — assim,
 * conforme o produto chega, só precisa lançar a entrada, sem ter que cadastrar o item à parte
 * antes. Ver resolverItensEntrada em ./actions.ts. No Médico, mostra também o campo "Mg" (dosagem),
 * opcional, usado só quando o item precisa ser cadastrado nessa hora.
 */
export function EntradaItensFields({ itens, categoria }: { itens: EstoqueItemRow[]; categoria: EstoqueCategoria }) {
  const [rows, setRows] = useState<LinhaEntrada[]>(() => [{ rowId: crypto.randomUUID(), nome: "" }]);
  const nomesExistentes = itens.map((it) => it.nome);

  return (
    <FormSection title="Itens">
      <p className="-mt-1 text-sm text-neutral-500">
        Digite {categoria === "medico" ? "a descrição" : "o nome"} do item,{" "}
        {categoria === "medico" ? "a unidade" : "o tamanho"} e a quantidade que chegou. Se o item ainda não
        existir no catálogo, ele é cadastrado automaticamente ao registrar a entrada.
      </p>
      <div className="space-y-4">
        {rows.map((row, i) => {
          const itemExistente = itens.find(
            (it) => it.nome.trim().toLowerCase() === row.nome.trim().toLowerCase(),
          );
          const tamanhosDisponiveis = Object.entries(itemExistente?.tamanhos ?? {});
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
                <SuggestionField
                  label={labelNomeItem(categoria)}
                  name="itemNome"
                  id={`itemNome-${row.rowId}`}
                  suggestions={nomesExistentes}
                  placeholder={categoria === "medico" ? "Ex: Dipirona 500mg comprimido" : "Nome do item"}
                  defaultValue={row.nome}
                  onChange={(value) =>
                    setRows((r) => r.map((x) => (x.rowId === row.rowId ? { ...x, nome: value } : x)))
                  }
                />
                <TextField
                  label="Código (só se for item novo)"
                  name="itemCodigo"
                  id={`itemCodigo-${row.rowId}`}
                  autoComplete="off"
                  placeholder="Opcional"
                />
                {categoria === "medico" ? (
                  <TextField
                    label="Mg / dosagem (só se for item novo)"
                    name="itemMg"
                    id={`itemMg-${row.rowId}`}
                    autoComplete="off"
                    placeholder="Ex: 500mg — opcional"
                  />
                ) : null}
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
              <p className="mt-2 text-xs text-neutral-400">
                {itemExistente
                  ? tamanhosDisponiveis.length > 0
                    ? `Item já cadastrado. Já em estoque: ${tamanhosDisponiveis
                        .map(([t, q]) => `${t}: ${q}`)
                        .join(" · ")}`
                    : "Item já cadastrado, ainda sem nenhuma quantidade."
                  : row.nome.trim()
                    ? "Item novo — será cadastrado automaticamente ao registrar a entrada."
                    : null}
              </p>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="btn-secondary mt-4"
        onClick={() => setRows((r) => [...r, { rowId: crypto.randomUUID(), nome: "" }])}
      >
        + Adicionar item
      </button>
    </FormSection>
  );
}
