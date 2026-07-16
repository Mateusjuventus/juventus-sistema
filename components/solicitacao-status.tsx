"use client";

import { SOLICITACAO_STATUS } from "@/lib/validation/schemas";
import type { SolicitacaoStatus } from "@/lib/supabase/types";

export const SOLICITACAO_STATUS_BADGE_CLASS: Record<SolicitacaoStatus, string> = {
  pendente: "bg-amber-100 text-amber-800",
  aprovada: "bg-blue-100 text-blue-800",
  recusada: "bg-red-100 text-red-800",
  concluida: "bg-green-100 text-green-800",
};

export function SolicitacaoStatusBadge({ status }: { status: SolicitacaoStatus }) {
  const label = SOLICITACAO_STATUS.find((s) => s.value === status)?.label ?? status;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${SOLICITACAO_STATUS_BADGE_CLASS[status]}`}
    >
      {label}
    </span>
  );
}

/** Seletor de status embutido na listagem — troca de status com um clique, sem abrir a solicitação. */
export function SolicitacaoStatusSelect({
  id,
  status,
  action,
}: {
  id: string;
  status: SolicitacaoStatus;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-dourado ${SOLICITACAO_STATUS_BADGE_CLASS[status]}`}
      >
        {SOLICITACAO_STATUS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </form>
  );
}
