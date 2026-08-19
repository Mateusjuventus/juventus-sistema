"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import type { AlojamentoConfigFormState } from "./actions";

const initialState: AlojamentoConfigFormState = {};

export function AlojamentoConfigForm({
  action,
  capacidadeInicial,
  observacoesIniciais,
}: {
  action: (prevState: AlojamentoConfigFormState, formData: FormData) => Promise<AlojamentoConfigFormState>;
  capacidadeInicial: number;
  observacoesIniciais: string;
}) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="w-32">
        <label htmlFor="capacidadeTotal" className="field-label">
          Vagas totais
        </label>
        <input
          id="capacidadeTotal"
          name="capacidadeTotal"
          type="number"
          min={0}
          step="1"
          defaultValue={capacidadeInicial}
          className="field-input"
        />
      </div>
      <div className="min-w-[220px] flex-1">
        <label htmlFor="observacoes" className="field-label">
          Observações
        </label>
        <input
          id="observacoes"
          name="observacoes"
          defaultValue={observacoesIniciais}
          placeholder="Ex.: 2 quartos em reforma"
          className="field-input"
        />
      </div>
      <SubmitButton label="Salvar" />
      {state.error ? <p className="w-full text-sm text-red-700">{state.error}</p> : null}
    </form>
  );
}
