"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextAreaField, TextField } from "@/components/fields";
import { CurrencyField } from "@/components/currency-field";
import { PhotoField } from "@/components/photo-field";
import { SubmitButton } from "@/components/submit-button";
import { SOLICITACAO_TIPOS, STAFF_CHAVE_PIX_TIPOS, TIPO_CONTA_BANCARIA } from "@/lib/validation/schemas";
import type { SolicitacaoFormState } from "./actions";

const initialState: SolicitacaoFormState = {};

/**
 * Seletor do tipo de solicitação — fica sempre visível como um grupo de botões (em vez de um
 * <select> escondido dentro de uma lista suspensa), com as opções numeradas e fixas. Clicar num
 * botão seleciona o tipo (via input escondido, pra ir junto no FormData) e revela os campos certos
 * logo abaixo.
 */
function TipoSolicitacaoField({
  tipo,
  setTipo,
  error,
}: {
  tipo: string;
  setTipo: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="sm:col-span-2">
      <label className="field-label">
        Tipo de solicitação
        <span className="text-red-700"> *</span>
      </label>
      <input type="hidden" name="tipo" value={tipo} />
      <div className="flex flex-wrap gap-2">
        {SOLICITACAO_TIPOS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTipo(t.value)}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              tipo === t.value
                ? "border-grena bg-grena text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:border-grena hover:text-grena"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

/**
 * Linhas de item da Compra, dentro do próprio formulário — dá pra adicionar/remover linhas antes
 * de salvar, sem precisar cadastrar a solicitação primeiro pra depois entrar de novo e incluir os
 * itens. Cada linha usa os MESMOS nomes de campo (itemQuantidade/itemItem/itemObservacao/itemFoto);
 * no servidor, lemos todas as ocorrências na mesma ordem (ver salvarItensInline em ./actions.ts).
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
              <TextField
                label="Item"
                name="itemItem"
                id={`itemItem-${rowId}`}
                autoComplete="off"
                placeholder="Ex: Chaveiro Organizador Identificador"
              />
              <TextField
                label="Quantidade"
                name="itemQuantidade"
                id={`itemQuantidade-${rowId}`}
                autoComplete="off"
                placeholder="Ex: 60 Unidades"
              />
              <div className="sm:col-span-2">
                <TextField
                  label="Observação (opcional)"
                  name="itemObservacao"
                  id={`itemObservacao-${rowId}`}
                  autoComplete="off"
                  placeholder="Ex: Cor preta"
                />
              </div>
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

/**
 * Linhas de item do Pagamento/Reembolso (Descrição, Observação, Valor) — o valor total da
 * solicitação é calculado automaticamente como a soma dos itens (ver salvarItensInline em
 * ./actions.ts), então não existe mais um campo único de "Valor" no topo do formulário.
 */
function ItensPagamentoReembolsoFields({ tipo }: { tipo: string }) {
  const [rows, setRows] = useState<string[]>(() => [crypto.randomUUID()]);

  return (
    <FormSection title={tipo === "reembolso" ? "Itens do reembolso" : "Itens do pagamento"}>
      <p className="-mt-1 text-sm text-neutral-500">
        Adicione um ou mais itens com o valor de cada um — o valor total é somado automaticamente.
        Se precisar, dá pra incluir mais itens depois também.
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
              <TextField
                label="Descrição"
                name="itemDescricao"
                id={`itemDescricao-${rowId}`}
                autoComplete="off"
                placeholder="Ex: Mensalidade do plano de saúde"
              />
              <CurrencyField label="Valor (R$)" name="itemValor" id={`itemValor-${rowId}`} />
              <div className="sm:col-span-2">
                <TextField
                  label="Observação (opcional)"
                  name="itemObservacao"
                  id={`itemObservacao-${rowId}`}
                  autoComplete="off"
                  placeholder="Ex: Referente a julho/2026"
                />
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

/**
 * Linhas de item da Passagem Aérea (Passageiro, Origem, Destino, Data e Horário, Observações) —
 * vira uma lista pra dar pra pedir passagem de mais de uma pessoa na mesma solicitação.
 */
function ItensPassagemFields() {
  const [rows, setRows] = useState<string[]>(() => [crypto.randomUUID()]);

  return (
    <FormSection title="Passageiros">
      <p className="-mt-1 text-sm text-neutral-500">
        Adicione um ou mais passageiros/trechos. Se precisar, dá pra incluir mais depois também.
      </p>
      <div className="space-y-4">
        {rows.map((rowId, i) => (
          <div key={rowId} className="rounded-md border border-neutral-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-600">Passageiro {i + 1}</p>
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
              <TextField
                label="Passageiro"
                name="itemPassageiro"
                id={`itemPassageiro-${rowId}`}
                autoComplete="off"
              />
              <TextField label="Origem" name="itemOrigem" id={`itemOrigem-${rowId}`} autoComplete="off" />
              <TextField label="Destino" name="itemDestino" id={`itemDestino-${rowId}`} autoComplete="off" />
              <TextField
                label="Data do voo"
                name="itemDataVoo"
                id={`itemDataVoo-${rowId}`}
                autoComplete="off"
                type="date"
              />
              <TextField
                label="Horário do voo"
                name="itemHorarioVoo"
                id={`itemHorarioVoo-${rowId}`}
                autoComplete="off"
                type="time"
              />
              <TextField
                label="Observações (opcional)"
                name="itemObservacao"
                id={`itemObservacao-${rowId}`}
                autoComplete="off"
              />
            </FieldGroup>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn-secondary mt-4"
        onClick={() => setRows((r) => [...r, crypto.randomUUID()])}
      >
        + Adicionar passageiro
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
    <form action={formAction} className="space-y-6" encType="multipart/form-data" autoComplete="off">
      {entityId ? <input type="hidden" name="id" value={entityId} /> : null}
      <FormSection title="Dados da solicitação">
        <FieldGroup>
          <TipoSolicitacaoField tipo={tipo} setTipo={setTipo} error={errors.tipo} />
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
            autoComplete="off"
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

      {tipo === "pagamento" || tipo === "reembolso" ? (
        <FormSection key={`pix-${tipo}`} title="Chave PIX / Dados bancários">
          <p className="-mt-1 text-sm text-neutral-500">
            {tipo === "reembolso"
              ? "Preencha a Chave PIX (obrigatória) e, se preferir, também os dados bancários."
              : "Preencha a Chave PIX e/ou os dados bancários — o que for mais conveniente pra esse pagamento."}
          </p>
          <FieldGroup>
            <TextField
              label="Chave PIX"
              name="chavePix"
              required={tipo === "reembolso"}
              autoComplete="off"
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
            <TextField label="Banco" name="banco" autoComplete="off" defaultValue={values.banco} error={errors.banco} />
            <TextField
              label="Agência"
              name="agencia"
              autoComplete="off"
              defaultValue={values.agencia}
              error={errors.agencia}
            />
            <TextField label="Conta" name="conta" autoComplete="off" defaultValue={values.conta} error={errors.conta} />
            <SelectField
              label="Tipo de conta"
              name="tipoConta"
              defaultValue={values.tipoConta}
              error={errors.tipoConta}
            >
              <option value="">Selecione</option>
              {TIPO_CONTA_BANCARIA.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </SelectField>
            <div className="sm:col-span-2">
              <TextField
                label="Titular da conta (se diferente do solicitante)"
                name="titularConta"
                autoComplete="off"
                defaultValue={values.titularConta}
                error={errors.titularConta}
              />
            </div>
          </FieldGroup>
        </FormSection>
      ) : null}

      {/* Os itens só são preenchidos aqui na CRIAÇÃO — na edição, cada item já tem sua própria tela
          de adicionar/editar (ver app/solicitacoes/[id]/itens/), pra não correr o risco de, ao
          salvar as outras alterações da solicitação, criar sem querer um item novo duplicado. */}
      {!entityId && tipo === "compra" ? <ItensCompraFields key="compra" /> : null}
      {!entityId && (tipo === "pagamento" || tipo === "reembolso") ? (
        <ItensPagamentoReembolsoFields key={`itens-${tipo}`} tipo={tipo} />
      ) : null}
      {!entityId && tipo === "passagem_aerea" ? <ItensPassagemFields key="passagem_aerea" /> : null}

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
