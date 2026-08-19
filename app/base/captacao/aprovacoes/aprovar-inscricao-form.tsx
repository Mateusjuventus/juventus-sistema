"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import { aprovarInscricaoCaptacao, mudarStatusCaptacao, type AprovarInscricaoState } from "../actions";

const initialState: AprovarInscricaoState = {};

/**
 * Linha de ação da fila de "Aprovações" (`/base/captacao/aprovacoes`): pede a Data de Início e
 * aprova a inscrição pra ela virar "Em avaliação" de verdade, ou recusa direto (some da fila e cai
 * em "Dispensado", igual às outras trocas de status).
 */
export function AprovarInscricaoForm({ candidatoId }: { candidatoId: string }) {
  const [state, formAction] = useFormState(aprovarInscricaoCaptacao, initialState);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={candidatoId} />
        <div>
          <label htmlFor={`dataInicio-${candidatoId}`} className="field-label">
            Data de início
          </label>
          <input
            id={`dataInicio-${candidatoId}`}
            name="dataInicio"
            type="date"
            required
            className="field-input"
          />
        </div>
        <SubmitButton label="Aprovar inscrição" pendingLabel="Aprovando..." />
      </form>
      <form action={mudarStatusCaptacao}>
        <input type="hidden" name="id" value={candidatoId} />
        <input type="hidden" name="status" value="dispensado" />
        <button type="submit" className="btn-secondary text-sm">
          Recusar
        </button>
      </form>
      {state.error ? <p className="w-full text-xs font-medium text-red-700">{state.error}</p> : null}
    </div>
  );
}
