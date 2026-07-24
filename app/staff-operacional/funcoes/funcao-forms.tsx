"use client";

import { useFormState } from "react-dom";
import { TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { StaffFuncaoCatalogoRow } from "@/lib/supabase/types";
import type { FuncaoCatalogoFormState } from "./actions";

const initialState: FuncaoCatalogoFormState = {};

/** Form de "+ Nova função", sempre visível no topo da lista. */
export function FuncaoCreateForm({
  action,
}: {
  action: (prevState: FuncaoCatalogoFormState, formData: FormData) => Promise<FuncaoCatalogoFormState>;
}) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="card flex flex-wrap items-end gap-3 p-4" autoComplete="off">
      <div className="min-w-[220px] flex-1">
        <TextField
          label="Nova função"
          name="nome"
          placeholder="Ex: Fisioterapeuta"
          defaultValue={state.values?.nome}
          error={state.fieldErrors?.nome}
        />
      </div>
      {state.error ? <p className="w-full text-sm text-red-700">{state.error}</p> : null}
      <SubmitButton label="+ Adicionar função" pendingLabel="Adicionando..." />
    </form>
  );
}

/** Form inline de renomear, um por linha da lista — cada instância tem seu próprio estado, então
 * salvar uma não mexe nas outras linhas. */
export function FuncaoRenameForm({
  funcao,
  action,
}: {
  funcao: StaffFuncaoCatalogoRow;
  action: (prevState: FuncaoCatalogoFormState, formData: FormData) => Promise<FuncaoCatalogoFormState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const nomeAtual = state.values?.nome ?? funcao.nome;

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3" autoComplete="off">
      <input type="hidden" name="id" value={funcao.id} />
      <div className="min-w-[220px] flex-1">
        <TextField
          label="Nome"
          name="nome"
          defaultValue={nomeAtual}
          error={state.fieldErrors?.nome}
        />
      </div>
      {state.error ? <p className="w-full text-sm text-red-700">{state.error}</p> : null}
      <SubmitButton label="Salvar" pendingLabel="Salvando..." className="btn-secondary" />
    </form>
  );
}
