"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { PermissaoActionState } from "@/components/permissao-checkboxes-form";

const initialState: PermissaoActionState = {};

/**
 * Formulário de "Trocar senha" da própria conta, em `/minha-conta` — pede a nova senha duas vezes
 * (evita erro de digitação) e some com o conteúdo depois de salvar com sucesso. Diferente de
 * `RedefinirSenhaForm` (que o master usa pra trocar a senha de OUTRA pessoa em `/usuarios`), aqui
 * não recebe nenhum `id` — a action pega a própria sessão de quem está logado.
 */
export function TrocarSenhaForm({
  action,
}: {
  action: (prevState: PermissaoActionState, formData: FormData) => Promise<PermissaoActionState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formAction(formData);
        formRef.current?.reset();
      }}
      className="space-y-4"
      autoComplete="off"
    >
      <FormSection title="Trocar senha">
        <FieldGroup>
          <TextField
            label="Nova senha"
            name="novaSenha"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
          />
          <TextField
            label="Confirmar nova senha"
            name="confirmarSenha"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Repita a nova senha"
          />
        </FieldGroup>
      </FormSection>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</p>
      ) : null}

      <SubmitButton label="Salvar nova senha" pendingLabel="Salvando..." />
    </form>
  );
}
