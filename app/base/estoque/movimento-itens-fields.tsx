"use client";

import { useState } from "react";
import { FieldGroup, FormSection, TextField } from "@/components/fields";
import { ESTOQUE_ITEM_NOVO_VALUE } from "@/lib/validation/schemas";
import type { EstoqueItemBaseRow } from "@/lib/supabase/types";

/**
 * Espelha `app/estoque/[categoria]/movimento-itens-fields.tsx` para o Futebol de Base — mesmo
 * padrão de linhas dinâmicas de item/tamanho/quantidade, mas sem nenhum parâmetro de categoria (o
 * Estoque do Base é sempre material esportivo, então os rótulos "Tamanho"/nome do item são fixos,
 * sem o desvio de nomenclatura do Médico que existe no Profissional).
 */
interface LinhaSaida {
  rowId: string;
  itemId: string;
}

export function SaidaItensFieldsBase({ itens }: { itens: EstoqueItemBaseRow[] }) {
  const [rows, setRows] = useState<LinhaSaida[]>(() => [{ rowId: crypto.randomUUID(), itemId: "" }]);

  return (
    <FormSection title="Itens">
      <p className="-mt-1 text-sm text-neutral-500">Selecione o item e informe o tamanho e a quantidade retirada.</p>
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
                      setRows((r) => r.map((x) => (x.rowId === row.rowId ? { ...x, itemId: e.target.value } : x)))
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
                  label="Tamanho"
                  name="itemTamanho"
                  id={`itemTamanho-${row.rowId}`}
                  autoComplete="off"
                  placeholder="Ex: M ou Único"
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
  itemId: string;
}

export function EntradaItensFieldsBase({ itens }: { itens: EstoqueItemBaseRow[] }) {
  const [rows, setRows] = useState<LinhaEntrada[]>(() => [{ rowId: crypto.randomUUID(), itemId: "" }]);

  return (
    <FormSection title="Itens">
      <p className="-mt-1 text-sm text-neutral-500">
        Selecione o item (ou cadastre um novo), informe o tamanho e a quantidade que chegou.
      </p>
      <div className="space-y-4">
        {rows.map((row, i) => {
          const itemSelecionado = itens.find((it) => it.id === row.itemId);
          const isNovo = row.itemId === ESTOQUE_ITEM_NOVO_VALUE;
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
                    Nome do item<span className="text-red-700"> *</span>
                  </label>
                  <select
                    id={`itemId-${row.rowId}`}
                    name="itemId"
                    className="field-input"
                    value={row.itemId}
                    onChange={(e) =>
                      setRows((r) => r.map((x) => (x.rowId === row.rowId ? { ...x, itemId: e.target.value } : x)))
                    }
                  >
                    <option value="">Selecione...</option>
                    {itens.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.nome}
                        {it.codigo ? ` (${it.codigo})` : ""}
                      </option>
                    ))}
                    <option value={ESTOQUE_ITEM_NOVO_VALUE}>+ Cadastrar item novo...</option>
                  </select>
                </div>
                {isNovo ? (
                  <TextField
                    label="Nome do item"
                    name="itemNome"
                    id={`itemNome-${row.rowId}`}
                    autoComplete="off"
                    placeholder="Nome do item"
                  />
                ) : null}
                {isNovo ? (
                  <TextField
                    label="Código (opcional)"
                    name="itemCodigo"
                    id={`itemCodigo-${row.rowId}`}
                    autoComplete="off"
                    placeholder="Opcional"
                  />
                ) : null}
                <TextField
                  label="Tamanho"
                  name="itemTamanho"
                  id={`itemTamanho-${row.rowId}`}
                  autoComplete="off"
                  placeholder="Ex: M ou Único"
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
              {isNovo ? (
                <p className="mt-2 text-xs text-neutral-400">
                  Item novo — será cadastrado automaticamente ao registrar a entrada.
                </p>
              ) : tamanhosDisponiveis.length > 0 ? (
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
