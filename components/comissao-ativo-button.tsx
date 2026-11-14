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

/**
 * Botão de ativar/desativar um cadastro da Comissão Técnica/Diretoria — pedido do Mateus em
 * 14/11/2026, explicitamente SEM motivo nem histórico (diferente do que já existe pros atletas,
 * `AtletaAtivoButton`/`atletas_ativo_historico`). Mesmo padrão simples de `StaffAtivoButton`
 * (components/staff-ativo-button.tsx) — reaproveitado em vez de criado do zero, já que o
 * comportamento é idêntico.
 */
export function ComissaoAtivoButton({
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
