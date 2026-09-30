"use client";

import { useFormState } from "react-dom";
import { FieldGroup, SelectField, TextAreaField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { QUEIXA_TIPO_OPTIONS } from "@/lib/futebol/fisioterapia";
import {
  encerrarLesao,
  registrarAtendimento,
  registrarLesao,
  registrarQueixa,
  type FisioterapiaFormState,
} from "./actions";

const initialState: FisioterapiaFormState = {};

function Feedback({ state }: { state: FisioterapiaFormState }) {
  if (state.error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state.success)
    return <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</p>;
  return null;
}

export function NovaLesaoForm({ atletaId }: { atletaId: string }) {
  const [state, formAction] = useFormState(registrarLesao, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <details className="card mt-3 p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold text-grena">+ Nova lesão</summary>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="atletaId" value={atletaId} />
        <TextAreaField label="Descrição da lesão" name="descricao" error={errors.descricao} required rows={2} />
        <FieldGroup>
          <TextField label="Data de início" name="dataInicio" type="date" error={errors.dataInicio} required />
          <TextField
            label="Data de fim (deixe em branco se ainda estiver em andamento)"
            name="dataFim"
            type="date"
            error={errors.dataFim}
          />
        </FieldGroup>
        <TextAreaField label="Observações" name="observacoes" rows={2} />
        {state.error || state.success ? <Feedback state={state} /> : null}
        <SubmitButton label="Salvar lesão" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
      </form>
    </details>
  );
}

export function EncerrarLesaoForm({ atletaId, lesaoId, dataInicio }: { atletaId: string; lesaoId: string; dataInicio: string }) {
  const [state, formAction] = useFormState(encerrarLesao, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <details className="mt-2">
      <summary className="cursor-pointer select-none text-xs font-semibold text-grena">Encerrar lesão</summary>
      <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
        <input type="hidden" name="atletaId" value={atletaId} />
        <input type="hidden" name="lesaoId" value={lesaoId} />
        <input type="hidden" name="dataInicioAtual" value={dataInicio} />
        <TextField label="Data de fim" name="dataFim" type="date" error={errors.dataFim} required />
        <SubmitButton label="Encerrar" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
      </form>
      {state.error ? <p className="mt-1 text-xs text-red-700">{state.error}</p> : null}
      {state.success ? <p className="mt-1 text-xs text-emerald-700">{state.success}</p> : null}
    </details>
  );
}

export function NovaQueixaForm({ atletaId }: { atletaId: string }) {
  const [state, formAction] = useFormState(registrarQueixa, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <details className="card mt-3 p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold text-grena">+ Nova queixa</summary>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="atletaId" value={atletaId} />
        <FieldGroup>
          <SelectField label="Tipo" name="tipo" error={errors.tipo} required>
            <option value="">Selecione</option>
            {QUEIXA_TIPO_OPTIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </SelectField>
          <TextField label="Data" name="data" type="date" error={errors.data} required />
        </FieldGroup>
        <TextAreaField label="O que o atleta sentiu, onde" name="descricao" error={errors.descricao} required rows={2} />
        {state.error || state.success ? <Feedback state={state} /> : null}
        <SubmitButton label="Salvar queixa" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
      </form>
    </details>
  );
}

export function NovoAtendimentoForm({
  atletaId,
  lesoesAtivas,
}: {
  atletaId: string;
  lesoesAtivas: { id: string; descricao: string }[];
}) {
  const [state, formAction] = useFormState(registrarAtendimento, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <details className="card mt-3 p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold text-grena">+ Novo atendimento</summary>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="atletaId" value={atletaId} />
        <FieldGroup>
          <TextField label="Data" name="data" type="date" error={errors.data} required />
          <SelectField label="Ligar a uma lesão em andamento (opcional)" name="lesaoId" defaultValue="">
            <option value="">Sessão solta (sem lesão vinculada)</option>
            {lesoesAtivas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.descricao}
              </option>
            ))}
          </SelectField>
        </FieldGroup>
        <TextAreaField label="O que foi feito na sessão" name="descricao" error={errors.descricao} required rows={2} />
        {state.error || state.success ? <Feedback state={state} /> : null}
        <SubmitButton label="Salvar atendimento" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
      </form>
    </details>
  );
}
