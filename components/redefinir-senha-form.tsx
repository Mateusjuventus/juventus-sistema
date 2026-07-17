"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import type { PermissaoActionState } from "@/components/permissao-checkboxes-form";

const initialState: PermissaoActionState = {};

/**
 * Campo + botão pra master redefinir a senha de um usuário que perdeu/esqueceu a dele (o sistema
 * não manda e-mail de recuperação — a senha nova precisa ser repassada por fora, tipo WhatsApp).
 * Fica escondido atrás de um "Redefinir senha" recolhível em cada card de `/usuarios`, separado do
 * "Exibir permissões" porque é uma ação de conta, não uma permissão de acesso.
 */
export function RedefinirSenhaForm({
  id,
  action,
}: {
  id: string;
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
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <div className="min-w-[220px] flex-1">
        <label
          htmlFor={`nova-senha-${id}`}
          className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          Nova senha provisória
        </label>
        <input
          id={`nova-senha-${id}`}
          type="text"
          name="novaSenha"
          autoComplete="off"
          placeholder="Mínimo 6 caracteres"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-grena focus:outline-none focus:ring-1 focus:ring-grena"
        />
      </div>
      <SubmitButton label="Redefinir senha" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
      {state.success ? <span className="text-xs font-medium text-emerald-700">{state.success}</span> : null}
      {state.error ? <span className="text-xs font-medium text-red-700">{state.error}</span> : null}
    </form>
  );
}
