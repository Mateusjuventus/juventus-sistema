"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { DocumentoFormState } from "./actions";

const initialState: DocumentoFormState = {};

function AdicionarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Enviando..." : "Adicionar documento"}
    </button>
  );
}

/** Formulário de adicionar um documento (nome + arquivo) — usa `key` no form pra limpar os campos
 * depois de um envio com sucesso (input de arquivo não aceita `defaultValue`, então precisa
 * remontar o form inteiro, mesmo padrão já usado em `ProgramacaoLinhaForm`). */
export function DocumentoForm({
  action,
  atletaId,
}: {
  action: (prevState: DocumentoFormState, formData: FormData) => Promise<DocumentoFormState>;
  atletaId: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.success) setFormKey((k) => k + 1);
  }, [state]);

  return (
    <div>
      <form
        key={formKey}
        action={formAction}
        className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-neutral-300 p-3"
      >
        <input type="hidden" name="atletaId" value={atletaId} />

        <div className="min-w-[220px] flex-1">
          <label className="field-label">Nome</label>
          <input
            type="text"
            name="nome"
            placeholder="Ex.: RG frente"
            required
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label">Arquivo</label>
          <input type="file" name="arquivo" required className="field-input" />
        </div>

        <AdicionarButton />
      </form>
      {state.error ? <p className="field-error">{state.error}</p> : null}
    </div>
  );
}
