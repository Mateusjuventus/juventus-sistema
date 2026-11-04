"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { SelectField, TextField } from "@/components/fields";
import { CurrencyField } from "@/components/currency-field";
import { RUBRICA_CONTRATO_OPTIONS } from "@/lib/validation/schemas";

export interface EvolucaoSalarialFormState {
  error?: string;
  success?: boolean;
}

function AdicionarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Salvando..." : "Adicionar evolução"}
    </button>
  );
}

/**
 * Mini-formulário de "+ Adicionar evolução" (Rubrica/Data/Novo valor) — evolução salarial do
 * contrato vigente (ver docs/superpowers/specs/2026-11-04-contrato-atleta-extensoes-design.md).
 * Mesmo padrão de `ContatoEmergenciaForm` (components/contato-emergencia-form.tsx): usa `key` pra
 * limpar os campos depois de um envio com sucesso, sem redirect.
 *
 * `contratoId`/`atletaId` vão como campos escondidos — a tabela só guarda `contrato_id`, mas a
 * action precisa do `atletaId` pra revalidar a página certa.
 */
export function EvolucaoSalarialForm({
  action,
  contratoId,
  atletaId,
}: {
  action: (prevState: EvolucaoSalarialFormState, formData: FormData) => Promise<EvolucaoSalarialFormState>;
  contratoId: string;
  atletaId: string;
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
        <input type="hidden" name="contratoId" value={contratoId} />
        <input type="hidden" name="atletaId" value={atletaId} />

        <div className="min-w-[160px] flex-1">
          <SelectField label="Rubrica" name="rubrica" required>
            <option value="">Selecione</option>
            {RUBRICA_CONTRATO_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="min-w-[150px]">
          <TextField label="A partir de" name="dataVigencia" type="date" required />
        </div>
        <div className="min-w-[150px]">
          <CurrencyField label="Novo valor" name="novoValor" required />
        </div>

        <AdicionarButton />
      </form>
      {state.error ? <p className="field-error">{state.error}</p> : null}
    </div>
  );
}
