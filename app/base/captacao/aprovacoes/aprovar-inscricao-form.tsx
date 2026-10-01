"use client";

import { useFormState } from "react-dom";
import { DeleteButton } from "@/components/delete-button";
import { SubmitButton } from "@/components/submit-button";
import { aprovarInscricaoCaptacao, excluirInscricao, recusarInscricao, type AprovarInscricaoState } from "../actions";

const initialState: AprovarInscricaoState = {};

/**
 * Linha de ação da fila de "Aprovações" (`/base/captacao/aprovacoes`): pede a Data de Início e
 * aprova a inscrição pra ela virar "Em avaliação" de verdade, ou recusa direto (some da fila e cai
 * em "Dispensado"). "Excluir" é separado de "Recusar": apaga o registro (e a foto/documentos
 * anexados) de vez, pra tirar duplicatas de quem se inscreveu mais de uma vez pelo link público —
 * "Recusar" mantém o histórico, pra quando é um candidato de verdade que não foi aprovado.
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
      <form action={recusarInscricao}>
        <input type="hidden" name="id" value={candidatoId} />
        <button type="submit" className="btn-secondary text-sm">
          Recusar
        </button>
      </form>
      <DeleteButton errorAction={excluirInscricao} id={candidatoId} entityLabel="inscrição" />
      {state.error ? <p className="w-full text-xs font-medium text-red-700">{state.error}</p> : null}
    </div>
  );
}
