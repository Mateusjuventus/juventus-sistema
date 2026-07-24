"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextField } from "@/components/fields";
import { CurrencyField } from "@/components/currency-field";
import { StaffFuncaoField } from "@/components/staff-funcao-field";
import { ChavePixFields } from "@/components/chave-pix-field";
import { EnderecoFields } from "@/components/endereco-fields";
import { PhotoField } from "@/components/photo-field";
import { SubmitButton } from "@/components/submit-button";
import type { StaffFuncaoCatalogoRow } from "@/lib/supabase/types";
import type { StaffBaseFormState } from "./actions";

const initialState: StaffBaseFormState = {};

/** Espelha `app/staff-operacional/staff-form.tsx` — sem categoria (lista única, ver a spec). O
 * catálogo de funções vem compartilhado do Profissional (`staff_funcoes_catalogo`). */
export function StaffBaseForm({
  action,
  entityId,
  defaultValues,
  fotoUrl,
  submitLabel,
  funcoes,
}: {
  action: (prevState: StaffBaseFormState, formData: FormData) => Promise<StaffBaseFormState>;
  entityId?: string;
  defaultValues?: Record<string, string>;
  fotoUrl?: string | null;
  submitLabel: string;
  funcoes: StaffFuncaoCatalogoRow[];
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};
  const [terceirizada, setTerceirizada] = useState(values.terceirizada === "on");

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      {entityId ? <input type="hidden" name="id" value={entityId} /> : null}
      <FormSection title="Dados pessoais">
        <FieldGroup>
          <TextField
            label="Nome completo"
            name="nomeCompleto"
            required
            defaultValue={values.nomeCompleto}
            error={errors.nomeCompleto}
          />
          <TextField label="RG" name="rg" required defaultValue={values.rg} error={errors.rg} />
          <TextField
            label="CPF"
            name="cpf"
            required
            placeholder="000.000.000-00"
            defaultValue={values.cpf}
            error={errors.cpf}
          />
          <TextField
            label="Data de nascimento"
            name="dataNascimento"
            type="date"
            required
            defaultValue={values.dataNascimento}
            error={errors.dataNascimento}
          />
          <TextField
            label="Telefone"
            name="telefone"
            defaultValue={values.telefone}
            error={errors.telefone}
          />
          <TextField
            label="E-mail"
            name="email"
            type="email"
            defaultValue={values.email}
            error={errors.email}
          />
          <div className="sm:col-span-2">
            <PhotoField
              label="Foto"
              name="foto"
              currentUrl={fotoUrl}
              required
              showDownload
              error={errors.foto}
            />
            <input type="hidden" name="fotoJaExiste" value={fotoUrl ? "1" : ""} />
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection title="Endereço">
        <EnderecoFields
          defaultValues={{
            cep: values.cep,
            logradouro: values.logradouro,
            numero: values.numero,
            complemento: values.complemento,
            bairro: values.bairro,
            cidade: values.cidade,
            uf: values.uf,
          }}
          errors={{
            cep: errors.cep,
            logradouro: errors.logradouro,
            numero: errors.numero,
            complemento: errors.complemento,
            bairro: errors.bairro,
            cidade: errors.cidade,
            uf: errors.uf,
          }}
        />
      </FormSection>

      <FormSection title="Função e pagamento">
        <FieldGroup>
          {!terceirizada ? (
            <StaffFuncaoField
              funcoes={funcoes}
              defaultValue={values.funcaoId}
              error={errors.funcaoId}
              novaFuncaoError={errors.novaFuncaoNome}
            />
          ) : null}

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                name="terceirizada"
                defaultChecked={values.terceirizada === "on"}
                onChange={(e) => setTerceirizada(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
              />
              É terceirizada?
            </label>
            <p className="mt-1 text-sm text-neutral-500">
              Serviço prestado por empresa terceirizada — não pede Chave PIX nem Valor padrão de
              pagamento, só a função da terceirizada (único campo de função, nesse caso).
            </p>
          </div>

          {terceirizada ? (
            <StaffFuncaoField
              funcoes={funcoes}
              defaultValue={values.funcaoTerceirizadaId}
              error={errors.funcaoTerceirizadaId}
              novaFuncaoError={errors.novaFuncaoTerceirizadaNome}
              name="funcaoTerceirizadaId"
              novaFuncaoNomeField="novaFuncaoTerceirizadaNome"
              label="Função da terceirizada"
              required
            />
          ) : (
            <ChavePixFields
              tipoDefaultValue={values.chavePixTipo}
              chaveDefaultValue={values.chavePix}
              tipoError={errors.chavePixTipo}
              chaveError={errors.chavePix}
            />
          )}

          {!terceirizada ? (
            <CurrencyField
              label="Valor padrão de pagamento (R$)"
              name="valorPadraoPagamento"
              defaultValue={values.valorPadraoPagamento}
              error={errors.valorPadraoPagamento}
            />
          ) : null}
        </FieldGroup>
      </FormSection>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
