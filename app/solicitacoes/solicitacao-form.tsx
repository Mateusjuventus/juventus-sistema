"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextAreaField, TextField } from "@/components/fields";
import { PhotoField } from "@/components/photo-field";
import { SubmitButton } from "@/components/submit-button";
import { SOLICITACAO_TIPOS, STAFF_CHAVE_PIX_TIPOS } from "@/lib/validation/schemas";
import type { SolicitacaoFormState } from "./actions";

const initialState: SolicitacaoFormState = {};

/**
 * Linhas de item da Compra, dentro do próprio formulário — dá pra adicionar/remover linhas antes
 * de salvar, sem precisar cadastrar a solicitação primeiro pra depois entrar de novo e incluir os
 * itens. Cada linha usa os MESMOS nomes de campo (itemQuantidade/itemItem/itemFoto); no servidor,
 * lemos todas as ocorrências na mesma ordem (ver salvarItensInline em ./actions.ts).
 */
function ItensCompraFields() {
  const [rows, setRows] = useState<string[]>(() => [crypto.randomUUID()]);

  return (
    <FormSection title="Itens da compra">
      <p className="-mt-1 text-sm text-neutral-500">
        Adicione um ou mais itens. Se precisar, dá pra incluir mais itens depois também.
      </p>
      <div className="space-y-4">
        {rows.map((rowId, i) => (
          <div key={rowId} className="rounded-md border border-neutral-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-600">Item {i + 1}</p>
              {rows.length > 1 ? (
                <button
                  type="button"
                  className="text-sm font-medium text-red-700 hover:underline"
                  onClick={() => setRows((r) => r.filter((id) => id !== rowId))}
                >
                  Remover
                </button>
              ) : null}
            </div>
            <FieldGroup>
              <TextField label="Quantidade" name="itemQuantidade" placeholder="Ex: 60 Unidades" />
              <TextField label="Item" name="itemItem" placeholder="Ex: Chaveiro Organizador Identificador" />
              <div className="sm:col-span-2">
                <PhotoField label="Foto do item (opcional)" name="itemFoto" shape="square" />
              </div>
            </FieldGroup>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn-secondary mt-4"
        onClick={() => setRows((r) => [...r, crypto.randomUUID()])}
      >
        + Adicionar item
      </button>
    </FormSection>
  );
}

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
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
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
          {tipo === "passagem_aerea" ? (
            <>
              <TextField
                label="Passageiro"
                name="passageiro"
                required
                defaultValue={values.passageiro}
                error={errors.passageiro}
              />
              <TextField
                label="Origem"
                name="origem"
                required
                defaultValue={values.origem}
                error={errors.origem}
              />
              <TextField
                label="Destino"
                name="destino"
                required
                defaultValue={values.destino}
                error={errors.destino}
              />
              <TextField
                label="Data do voo"
                name="dataVoo"
                type="date"
                required
                defaultValue={values.dataVoo}
                error={errors.dataVoo}
              />
              <TextField
                label="Horário do voo"
                name="horarioVoo"
                type="time"
                defaultValue={values.horarioVoo}
                error={errors.horarioVoo}
              />
            </>
          ) : null}
          <div className="sm:col-span-2">
            <TextAreaField
              label={tipo === "passagem_aerea" ? "Observações" : "Descrição da necessidade"}
              name="descricaoNecessidade"
              required={tipo !== "passagem_aerea"}
              rows={4}
              defaultValue={values.descricaoNecessidade}
              error={errors.descricaoNecessidade}
            />
          </div>
        </FieldGroup>
      </FormSection>

      {tipo === "compra" ? <ItensCompraFields /> : null}

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
