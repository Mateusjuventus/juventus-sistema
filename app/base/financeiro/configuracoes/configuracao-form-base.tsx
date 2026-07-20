"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { ConfiguracaoFormState } from "./actions";

const initialState: ConfiguracaoFormState = {};

/** Espelha `app/financeiro/configuracoes/configuracao-form.tsx` para o Futebol de Base. */
export function ConfiguracaoFormBase({
  action,
  entityId,
  defaultValues,
}: {
  action: (prevState: ConfiguracaoFormState, formData: FormData) => Promise<ConfiguracaoFormState>;
  entityId: string;
  defaultValues: Record<string, string>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues;
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={entityId} />
      <FormSection title="Assinatura 1">
        <FieldGroup>
          <TextField
            label="Nome"
            name="assinatura1Nome"
            required
            defaultValue={values.assinatura1Nome}
            error={errors.assinatura1Nome}
          />
          <TextField
            label="Cargo"
            name="assinatura1Cargo"
            required
            defaultValue={values.assinatura1Cargo}
            error={errors.assinatura1Cargo}
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Assinatura 2">
        <FieldGroup>
          <TextField
            label="Nome"
            name="assinatura2Nome"
            required
            defaultValue={values.assinatura2Nome}
            error={errors.assinatura2Nome}
          />
          <TextField
            label="Cargo"
            name="assinatura2Cargo"
            required
            defaultValue={values.assinatura2Cargo}
            error={errors.assinatura2Cargo}
          />
        </FieldGroup>
      </FormSection>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label="Salvar alterações" />
      </div>
    </form>
  );
}
