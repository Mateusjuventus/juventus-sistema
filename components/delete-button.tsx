"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

function ConfirmSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-danger" disabled={pending}>
      {pending ? "Excluindo..." : label}
    </button>
  );
}

export interface DeleteActionState {
  error?: string;
}

const initialState: DeleteActionState = {};

/**
 * Botão de exclusão com confirmação em duas etapas (sem usar window.confirm),
 * para evitar perda acidental de dado conforme exigido pela spec.
 *
 * Duas formas de usar:
 * - `action`: Server Action "e esquece" (`(formData) => Promise<void>`) — usada na maioria das
 *   telas, quando a exclusão não tem restrição de integridade (chave estrangeira) que possa
 *   bloqueá-la.
 * - `errorAction`: Server Action que RETORNA `{ error? }` (mesmo formato de `useFormState`) — usar
 *   quando o registro pode estar referenciado em outro lugar do sistema (ex.: atleta que já foi
 *   capitão em alguma convocação) e a exclusão pode falhar; o erro do banco aparece pro usuário em
 *   vez de falhar silenciosamente (o "salvou mas não salvou" já visto na Rooming List).
 */
export function DeleteButton({
  action,
  errorAction,
  id,
  entityLabel = "registro",
}: {
  action?: (formData: FormData) => Promise<void>;
  errorAction?: (prevState: DeleteActionState, formData: FormData) => Promise<DeleteActionState>;
  id: string;
  entityLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useFormState(errorAction ?? (async () => initialState), initialState);

  if (!confirming) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setConfirming(true)}>
        Excluir
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 rounded-md bg-red-50 p-2">
        <span className="text-sm text-red-800">Confirma excluir este {entityLabel}?</span>
        <form action={errorAction ? formAction : action}>
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmit label="Sim, excluir" />
        </form>
        <button type="button" className="btn-secondary" onClick={() => setConfirming(false)}>
          Cancelar
        </button>
      </div>
      {state.error ? <p className="max-w-xs text-right text-xs text-red-700">{state.error}</p> : null}
    </div>
  );
}
