"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextAreaField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { IngressoSolicitacaoFormState } from "./actions";

const initialState: IngressoSolicitacaoFormState = {};

export function SolicitacaoForm({
  action,
  jogoId,
  solicitacaoId,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: IngressoSolicitacaoFormState,
    formData: FormData,
  ) => Promise<IngressoSolicitacaoFormState>;
  jogoId: string;
  solicitacaoId?: string;
  defaultValues?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="jogoId" value={jogoId} />
      {solicitacaoId ? <input type="hidden" name="id" value={solicitacaoId} /> : null}
      <FormSection title="Dados da solicitação">
        <FieldGroup>
          <TextField
            label="Nome do solicitante"
            name="nomeSolicitante"
            required
            defaultValue={values.nomeSolicitante}
            error={errors.nomeSolicitante}
          />
          <TextField
            label="Quantidade solicitada"
            name="quantidadeSolicitada"
            type="number"
            min={1}
            required
            defaultValue={values.quantidadeSolicitada}
            error={errors.quantidadeSolicitada}
          />
          <TextField
            label="Quantidade atendida"
            name="quantidadeAtendida"
            type="number"
            min={0}
            defaultValue={values.quantidadeAtendida}
            error={errors.quantidadeAtendida}
            placeholder="Preencha conforme for entregando"
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
