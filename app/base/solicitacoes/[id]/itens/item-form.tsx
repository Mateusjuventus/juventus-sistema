"use client";

import { useFormState } from "react-dom";
import { FieldGroup, TextField } from "@/components/fields";
import { PhotoField } from "@/components/photo-field";
import { SubmitButton } from "@/components/submit-button";
import type { SolicitacaoItemFormState } from "./actions";

const initialState: SolicitacaoItemFormState = {};

export function SolicitacaoItemForm({
  action,
  solicitacaoId,
}: {
  action: (prevState: SolicitacaoItemFormState, formData: FormData) => Promise<SolicitacaoItemFormState>;
  solicitacaoId: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card space-y-4 p-5" encType="multipart/form-data">
      <input type="hidden" name="solicitacaoId" value={solicitacaoId} />
      <FieldGroup>
        <TextField
          label="Item"
          name="item"
          required
          placeholder="Ex: Chaveiro Organizador Identificador"
          defaultValue={values.item}
          error={errors.item}
        />
        <TextField
          label="Quantidade"
          name="quantidade"
          required
          placeholder="Ex: 60 Unidades"
          defaultValue={values.quantidade}
          error={errors.quantidade}
        />
        <div className="sm:col-span-2">
          <TextField
            label="Observação (opcional)"
            name="observacao"
            defaultValue={values.observacao}
            error={errors.observacao}
          />
        </div>
        <div className="sm:col-span-2">
          <PhotoField label="Foto do item (opcional)" name="foto" shape="square" />
        </div>
      </FieldGroup>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label="Adicionar item" />
      </div>
    </form>
  );
}
