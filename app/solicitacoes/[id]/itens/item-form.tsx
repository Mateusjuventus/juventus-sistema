"use client";

import { useFormState } from "react-dom";
import { FieldGroup, TextField } from "@/components/fields";
import { CurrencyField } from "@/components/currency-field";
import { PhotoField } from "@/components/photo-field";
import { SubmitButton } from "@/components/submit-button";
import type { SolicitacaoTipo } from "@/lib/supabase/types";
import type { SolicitacaoItemFormState } from "./actions";

const initialState: SolicitacaoItemFormState = {};

/**
 * Formulário de um item de solicitação — usado tanto pra adicionar (`/itens/novo`) quanto pra
 * editar (`/itens/[itemId]`) um item já existente, dependendo se `itemId`/`defaultValues` vêm
 * preenchidos. Os campos mostrados mudam conforme `tipo` (mesmo conjunto de campos por tipo que
 * `app/solicitacoes/solicitacao-form.tsx` usa na criação em lote): Compra é Item/Quantidade/Foto;
 * Pagamento/Reembolso é Descrição/Valor; Passagem Aérea é Passageiro/Origem/Destino/Data/Horário.
 */
export function SolicitacaoItemForm({
  action,
  solicitacaoId,
  tipo,
  itemId,
  defaultValues,
  fotoAtualUrl,
}: {
  action: (prevState: SolicitacaoItemFormState, formData: FormData) => Promise<SolicitacaoItemFormState>;
  solicitacaoId: string;
  tipo: SolicitacaoTipo;
  itemId?: string;
  defaultValues?: Record<string, string>;
  /** Foto já salva do item, quando editando um item de Compra que já tem uma. */
  fotoAtualUrl?: string | null;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card space-y-4 p-5" encType="multipart/form-data">
      <input type="hidden" name="solicitacaoId" value={solicitacaoId} />
      <input type="hidden" name="tipo" value={tipo} />
      {itemId ? <input type="hidden" name="id" value={itemId} /> : null}

      {tipo === "compra" ? (
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
            {fotoAtualUrl ? (
              <div className="mb-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fotoAtualUrl}
                  alt=""
                  className="h-14 w-14 rounded-md border border-neutral-200 object-cover"
                />
                <p className="text-sm text-neutral-500">Foto atual — envie outra pra substituir.</p>
              </div>
            ) : null}
            <PhotoField label="Foto do item (opcional)" name="foto" shape="square" />
          </div>
        </FieldGroup>
      ) : null}

      {tipo === "pagamento" || tipo === "reembolso" ? (
        <FieldGroup>
          <TextField
            label="Descrição"
            name="descricao"
            required
            placeholder="Ex: Mensalidade do plano de saúde"
            defaultValue={values.descricao}
            error={errors.descricao}
          />
          <CurrencyField label="Valor (R$)" name="valor" required defaultValue={values.valor} error={errors.valor} />
          <div className="sm:col-span-2">
            <TextField
              label="Observação (opcional)"
              name="observacao"
              placeholder="Ex: Referente a julho/2026"
              defaultValue={values.observacao}
              error={errors.observacao}
            />
          </div>
        </FieldGroup>
      ) : null}

      {tipo === "passagem_aerea" ? (
        <FieldGroup>
          <TextField
            label="Passageiro"
            name="passageiro"
            required
            defaultValue={values.passageiro}
            error={errors.passageiro}
          />
          <TextField label="Origem" name="origem" defaultValue={values.origem} error={errors.origem} />
          <TextField label="Destino" name="destino" defaultValue={values.destino} error={errors.destino} />
          <TextField
            label="Data do voo"
            name="dataVoo"
            type="date"
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
          <div className="sm:col-span-2">
            <TextField
              label="Observações (opcional)"
              name="observacao"
              defaultValue={values.observacao}
              error={errors.observacao}
            />
          </div>
        </FieldGroup>
      ) : null}

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label={itemId ? "Salvar alterações" : "Adicionar item"} />
      </div>
    </form>
  );
}
