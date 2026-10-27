"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { AnotacaoFormState } from "../../actions";

const initialState: AnotacaoFormState = {};

function AdicionarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Salvando..." : "Adicionar anotação"}
    </button>
  );
}

/** Formulário de "+ Nova anotação" — mesmo padrão de `DocumentoForm` (remonta com `key` depois de um
 * envio com sucesso, pra limpar o campo). Sem campo de autor: a action sempre captura o perfil
 * logado. Ver docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-anotacoes-design.md. */
export function AnotacaoForm({
  action,
  atletaId,
}: {
  action: (prevState: AnotacaoFormState, formData: FormData) => Promise<AnotacaoFormState>;
  atletaId: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.success) setFormKey((k) => k + 1);
  }, [state]);

  return (
    <div>
      <form key={formKey} action={formAction} className="rounded-md border border-dashed border-neutral-300 p-3">
        <input type="hidden" name="atletaId" value={atletaId} />
        <label className="field-label">Nova anotação</label>
        <textarea
          name="texto"
          required
          rows={3}
          placeholder="Escreva uma observação sobre o atleta..."
          className="field-input"
        />
        <div className="mt-2 flex justify-end">
          <AdicionarButton />
        </div>
      </form>
      {state.error ? <p className="field-error">{state.error}</p> : null}
    </div>
  );
}
