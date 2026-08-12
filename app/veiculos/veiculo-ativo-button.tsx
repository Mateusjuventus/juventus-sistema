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

/** Ativar/desativar um veículo direto na listagem — carro vendido ou trocado sai da lista de
 * seleção do documento sem apagar o cadastro. */
export function VeiculoAtivoButton({
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
