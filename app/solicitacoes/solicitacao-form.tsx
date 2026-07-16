"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextAreaField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { SOLICITACAO_TIPOS, STAFF_CHAVE_PIX_TIPOS } from "@/lib/validation/schemas";
import type { SolicitacaoFormState } from "./actions";

const initialState: SolicitacaoFormState = {};

export function SolicitacaoForm({
  action,
  entityId,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: SolicitacaoFormState, formData: FormData) => Promise<SolicitacaoFormState>;
  entityId?: string;
  defaultValues?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};
  const [tipo, setTipo] = useState(values.tipo || "compra");

  return (
    <form action={formAction} className="space-y-6">
      {entityId ? <input type="hidden" name="id" value={entityId} /> : null}
      <FormSection title="Dados da solicitação">
        <FieldGroup>
          <SelectField
            label="Tipo de solicitação"
            name="tipo"
            required
            defaultValue={values.tipo ?? "compra"}
            error={errors.tipo}
            onChange={setTipo}
          >
            {SOLICITACAO_TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Data"
            name="dataSolicitacao"
            type="date"
            required
            defaultValue={values.dataSolicitacao}
            error={errors.dataSolicitacao}
          />
          <TextField
            label="Solicitante"
            name="solicitante"
            required
            defaultValue={values.solicitante}
            error={errors.solicitante}
          />
          <TextField
            label="Setor / C.C"
            name="setor"
            required
            defaultValue={values.setor}
            error={errors.setor}
          />
          <TextField
            label="Prazo sugerido"
            name="prazoSugerido"
            type="date"
            defaultValue={values.prazoSugerido}
            error={errors.prazoSugerido}
          />
          {tipo === "pagamento" || tipo === "reembolso" ? (
            <TextField
              label={tipo === "reembolso" ? "Valor a reembolsar (R$)" : "Valor a pagar (R$)"}
              name="valor"
              type="number"
              step="0.01"
              min={0}
              defaultValue={values.valor}
              error={errors.valor}
            />
          ) : null}
          {tipo === "reembolso" ? (
            <>
              <TextField
                label="Chave PIX"
                name="chavePix"
                required
                defaultValue={values.chavePix}
                error={errors.chavePix}
              />
              <SelectField
                label="Tipo de chave PIX"
                name="chavePixTipo"
                defaultValue={values.chavePixTipo}
                error={errors.chavePixTipo}
              >
                <option value="">Selecione</option>
                {STAFF_CHAVE_PIX_TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </SelectField>
            </>
          ) : null}
          <div className="sm:col-span-2">
            <TextAreaField
              label="Descrição da necessidade"
              name="descricaoNecessidade"
              required
              rows={4}
              defaultValue={values.descricaoNecessidade}
              error={errors.descricaoNecessidade}
            />
          </div>
        </FieldGroup>
      </FormSection>

      {tipo === "compra" ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Depois de salvar, você adiciona os itens da compra (quantidade, item e foto) na tela da
          solicitação.
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
