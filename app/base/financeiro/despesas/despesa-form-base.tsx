"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { CurrencyField } from "@/components/currency-field";
import { CategoriaGastoField } from "@/components/categoria-gasto-field";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import type { CategoriaGastoRow } from "@/lib/supabase/types";
import type { DespesaAvulsaBaseFormState } from "./actions";

const initialState: DespesaAvulsaBaseFormState = {};

/** Espelha `app/financeiro/despesas-avulsas/despesa-form.tsx`, sem a seção "Jogos relacionados"
 * (fora de escopo aqui) e com o campo "Categoria (idade)" a mais — vazio significa despesa geral
 * da Base, não amarrada a uma categoria (ver docs/superpowers/specs/
 * 2026-08-19-financeiro-base-design.md). */
export function DespesaFormBase({
  action,
  despesaId,
  categorias,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: DespesaAvulsaBaseFormState, formData: FormData) => Promise<DespesaAvulsaBaseFormState>;
  despesaId?: string;
  categorias: CategoriaGastoRow[];
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
          <SelectField
            label="Categoria (idade)"
            name="categoria"
            defaultValue={values.categoria}
            error={errors.categoria}
          >
            <option value="">Geral (toda a Base)</option>
            {CATEGORIAS_BASE.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </SelectField>
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
            placeholder="Ex: Material esportivo — bolas e coletes"
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
