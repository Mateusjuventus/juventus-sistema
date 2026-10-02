"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import type { PermissaoActionState } from "@/components/permissao-checkboxes-form";

const initialState: PermissaoActionState = {};

/**
 * Campo + botão pra master alterar o e-mail de login de um usuário já existente — espelha
 * `RedefinirSenhaForm` (mesmo lugar na tela, mesmo estilo). Ver docs/superpowers/specs/
 * 2026-10-02-assinatura-treinador-design.md.
 */
export function AlterarEmailForm({
  id,
  emailAtual,
  action,
}: {
  id: string;
  emailAtual: string;
  action: (prevState: PermissaoActionState, formData: FormData) => Promise<PermissaoActionState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formAction(formData);
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <div className="min-w-[220px] flex-1">
        <label
          htmlFor={`novo-email-${id}`}
          className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          Novo e-mail
        </label>
        <input
          id={`novo-email-${id}`}
          type="email"
          name="novoEmail"
          autoComplete="off"
          defaultValue={emailAtual}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-grena focus:outline-none focus:ring-1 focus:ring-grena"
        />
      </div>
      <SubmitButton label="Alterar e-mail" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
      {state.success ? <span className="text-xs font-medium text-emerald-700">{state.success}</span> : null}
      {state.error ? <span className="text-xs font-medium text-red-700">{state.error}</span> : null}
    </form>
  );
}
