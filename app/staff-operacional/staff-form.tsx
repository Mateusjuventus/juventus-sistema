"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextField, SuggestionField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { SUGESTOES_FUNCAO_STAFF } from "@/lib/validation/schemas";
import type { StaffFormState } from "./actions";

const initialState: StaffFormState = {};

export function StaffForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: StaffFormState, formData: FormData) => Promise<StaffFormState>;
  defaultValues?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <FormSection title="Dados pessoais">
        <FieldGroup>
          <TextField
            label="Nome completo"
            name="nomeCompleto"
            required
            defaultValue={values.nomeCompleto}
            error={errors.nomeCompleto}
          />
          <TextField label="RG" name="rg" required defaultValue={values.rg} error={errors.rg} />
          <TextField
            label="CPF"
            name="cpf"
            required
            placeholder="000.000.000-00"
            defaultValue={values.cpf}
            error={errors.cpf}
          />
          <TextField
            label="Data de nascimento"
            name="dataNascimento"
            type="date"
            required
            defaultValue={values.dataNascimento}
            error={errors.dataNascimento}
          />
          <TextField
            label="Telefone"
            name="telefone"
            defaultValue={values.telefone}
            error={errors.telefone}
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Função e pagamento">
        <FieldGroup>
          <SuggestionField
            label="Função/setor"
            name="funcaoSetor"
            required
            defaultValue={values.funcaoSetor}
            error={errors.funcaoSetor}
            suggestions={SUGESTOES_FUNCAO_STAFF}
          />
          <TextField
            label="Chave PIX"
            name="chavePix"
            defaultValue={values.chavePix}
            error={errors.chavePix}
          />
          <TextField
            label="Valor padrão de pagamento (R$)"
            name="valorPadraoPagamento"
            type="number"
            step="0.01"
            min={0}
            defaultValue={values.valorPadraoPagamento}
            error={errors.valorPadraoPagamento}
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
