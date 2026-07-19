"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { IngressoSolicitacaoFormState } from "./actions";

const initialState: IngressoSolicitacaoFormState = {};

function AdicionarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Adicionando..." : "Adicionar"}
    </button>
  );
}

/**
 * Formulário de adicionar uma solicitação (nome + quantidade solicitada/atendida), sempre visível
 * acima da lista — mesmo padrão do `CargaInlineForm`/`ProgramacaoLinhaForm`. Se o atendido
 * informado deixar o saldo negativo, o erro do server action aparece embaixo do formulário sem
 * perder o que já foi digitado (os `values` retornados pelo action reabastecem os campos).
 */
export function SolicitacaoInlineForm({ jogoId, action }: {
  jogoId: string;
  action: (
    prevState: IngressoSolicitacaoFormState,
    formData: FormData,
  ) => Promise<IngressoSolicitacaoFormState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.success) setFormKey((k) => k + 1);
  }, [state]);

  const values = state.success ? {} : (state.values ?? {});
  const errors = state.fieldErrors ?? {};

  return (
    <div>
      <form
        key={formKey}
        action={formAction}
        className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-neutral-300 p-3"
      >
        <input type="hidden" name="jogoId" value={jogoId} />

        <div className="min-w-[160px] flex-1">
          <label className="field-label">Nome do solicitante</label>
          <input
            type="text"
            name="nomeSolicitante"
            required
            defaultValue={values.nomeSolicitante}
            placeholder="Ex.: João Silva"
            className="field-input"
          />
          {errors.nomeSolicitante ? <p className="field-error">{errors.nomeSolicitante}</p> : null}
        </div>

        <div>
          <label className="field-label">Solicitado</label>
          <input
            type="number"
            name="quantidadeSolicitada"
            min={1}
            required
            defaultValue={values.quantidadeSolicitada}
            className="field-input w-24"
          />
          {errors.quantidadeSolicitada ? <p className="field-error">{errors.quantidadeSolicitada}</p> : null}
        </div>

        <div>
          <label className="field-label">Atendido</label>
          <input
            type="number"
            name="quantidadeAtendida"
            min={0}
            defaultValue={values.quantidadeAtendida}
            placeholder="0"
            className="field-input w-24"
          />
          {errors.quantidadeAtendida ? <p className="field-error">{errors.quantidadeAtendida}</p> : null}
        </div>

        <div className="min-w-[160px] flex-1">
          <label className="field-label">Observações</label>
          <input
            type="text"
            name="observacoes"
            defaultValue={values.observacoes}
            placeholder="Opcional"
            className="field-input"
          />
        </div>

        <AdicionarButton />
      </form>
      {state.error ? <p className="field-error">{state.error}</p> : null}
    </div>
  );
}
