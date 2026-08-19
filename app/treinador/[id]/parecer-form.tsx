"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextAreaField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { ParecerFormState } from "../actions";

const initialState: ParecerFormState = {};

// Mesma escala 3-9 do check constraint das 4 colunas de nota (ver 0079_parecer_final_treinador.sql)
// e a legenda impressa no PDF: 3-4 Regular, 5-6 Bom, 7-8 Muito Bom, 9 Excelente.
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
 * Formulário do Parecer Final preenchido pelo Treinador — 4 notas (3 a 9, sempre por `<select>`,
 * nunca texto livre, pra não sair nota fora da escala), Comentários finais e o veredito. O veredito
 * usa a mesma nomenclatura do status da Captação: "Aprovado"/"Dispensado" (nunca "Reprovado").
 */
export function ParecerForm({
  action,
}: {
  action: (prevState: ParecerFormState, formData: FormData) => Promise<ParecerFormState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <FormSection title="Notas (3 a 9)">
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

      <FormSection title="Comentários e veredito">
        <TextAreaField
          label="Comentários finais"
          name="comentarios"
          rows={4}
          defaultValue={values.comentarios}
          error={errors.comentarios}
        />
        <SelectField label="Veredito" name="veredito" required defaultValue={values.veredito} error={errors.veredito}>
          <option value="">Selecione</option>
          <option value="aprovado">Aprovado</option>
          <option value="dispensado">Dispensado</option>
        </SelectField>
      </FormSection>

      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <div className="flex gap-3">
        <SubmitButton label="Salvar parecer" pendingLabel="Salvando..." />
      </div>
    </form>
  );
}
