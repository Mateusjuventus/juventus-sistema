"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { PerfilParaSelecao } from "@/lib/auth/perfis";
import type { ConfiguracaoFormState } from "./actions";

const initialState: ConfiguracaoFormState = {};

export function ConfiguracaoForm({
  action,
  entityId,
  defaultValues,
  perfis,
}: {
  action: (prevState: ConfiguracaoFormState, formData: FormData) => Promise<ConfiguracaoFormState>;
  entityId: string;
  defaultValues: Record<string, string>;
  /** Usuários do sistema, pra vincular cada assinatura a um login (ver docs/superpowers/specs/
   * 2026-08-28-assinatura-digital-notificacoes-design.md, Fase 2) — sem vínculo, qualquer master
   * consegue assinar digitalmente aquele papel no lugar da pessoa nomeada aqui. */
  perfis: PerfilParaSelecao[];
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
          <SelectField label="Usuário que assina digitalmente" name="assinatura1UsuarioId" defaultValue={values.assinatura1UsuarioId}>
            <option value="">— Não vincular (qualquer master pode assinar) —</option>
            {perfis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
          </SelectField>
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
          <SelectField label="Usuário que assina digitalmente" name="assinatura2UsuarioId" defaultValue={values.assinatura2UsuarioId}>
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
