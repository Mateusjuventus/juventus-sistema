"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextField } from "@/components/fields";
import { CurrencyField } from "@/components/currency-field";
import { CategoriaGastoField } from "@/components/categoria-gasto-field";
import { JogosRelacionadosField } from "@/components/jogos-relacionados-field";
import { SubmitButton } from "@/components/submit-button";
import type { CategoriaGastoRow, JogoRow } from "@/lib/supabase/types";
import type { DespesaAvulsaFormState } from "./actions";

const initialState: DespesaAvulsaFormState = {};

export function DespesaForm({
  action,
  despesaId,
  categorias,
  jogos,
  jogosSelecionados,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: DespesaAvulsaFormState, formData: FormData) => Promise<DespesaAvulsaFormState>;
  despesaId?: string;
  categorias: CategoriaGastoRow[];
  jogos: JogoRow[];
  jogosSelecionados?: string[];
  defaultValues?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {despesaId ? <input type="hidden" name="id" value={despesaId} /> : null}
      <FormSection title="Dados da despesa">
        <FieldGroup>
          <TextField label="Data" name="data" type="date" defaultValue={values.data} error={errors.data} />
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
            placeholder="Ex: Folha de pagamento — Agosto/2026"
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

      <FormSection title="Jogos relacionados">
        <JogosRelacionadosField jogos={jogos} jogosSelecionados={jogosSelecionados} />
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
