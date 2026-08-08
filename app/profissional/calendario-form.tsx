"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CATEGORIAS_EVENTO_CALENDARIO } from "@/lib/validation/schemas";
import type { EventoCalendarioFormState } from "./calendario-actions";

const initialState: EventoCalendarioFormState = {};

function SalvarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvando..." : "Salvar evento"}
    </button>
  );
}

/**
 * Formulário "+ Adicionar" do widget "Calendário" — fica escondido até o botão do cabeçalho ser
 * clicado (diferente do `CargaInlineForm`, que fica sempre visível; aqui abrir por padrão tomaria
 * espaço do widget mais visitado da Home o tempo todo). Fecha e limpa os campos sozinho quando o
 * evento é salvo com sucesso (o `key` no form força o React a remontar os inputs não controlados).
 */
export function CalendarioForm({
  action,
  dataInicial,
}: {
  action: (prevState: EventoCalendarioFormState, formData: FormData) => Promise<EventoCalendarioFormState>;
  dataInicial: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction] = useFormState(action, initialState);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.success) {
      setFormKey((k) => k + 1);
      setAberto(false);
    }
  }, [state]);

  const errors = state.fieldErrors ?? {};

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="btn-secondary text-xs">
        + Adicionar
      </button>
    );
  }

  return (
    <div className="w-full rounded-md border border-dashed border-linha bg-neutral-50 p-3">
      <form key={formKey} action={formAction} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <label className="field-label">Categoria</label>
          <select name="categoria" required defaultValue="" className="field-input">
            <option value="" disabled>
              Selecione
            </option>
            {CATEGORIAS_EVENTO_CALENDARIO.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {errors.categoria ? <p className="field-error">{errors.categoria}</p> : null}
        </div>

        <div className="col-span-2">
          <label className="field-label">Título</label>
          <input type="text" name="titulo" required placeholder="Ex.: Reunião com patrocinador" className="field-input" />
          {errors.titulo ? <p className="field-error">{errors.titulo}</p> : null}
        </div>

        <div>
          <label className="field-label">Data</label>
          <input type="date" name="data" required defaultValue={dataInicial} className="field-input" />
          {errors.data ? <p className="field-error">{errors.data}</p> : null}
        </div>

        <div>
          <label className="field-label">Horário</label>
          <input type="time" name="horario" className="field-input" />
        </div>

        <div className="col-span-2 sm:col-span-3">
          <label className="field-label">Observação</label>
          <input type="text" name="observacao" placeholder="Opcional" className="field-input" />
        </div>

        <div className="col-span-2 flex items-end gap-2 sm:col-span-4">
          <SalvarButton />
          <button type="button" onClick={() => setAberto(false)} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
      {state.error ? <p className="field-error mt-2">{state.error}</p> : null}
    </div>
  );
}
