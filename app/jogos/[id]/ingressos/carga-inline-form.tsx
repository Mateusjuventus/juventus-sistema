"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { IngressoCargaFormState } from "./actions";

const initialState: IngressoCargaFormState = {};

function AdicionarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Adicionando..." : "Adicionar"}
    </button>
  );
}

/**
 * Formulário de adicionar uma carga, sempre visível acima da lista (sem navegar pra outra
 * página) — mesmo padrão do `ProgramacaoLinhaForm`. Ao adicionar com sucesso, os campos são
 * limpos (o `key` no form força o React a remontar os inputs não controlados).
 */
export function CargaInlineForm({ jogoId, action }: {
  jogoId: string;
  action: (prevState: IngressoCargaFormState, formData: FormData) => Promise<IngressoCargaFormState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.success) setFormKey((k) => k + 1);
  }, [state]);

  const errors = state.fieldErrors ?? {};

  return (
    <div>
      <form
        key={formKey}
        action={formAction}
        className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-neutral-300 p-3"
      >
        <input type="hidden" name="jogoId" value={jogoId} />

        <div>
          <label className="field-label">Quantidade recebida</label>
          <input
            type="number"
            name="quantidade"
            min={1}
            required
            placeholder="Ex.: 100"
            className="field-input w-32"
          />
          {errors.quantidade ? <p className="field-error">{errors.quantidade}</p> : null}
        </div>

        <div>
          <label className="field-label">Data</label>
          <input type="date" name="data" required defaultValue={new Date().toISOString().slice(0, 10)} className="field-input" />
          {errors.data ? <p className="field-error">{errors.data}</p> : null}
        </div>

        <div className="min-w-[200px] flex-1">
          <label className="field-label">Observações</label>
          <input type="text" name="observacoes" placeholder="Opcional" className="field-input" />
        </div>

        <AdicionarButton />
      </form>
      {state.error ? <p className="field-error">{state.error}</p> : null}
    </div>
  );
}
