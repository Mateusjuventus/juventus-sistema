"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import { aprovarCaptacao, type AprovarCaptacaoState } from "./actions";

const initialState: AprovarCaptacaoState = {};

/**
 * Botão de Aprovar — mostra o erro inline quando falta categoria/posição/nascimento (ver
 * `aprovarCaptacao`), em vez de só falhar silenciosamente como as outras trocas de status.
 * Aprovar é o botão que efetivamente cria o Atleta, então merece mais atenção que "Dispensar".
 */
export function AprovarButton({ captacaoId }: { captacaoId: string }) {
  const [state, formAction] = useFormState(aprovarCaptacao, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={captacaoId} />
      {state.error ? <p className="text-xs font-medium text-red-700">{state.error}</p> : null}
      <SubmitButton label="Aprovar e criar cadastro de Atleta" pendingLabel="Criando cadastro..." />
    </form>
  );
}
