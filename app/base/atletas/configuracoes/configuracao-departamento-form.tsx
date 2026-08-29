"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { PerfilParaSelecao } from "@/lib/auth/perfis";
import type { ConfiguracaoDispensaFormState } from "./actions";

const initialState: ConfiguracaoDispensaFormState = {};

export function ConfiguracaoDepartamentoForm({
  action,
  entityId,
  defaultValues,
  perfis,
}: {
  action: (prevState: ConfiguracaoDispensaFormState, formData: FormData) => Promise<ConfiguracaoDispensaFormState>;
  entityId: string;
  defaultValues: Record<string, string>;
  perfis: PerfilParaSelecao[];
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={entityId} />
      <FormSection title="Departamento de Futebol de Base">
        <FieldGroup>
          <SelectField
            label="Usuário que assina digitalmente"
            name="departamentoUsuarioId"
            defaultValue={values.departamentoUsuarioId}
          >
            <option value="">— Não vincular (qualquer master pode assinar) —</option>
            {perfis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
          </SelectField>
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
