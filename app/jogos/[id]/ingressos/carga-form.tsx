"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextAreaField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { IngressoCargaFormState } from "./actions";

const initialState: IngressoCargaFormState = {};

export function CargaForm({
  action,
  jogoId,
  cargaId,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: IngressoCargaFormState, formData: FormData) => Promise<IngressoCargaFormState>;
  jogoId: string;
  cargaId?: string;
  defaultValues?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="jogoId" value={jogoId} />
      {cargaId ? <input type="hidden" name="id" value={cargaId} /> : null}
      <FormSection title="Dados da carga">
        <FieldGroup>
          <TextField
            label="Quantidade recebida"
            name="quantidade"
            type="number"
            min={1}
            required
            defaultValue={values.quantidade}
            error={errors.quantidade}
          />
          <TextField
            label="Data"
            name="data"
            type="date"
            required
            defaultValue={values.data}
            error={errors.data}
          />
          <TextAreaField
            label="Observações"
            name="observacoes"
            defaultValue={values.observacoes}
            error={errors.observacoes}
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
