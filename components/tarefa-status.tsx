"use client";

import { TAREFA_STATUS } from "@/lib/validation/schemas";
import type { TarefaStatus } from "@/lib/supabase/types";

export const TAREFA_STATUS_BADGE_CLASS: Record<TarefaStatus, string> = {
  pendente: "bg-amber-100 text-amber-800",
  em_andamento: "bg-blue-100 text-blue-800",
  solicitado: "bg-purple-100 text-purple-800",
  concluido: "bg-green-100 text-green-800",
};

export function TarefaStatusBadge({ status }: { status: TarefaStatus }) {
  const label = TAREFA_STATUS.find((s) => s.value === status)?.label ?? status;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${TAREFA_STATUS_BADGE_CLASS[status]}`}
    >
      {label}
    </span>
  );
}

/**
 * Seletor de status embutido na listagem — troca de status com um clique, sem precisar abrir a
 * tarefa para editar. Envia o form assim que o usuário escolhe uma opção nova.
 */
export function TarefaStatusSelect({
  id,
  status,
  action,
}: {
  id: string;
  status: TarefaStatus;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-dourado ${TAREFA_STATUS_BADGE_CLASS[status]}`}
      >
        {TAREFA_STATUS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </form>
  );
}
