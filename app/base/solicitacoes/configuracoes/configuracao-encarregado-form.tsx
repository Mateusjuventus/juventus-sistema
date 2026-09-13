"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { PerfilParaSelecao } from "@/lib/auth/perfis";
import type { ConfiguracaoSolicitacoesFormState } from "./actions";

const initialState: ConfiguracaoSolicitacoesFormState = {};

/** Espelha `app/solicitacoes/configuracoes/configuracao-encarregado-form.tsx` para o Futebol de Base. */
export function ConfiguracaoEncarregadoFormBase({
  action,
  entityId,
  defaultValues,
  perfis,
}: {
  action: (prevState: ConfiguracaoSolicitacoesFormState, formData: FormData) => Promise<ConfiguracaoSolicitacoesFormState>;
  entityId: string;
  defaultValues: Record<string, string>;
  perfis: PerfilParaSelecao[];
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues;
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={entityId} />
      <FormSection title="Encarregado do Departamento">
        <FieldGroup>
          <TextField
            label="Nome"
            name="encarregadoNome"
            defaultValue={values.encarregadoNome}
            error={errors.encarregadoNome}
          />
          <TextField
            label="Cargo"
            name="encarregadoCargo"
            defaultValue={values.encarregadoCargo}
            error={errors.encarregadoCargo}
          />
          <SelectField
            label="Usuário que assina digitalmente"
            name="encarregadoUsuarioId"
            defaultValue={values.encarregadoUsuarioId}
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

      <FormSection title="Departamento de Compras">
        <p className="-mt-2 text-sm text-neutral-500">
          Assina Solicitações de Compra, Transporte, Passagem Aérea, Exame Médico e Hospedagem.
        </p>
        <FieldGroup>
          <TextField label="Cargo" name="comprasCargo" defaultValue={values.comprasCargo} error={errors.comprasCargo} />
          <SelectField
            label="Usuário que assina digitalmente"
            name="comprasUsuarioId"
            defaultValue={values.comprasUsuarioId}
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

      <FormSection title="Departamento Financeiro">
        <p className="-mt-2 text-sm text-neutral-500">Assina Solicitações de Pagamento e Reembolso.</p>
        <FieldGroup>
          <TextField
            label="Cargo"
            name="financeiroCargo"
            defaultValue={values.financeiroCargo}
            error={errors.financeiroCargo}
          />
          <SelectField
            label="Usuário que assina digitalmente"
            name="financeiroUsuarioId"
            defaultValue={values.financeiroUsuarioId}
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

      <FormSection title="Aprovador">
        <p className="-mt-2 text-sm text-neutral-500">
          Assina por último, em qualquer tipo de Solicitação — ao lado do Departamento de Compras ou
          do Departamento Financeiro, conforme o caso.
        </p>
        <FieldGroup>
          <TextField
            label="Cargo"
            name="aprovadorCargo"
            defaultValue={values.aprovadorCargo}
            error={errors.aprovadorCargo}
          />
          <SelectField
            label="Usuário que assina digitalmente"
            name="aprovadorUsuarioId"
            defaultValue={values.aprovadorUsuarioId}
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
