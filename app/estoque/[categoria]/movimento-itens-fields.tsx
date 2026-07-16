"use client";

import { useState } from "react";
import { FieldGroup, FormSection, TextField } from "@/components/fields";
import type { EstoqueItemRow } from "@/lib/supabase/types";

interface LinhaMovimento {
  rowId: string;
  itemId: string;
}

/**
 * Linhas de item (Item / Tamanho / Quantidade) compartilhadas entre Nova Entrada e Nova Saída —
 * mesmo padrão de lista dinâmica já usado em Solicitações (ver
 * app/solicitacoes/solicitacao-form.tsx): cada linha usa os MESMOS nomes de campo
 * (itemId/itemTamanho/itemQuantidade); no servidor, lê-se todas as ocorrências na mesma ordem (ver
 * lerLinhasItens em ./actions.ts). O tamanho é digitado livremente (não um <select> travado no que
 * já existe) — se o tamanho não existir ainda pra aquele item, uma Entrada simplesmente cria essa
 * variação nova; numa Saída, se não houver estoque suficiente daquele tamanho, o servidor recusa
 * com uma mensagem clara. A dica de "tamanhos em estoque" abaixo de cada linha é só informativa.
 */
export function ItensMovimentoFields({
  itens,
  tipo,
}: {
  itens: EstoqueItemRow[];
  tipo: "entrada" | "saida";
}) {
  const [rows, setRows] = useState<LinhaMovimento[]>(() => [{ rowId: crypto.randomUUID(), itemId: "" }]);

  return (
    <FormSection title="Itens">
      <p className="-mt-1 text-sm text-neutral-500">
        {tipo === "entrada"
          ? "Selecione o item e informe o tamanho e a quantidade que chegou."
          : "Selecione o item e informe o tamanho e a quantidade retirada."}
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
                  {tipo === "saida" ? "Em estoque" : "Tamanhos já cadastrados"}:{" "}
                  {tamanhosDisponiveis.map(([t, q]) => (tipo === "saida" ? `${t}: ${q}` : t)).join(" · ")}
                </p>
              ) : itemSelecionado ? (
                <p className="mt-2 text-xs text-neutral-400">Este item ainda não tem nenhum tamanho cadastrado.</p>
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
