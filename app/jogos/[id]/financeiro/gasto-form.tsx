"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextField } from "@/components/fields";
import { CurrencyField } from "@/components/currency-field";
import { CategoriaGastoField } from "@/components/categoria-gasto-field";
import { SubmitButton } from "@/components/submit-button";
import type { CategoriaGastoRow } from "@/lib/supabase/types";
import type { GastoFormState } from "./actions";

const initialState: GastoFormState = {};

export function GastoForm({
  action,
  jogoId,
  gastoId,
  categorias,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: GastoFormState, formData: FormData) => Promise<GastoFormState>;
  jogoId: string;
  gastoId?: string;
  categorias: CategoriaGastoRow[];
  defaultValues?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="jogoId" value={jogoId} />
      {gastoId ? <input type="hidden" name="id" value={gastoId} /> : null}
      <FormSection title="Dados do gasto">
        <FieldGroup>
          <CategoriaGastoField
            categorias={categorias}
            defaultValue={values.categoriaId}
            error={errors.categoriaId}
            novaCategoriaError={errors.novaCategoriaNome}
          />
          <TextField
            label="Descrição"
            name="descricao"
            defaultValue={values.descricao}
            error={errors.descricao}
            placeholder="Ex: Ônibus 2 — viagem de volta"
          />
          <CurrencyField
            label="Valor previsto"
            name="valorPrevisto"
            required
            defaultValue={values.valorPrevisto}
            error={errors.valorPrevisto}
          />
          <CurrencyField
            label="Valor efetuado"
            name="valorEfetuado"
            defaultValue={values.valorEfetuado}
            error={errors.valorEfetuado}
          />
        </FieldGroup>
      </FormSection>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
