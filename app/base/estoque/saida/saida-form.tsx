"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextAreaField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { ESTOQUE_DEPARTAMENTOS } from "@/lib/validation/schemas";
import type { EstoqueItemBaseRow } from "@/lib/supabase/types";
import type { EstoqueMovimentoFormState } from "../actions";
import { SaidaItensFieldsBase } from "../movimento-itens-fields";

const initialState: EstoqueMovimentoFormState = {};

const hoje = () => new Date().toISOString().slice(0, 10);

export function SaidaFormBase({
  action,
  itens,
}: {
  action: (prevState: EstoqueMovimentoFormState, formData: FormData) => Promise<EstoqueMovimentoFormState>;
  itens: EstoqueItemBaseRow[];
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? { data: hoje(), departamento: "Administrativo" };
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" autoComplete="off">
      <FormSection title="Dados do colaborador">
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
            label="Nome do destinatário"
            name="nomeDestinatario"
            defaultValue={values.nomeDestinatario}
            error={errors.nomeDestinatario}
            autoComplete="off"
            required
            placeholder="Nome completo"
          />
          <TextField
            label="Função (opcional)"
            name="funcao"
            defaultValue={values.funcao}
            error={errors.funcao}
            autoComplete="off"
            placeholder="Ex: Preparador Físico"
          />
          <SelectField
            label="Departamento (opcional)"
            name="departamento"
            defaultValue={values.departamento ?? "Administrativo"}
            error={errors.departamento}
          >
            <option value="">Selecione...</option>
            {ESTOQUE_DEPARTAMENTOS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </SelectField>
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

      <SaidaItensFieldsBase itens={itens} />

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label="Registrar saída e gerar ficha" pendingLabel="Registrando..." />
      </div>
    </form>
  );
}
