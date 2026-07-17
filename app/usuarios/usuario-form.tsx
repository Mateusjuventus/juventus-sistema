"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { MODULOS } from "@/lib/auth/modulos";
import { criarUsuario, type UsuarioFormState } from "./actions";

const initialState: UsuarioFormState = {};

export function UsuarioForm() {
  const [state, formAction] = useFormState(criarUsuario, initialState);
  const [role, setRole] = useState(initialState.values?.role ?? "regular");
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" autoComplete="off">
      <FormSection title="Novo usuário">
        <p className="-mt-1 text-sm text-neutral-500">
          Cadastre o e-mail e uma senha provisória, e passe pra pessoa por fora do sistema (ela
          consegue trocar a senha depois de entrar).
        </p>
        <FieldGroup>
          <TextField
            label="E-mail"
            name="email"
            type="email"
            defaultValue={values.email}
            error={errors.email}
            required
            autoComplete="off"
            placeholder="pessoa@exemplo.com"
          />
          <TextField
            label="Senha provisória"
            name="senha"
            type="text"
            error={errors.senha}
            required
            autoComplete="off"
            placeholder="Mínimo 6 caracteres"
          />
          <SelectField
            label="Papel"
            name="role"
            defaultValue={values.role ?? "regular"}
            onChange={(value) => setRole(value)}
          >
            <option value="regular">Regular</option>
            <option value="master">Master</option>
          </SelectField>
        </FieldGroup>

        {role === "master" ? (
          <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
            Papel Master já dá acesso completo a todos os módulos — não precisa marcar nada abaixo.
          </p>
        ) : (
          <div>
            <p className="field-label">Módulos liberados</p>
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MODULOS.map((modulo) => (
                <label key={modulo.chave} className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    name="modulos"
                    value={modulo.chave}
                    defaultChecked
                    className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                  />
                  {modulo.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </FormSection>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label="Cadastrar usuário" pendingLabel="Cadastrando..." />
      </div>
    </form>
  );
}
