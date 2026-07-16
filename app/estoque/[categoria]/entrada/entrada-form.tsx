"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextAreaField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { EstoqueCategoria, EstoqueItemRow } from "@/lib/supabase/types";
import type { EstoqueMovimentoFormState } from "../actions";
import { EntradaItensFields } from "../movimento-itens-fields";

const initialState: EstoqueMovimentoFormState = {};

const hoje = () => new Date().toISOString().slice(0, 10);

export function EntradaForm({
  action,
  categoria,
  itens,
}: {
  action: (prevState: EstoqueMovimentoFormState, formData: FormData) => Promise<EstoqueMovimentoFormState>;
  categoria: EstoqueCategoria;
  itens: EstoqueItemRow[];
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? { data: hoje() };
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" autoComplete="off">
      <input type="hidden" name="categoria" value={categoria} />

      <FormSection title="Dados da entrada">
        <FieldGroup>
          <TextField
            label="Data"
            name="data"
            type="date"
            defaultValue={values.data ?? hoje()}
            error={errors.data}
            required
          />
          <TextField
            label="Fornecedor (opcional)"
            name="fornecedor"
            defaultValue={values.fornecedor}
            error={errors.fornecedor}
            autoComplete="off"
            placeholder="Ex: Loja XYZ Materiais Esportivos"
          />
          <TextField
            label="Nota fiscal (opcional)"
            name="notaFiscal"
            defaultValue={values.notaFiscal}
            error={errors.notaFiscal}
            autoComplete="off"
            placeholder="Ex: 000123"
          />
          <div className="sm:col-span-2">
            <TextAreaField
              label="Observações (opcional)"
              name="observacoes"
              defaultValue={values.observacoes}
              error={errors.observacoes}
            />
          </div>
        </FieldGroup>
      </FormSection>

      <EntradaItensFields itens={itens} categoria={categoria} />

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label="Registrar entrada" pendingLabel="Registrando..." />
      </div>
    </form>
  );
}
