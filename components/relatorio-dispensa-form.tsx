"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextAreaField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";

export interface RelatorioDispensaFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

const initialState: RelatorioDispensaFormState = {};

// Mesma escala 3-9 do Parecer Final (ver app/treinador/[id]/parecer-form.tsx) — 3-4 Regular, 5-6
// Bom, 7-8 Muito Bom, 9 Excelente.
const OPCOES_NOTA = [3, 4, 5, 6, 7, 8, 9];

function SelectNota({
  label,
  name,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
}) {
  return (
    <SelectField label={label} name={name} required defaultValue={defaultValue} error={error}>
      <option value="">Selecione</option>
      {OPCOES_NOTA.map((nota) => (
        <option key={nota} value={nota}>
          {nota}
        </option>
      ))}
    </SelectField>
  );
}

/**
 * Formulário do Relatório de Dispensa (ver docs/superpowers/specs/
 * 2026-08-25-classificacao-dispensa-atleta-base-design.md, seção 3) — compartilhado pela tela do
 * Mateus (`app/base/atletas/[categoria]/[id]/dispensa`) e do Treinador
 * (`app/treinador/atletas/[id]/dispensa`): mesmos campos, cada lado passa sua própria Server Action
 * e regra de permissão. Diferente do `ParecerForm` da Captação: além das 4 notas, tem a data da
 * dispensa (fim do período no clube) e o motivo, sem veredito nenhum.
 */
export function RelatorioDispensaForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: RelatorioDispensaFormState, formData: FormData) => Promise<RelatorioDispensaFormState>;
  defaultValues?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <FormSection title="Período e motivo">
        <FieldGroup>
          <TextField
            label="Data da dispensa"
            name="dispensaData"
            type="date"
            required
            defaultValue={values.dispensaData}
            error={errors.dispensaData}
          />
        </FieldGroup>
        <TextAreaField
          label="Motivo da dispensa"
          name="motivo"
          rows={4}
          defaultValue={values.motivo}
          error={errors.motivo}
        />
      </FormSection>

      <FormSection title="Avaliação de desempenho na saída (3 a 9)">
        <FieldGroup>
          <SelectNota label="Técnica" name="notaTecnica" defaultValue={values.notaTecnica} error={errors.notaTecnica} />
          <SelectNota label="Física" name="notaFisica" defaultValue={values.notaFisica} error={errors.notaFisica} />
          <SelectNota label="Tática" name="notaTatica" defaultValue={values.notaTatica} error={errors.notaTatica} />
          <SelectNota
            label="Comportamental"
            name="notaComportamental"
            defaultValue={values.notaComportamental}
            error={errors.notaComportamental}
          />
        </FieldGroup>
        <p className="text-xs text-neutral-400">Legenda: 3-4 Regular · 5-6 Bom · 7-8 Muito Bom · 9 Excelente</p>
      </FormSection>

      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <div className="flex gap-3">
        <SubmitButton label={submitLabel} pendingLabel="Salvando..." />
      </div>
    </form>
  );
}
