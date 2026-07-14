"use client";

import { useFormStatus } from "react-dom";

function ToggleSubmit({ ativo }: { ativo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Salvando..." : ativo ? "Desativar" : "Ativar"}
    </button>
  );
}

/** Botão de ativar/desativar um cadastro de Staff Operacional, direto na listagem. */
export function StaffAtivoButton({
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
      <input type="hidden" name="novoValor" value={(!ativo).toString()} />
      <ToggleSubmit ativo={ativo} />
    </form>
  );
}
