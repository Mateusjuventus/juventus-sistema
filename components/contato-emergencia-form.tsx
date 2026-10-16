"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

export interface ContatoEmergenciaFormState {
  error?: string;
  success?: boolean;
}

function AdicionarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Salvando..." : "Adicionar contato"}
    </button>
  );
}

/**
 * Mini-formulário de "+ Adicionar contato" (Nome/Parentesco/Contato) — lista de contatos de
 * emergência do atleta, compartilhado por Profissional e Base (ver docs/superpowers/specs/
 * 2026-10-16-atleta-dados-pessoais-design.md). Mesmo padrão de `DocumentoForm`
 * (app/atletas/[id]/documentacao/documento-form.tsx), sem upload de arquivo: usa `key` pra limpar
 * os campos depois de um envio com sucesso.
 *
 * `camposExtras`: campos escondidos adicionais (ex.: `atletaId`, e na Base também `categoria`, pra
 * a action saber qual caminho revalidar).
 */
export function ContatoEmergenciaForm({
  action,
  camposExtras,
}: {
  action: (prevState: ContatoEmergenciaFormState, formData: FormData) => Promise<ContatoEmergenciaFormState>;
  camposExtras?: Record<string, string>;
}) {
  const [state, formAction] = useFormState(action, {});
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
        {camposExtras
          ? Object.entries(camposExtras).map(([nome, valor]) => (
              <input key={nome} type="hidden" name={nome} value={valor} />
            ))
          : null}

        <div className="min-w-[180px] flex-1">
          <label className="field-label">Nome</label>
          <input type="text" name="nome" required className="field-input" />
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="field-label">Parentesco</label>
          <input type="text" name="parentesco" className="field-input" />
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="field-label">Contato</label>
          <input type="text" name="contato" className="field-input" />
        </div>

        <AdicionarButton />
      </form>
      {state.error ? <p className="field-error">{state.error}</p> : null}
    </div>
  );
}
