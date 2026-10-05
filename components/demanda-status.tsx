"use client";

import { DEMANDA_STATUS } from "@/lib/validation/schemas";
import type { DemandaStatus } from "@/lib/supabase/types";

/** Mesmo padrão visual de `TAREFA_STATUS_BADGE_CLASS` — 3 status em vez de 4 (sem "solicitado",
 * que só existe em Tarefas). */
export const DEMANDA_STATUS_BADGE_CLASS: Record<DemandaStatus, string> = {
  pendente: "bg-amber-100 text-amber-800",
  em_andamento: "bg-blue-100 text-blue-800",
  concluido: "bg-green-100 text-green-800",
};

export function DemandaStatusBadge({ status }: { status: DemandaStatus }) {
  const label = DEMANDA_STATUS.find((s) => s.value === status)?.label ?? status;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${DEMANDA_STATUS_BADGE_CLASS[status]}`}>
      {label}
    </span>
  );
}

/** Troca de status com um clique, sem abrir a demanda — mesmo padrão de `TarefaStatusSelect`. */
export function DemandaStatusSelect({
  id,
  status,
  action,
}: {
  id: string;
  status: DemandaStatus;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-dourado ${DEMANDA_STATUS_BADGE_CLASS[status]}`}
      >
        {DEMANDA_STATUS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </form>
  );
}
