"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function ConfirmSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-danger" disabled={pending}>
      {pending ? "Excluindo..." : label}
    </button>
  );
}

/**
 * Botão de exclusão com confirmação em duas etapas (sem usar window.confirm),
 * para evitar perda acidental de dado conforme exigido pela spec.
 */
export function DeleteButton({
  action,
  entityLabel = "registro",
}: {
  action: () => Promise<void>;
  entityLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setConfirming(true)}>
        Excluir
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md bg-red-50 p-2">
      <span className="text-sm text-red-800">Confirma excluir este {entityLabel}?</span>
      <form action={action}>
        <ConfirmSubmit label="Sim, excluir" />
      </form>
      <button type="button" className="btn-secondary" onClick={() => setConfirming(false)}>
        Cancelar
      </button>
    </div>
  );
}
