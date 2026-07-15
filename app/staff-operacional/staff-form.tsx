"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { StaffFuncaoField } from "@/components/staff-funcao-field";
import { EnderecoFields } from "@/components/endereco-fields";
import { SubmitButton } from "@/components/submit-button";
import { STAFF_CHAVE_PIX_TIPOS } from "@/lib/validation/schemas";
import type { StaffFuncaoCatalogoRow } from "@/lib/supabase/types";
import type { StaffFormState } from "./actions";

const initialState: StaffFormState = {};

export function StaffForm({
  action,
  entityId,
  defaultValues,
  submitLabel,
  funcoes,
}: {
  action: (prevState: StaffFormState, formData: FormData) => Promise<StaffFormState>;
  entityId?: string;
  defaultValues?: Record<string, string>;
  submitLabel: string;
  funcoes: StaffFuncaoCatalogoRow[];
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
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
          <StaffFuncaoField
            funcoes={funcoes}
            defaultValue={values.funcaoId}
            error={errors.funcaoId}
            novaFuncaoError={errors.novaFuncaoNome}
          />
          <TextField
            label="Chave PIX"
            name="chavePix"
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
          <TextField
            label="Valor padrão de pagamento (R$)"
            name="valorPadraoPagamento"
            type="number"
            step="0.01"
            min={0}
            defaultValue={values.valorPadraoPagamento}
            error={errors.valorPadraoPagamento}
          />
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
