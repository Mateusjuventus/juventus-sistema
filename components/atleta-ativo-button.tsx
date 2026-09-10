"use client";

import { useFormStatus } from "react-dom";

function ToggleSubmit({ ativo }: { ativo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Salvando..." : ativo ? "Desativar atleta" : "Ativar atleta"}
    </button>
  );
}

/**
 * Botão de ativar/desativar um atleta (Profissional ou Base), na página "Ver atleta" ao lado de
 * "Editar" (ver `AtletaPerfilHeader`) — mesmo padrão de `StaffAtivoButton`
 * (components/staff-ativo-button.tsx). `camposExtras` carrega campos escondidos além de `id` que a
 * action precisa pra revalidar a página certa (ex.: `categoria`, só na Base — ver
 * `alternarAtletaBaseAtivo`).
 */
export function AtletaAtivoButton({
  action,
  id,
  ativo,
  camposExtras,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  ativo: boolean;
  camposExtras?: Record<string, string>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="novoValor" value={(!ativo).toString()} />
      {camposExtras
        ? Object.entries(camposExtras).map(([nome, valor]) => (
            <input key={nome} type="hidden" name={nome} value={valor} />
          ))
        : null}
      <ToggleSubmit ativo={ativo} />
    </form>
  );
}
