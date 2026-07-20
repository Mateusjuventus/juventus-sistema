"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { EstoqueItemFormState } from "./actions";

const initialState: EstoqueItemFormState = {};

interface LinhaTamanho {
  rowId: string;
  tamanho: string;
  quantidade: string;
}

/** Espelha `TamanhosFields` de `app/estoque/[categoria]/itens/item-form.tsx`, sem variação de
 * rótulo por categoria (o Estoque do Base é sempre material esportivo). */
function TamanhosFields({ tamanhosIniciais }: { tamanhosIniciais: LinhaTamanho[] }) {
  const [rows, setRows] = useState<LinhaTamanho[]>(() =>
    tamanhosIniciais.length > 0 ? tamanhosIniciais : [{ rowId: crypto.randomUUID(), tamanho: "", quantidade: "" }],
  );

  return (
    <FormSection title="Tamanhos e quantidades">
      <p className="-mt-1 text-sm text-neutral-500">
        Ex: P, M, G, Único... Adicione uma linha por tamanho/variação que esse item tem.
      </p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.rowId} className="flex items-end gap-3">
            <div className="flex-1">
              <TextField
                label="Tamanho"
                name="itemTamanho"
                id={`itemTamanho-${row.rowId}`}
                autoComplete="off"
                defaultValue={row.tamanho}
                placeholder="Ex: M ou Único"
              />
            </div>
            <div className="flex-1">
              <TextField
                label="Quantidade"
                name="itemQuantidade"
                id={`itemQuantidade-${row.rowId}`}
                type="number"
                min={0}
                autoComplete="off"
                defaultValue={row.quantidade}
                placeholder="0"
              />
            </div>
            {rows.length > 1 ? (
              <button
                type="button"
                className="mb-1 text-sm font-medium text-red-700 hover:underline"
                onClick={() => setRows((r) => r.filter((x) => x.rowId !== row.rowId))}
              >
                Remover
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn-secondary mt-2"
        onClick={() => setRows((r) => [...r, { rowId: crypto.randomUUID(), tamanho: "", quantidade: "" }])}
      >
        + Adicionar tamanho
      </button>
    </FormSection>
  );
}

export function ItemFormBase({
  action,
  itemId,
  defaultValues,
  tamanhosIniciais = [],
  submitLabel,
}: {
  action: (prevState: EstoqueItemFormState, formData: FormData) => Promise<EstoqueItemFormState>;
  itemId?: string;
  defaultValues?: Record<string, string>;
  tamanhosIniciais?: LinhaTamanho[];
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" autoComplete="off">
      {itemId ? <input type="hidden" name="id" value={itemId} /> : null}

      <FormSection title="Dados do item">
        <FieldGroup>
          <TextField
            label="Nome do item"
            name="nome"
            defaultValue={values.nome}
            error={errors.nome}
            required
            autoComplete="off"
            placeholder="Ex: Camiseta Polo"
          />
          <TextField
            label="Código (opcional)"
            name="codigo"
            defaultValue={values.codigo}
            error={errors.codigo}
            autoComplete="off"
            placeholder="Ex: CP"
          />
        </FieldGroup>
      </FormSection>

      <TamanhosFields tamanhosIniciais={tamanhosIniciais} />

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
