"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel?: string;
  /** Sobrescreve a classe padrão (`btn-primary`) — usado onde o botão precisa ser secundário/menor,
   * como nos formulários de permissão de `/usuarios`. */
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className ?? "btn-primary"} disabled={pending}>
      {pending ? (pendingLabel ?? "Salvando...") : label}
    </button>
  );
}
