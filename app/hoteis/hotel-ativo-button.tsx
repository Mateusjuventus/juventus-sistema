"use client";

import { useFormStatus } from "react-dom";

function ToggleSubmit({ ativo }: { ativo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-full border border-linha px-2.5 py-1 text-[11px] font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
    >
      {pending ? "..." : ativo ? "Desativar" : "Ativar"}
    </button>
  );
}

/** Ativar/desativar um hotel direto no cartão da listagem — hotel que o clube parou de usar sai da
 * lista principal sem ser apagado (o histórico de contato e diária ainda serve de consulta). */
export function HotelAtivoButton({
  action,
  id,
  ativo,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  ativo: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="ativo" value={ativo ? "1" : "0"} />
      <ToggleSubmit ativo={ativo} />
    </form>
  );
}
