"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { DeleteButton } from "@/components/delete-button";
import { FieldGroup, TextAreaField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import type { AssistenciaSocialAtendimentoRow } from "@/lib/supabase/types";
import {
  atualizarAtendimento,
  excluirAtendimento,
  registrarAtendimento,
  type AssistenciaSocialFormState,
} from "./actions";

const initialState: AssistenciaSocialFormState = {};

function Feedback({ state }: { state: AssistenciaSocialFormState }) {
  if (state.error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state.success)
    return <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</p>;
  return null;
}

/** Mesmo padrão de `NovoAtendimentoForm` da Fisioterapia — sem o vínculo com lesão (não existe
 * aqui), com "Encaminhamento" opcional a mais. */
export function NovoAtendimentoForm({ atletaId }: { atletaId: string }) {
  const [state, formAction] = useFormState(registrarAtendimento, initialState);

  return (
    <details className="card mt-3 p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold text-grena">+ Registrar atendimento</summary>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="atletaId" value={atletaId} />
        <FieldGroup>
          <TextField label="Data" name="data" type="date" error={state.fieldErrors?.data} required />
        </FieldGroup>
        <TextAreaField
          label="Anotações do atendimento"
          name="anotacoes"
          error={state.fieldErrors?.anotacoes}
          required
          rows={3}
        />
        <TextAreaField
          label="Encaminhamento (opcional)"
          name="encaminhamento"
          error={state.fieldErrors?.encaminhamento}
          rows={2}
        />
        {state.error || state.success ? <Feedback state={state} /> : null}
        <SubmitButton label="Salvar atendimento" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
      </form>
    </details>
  );
}

/** Mesmo padrão de `AtendimentoItem` da Fisioterapia — clique abre edição inline, sem navegar pra
 * outra tela. */
export function AtendimentoItem({
  atletaId,
  atendimento,
}: {
  atletaId: string;
  atendimento: AssistenciaSocialAtendimentoRow;
}) {
  const [editando, setEditando] = useState(false);
  const [state, formAction] = useFormState(atualizarAtendimento, initialState);

  useEffect(() => {
    if (state.success) setEditando(false);
  }, [state]);

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="group -mx-2 flex w-[calc(100%+1rem)] flex-col items-start rounded-md px-2 py-1 text-left transition hover:bg-neutral-50"
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span className="text-sm font-medium text-neutral-800">{formatDataBr(atendimento.data)}</span>
          <span className="shrink-0 text-[11px] font-semibold text-grena opacity-0 transition group-hover:opacity-100">
            Editar
          </span>
        </span>
        <span className="text-xs text-neutral-500">{atendimento.anotacoes}</span>
        {atendimento.encaminhamento ? (
          <span className="mt-0.5 text-xs text-neutral-400">Encaminhamento: {atendimento.encaminhamento}</span>
        ) : null}
      </button>
    );
  }

  return (
    <div className="rounded-md border border-grena/30 bg-white p-3">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="atletaId" value={atletaId} />
        <input type="hidden" name="atendimentoId" value={atendimento.id} />
        <FieldGroup>
          <TextField label="Data" name="data" type="date" defaultValue={atendimento.data} required />
        </FieldGroup>
        <TextAreaField label="Anotações" name="anotacoes" defaultValue={atendimento.anotacoes} required rows={3} />
        <TextAreaField
          label="Encaminhamento (opcional)"
          name="encaminhamento"
          defaultValue={atendimento.encaminhamento ?? ""}
          rows={2}
        />
        {state.error ? <Feedback state={state} /> : null}
        <div className="flex gap-2">
          <SubmitButton label="Salvar" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
          <button type="button" onClick={() => setEditando(false)} className="btn-secondary btn-sm">
            Cancelar
          </button>
          <DeleteButton errorAction={excluirAtendimento} id={atendimento.id} entityLabel="atendimento" />
        </div>
      </form>
    </div>
  );
}
