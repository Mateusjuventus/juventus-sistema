"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { exemploUnidadesSection, labelNomeItem, labelUnidade, labelUnidadesSection, placeholderUnidade } from "@/lib/estoque/labels";
import type { EstoqueCategoria } from "@/lib/supabase/types";
import type { EstoqueItemFormState } from "../actions";

const initialState: EstoqueItemFormState = {};

interface LinhaTamanho {
  rowId: string;
  tamanho: string;
  quantidade: string;
}

/**
 * Linhas de tamanho/quantidade do item, dentro do próprio formulário — mesmo padrão das listas
 * dinâmicas de item já usadas em Solicitações (ver app/solicitacoes/solicitacao-form.tsx): cada
 * linha usa os MESMOS nomes de campo (itemTamanho/itemQuantidade); no servidor, lê-se todas as
 * ocorrências na mesma ordem (ver buildTamanhos em ../actions.ts). No Médico, esse mesmo campo
 * guarda unidades de medida (Caixa/Unidade/Pacote) em vez de tamanho de roupa — só o rótulo muda.
 */
function TamanhosFields({
  categoria,
  tamanhosIniciais,
}: {
  categoria: EstoqueCategoria;
  tamanhosIniciais: LinhaTamanho[];
}) {
  const [rows, setRows] = useState<LinhaTamanho[]>(() =>
    tamanhosIniciais.length > 0
      ? tamanhosIniciais
      : [{ rowId: crypto.randomUUID(), tamanho: "", quantidade: "" }],
  );

  return (
    <FormSection title={labelUnidadesSection(categoria)}>
      <p className="-mt-1 text-sm text-neutral-500">{exemploUnidadesSection(categoria)}</p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.rowId} className="flex items-end gap-3">
            <div className="flex-1">
              <TextField
                label={labelUnidade(categoria)}
                name="itemTamanho"
                id={`itemTamanho-${row.rowId}`}
                autoComplete="off"
                defaultValue={row.tamanho}
                placeholder={placeholderUnidade(categoria)}
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

export function ItemForm({
  action,
  categoria,
  itemId,
  defaultValues,
  tamanhosIniciais = [],
  submitLabel,
}: {
  action: (prevState: EstoqueItemFormState, formData: FormData) => Promise<EstoqueItemFormState>;
  categoria: EstoqueCategoria;
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
      <input type="hidden" name="categoria" value={categoria} />
      {itemId ? <input type="hidden" name="id" value={itemId} /> : null}

      <FormSection title="Dados do item">
        <FieldGroup>
          <TextField
            label={labelNomeItem(categoria)}
            name="nome"
            defaultValue={values.nome}
            error={errors.nome}
            required
            autoComplete="off"
            placeholder={categoria === "medico" ? "Ex: Dipirona 500mg comprimido" : "Ex: Camiseta Polo"}
          />
          <TextField
            label="Código (opcional)"
            name="codigo"
            defaultValue={values.codigo}
            error={errors.codigo}
            autoComplete="off"
            placeholder="Ex: CP"
          />
          {categoria === "medico" ? (
            <TextField
              label="Mg / dosagem (opcional)"
              name="mg"
              defaultValue={values.mg}
              error={errors.mg}
              autoComplete="off"
              placeholder="Ex: 500mg — deixe em branco se não se aplica"
            />
          ) : null}
        </FieldGroup>
      </FormSection>

      <TamanhosFields categoria={categoria} tamanhosIniciais={tamanhosIniciais} />

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
