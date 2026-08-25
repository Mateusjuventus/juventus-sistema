"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextField, SuggestionField, SelectField } from "@/components/fields";
import { PhotoField } from "@/components/photo-field";
import { CpfField } from "@/components/cpf-field";
import { TelefoneField } from "@/components/telefone-field";
import { CurrencyField } from "@/components/currency-field";
import { SubmitButton } from "@/components/submit-button";
import { COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS, SUGESTOES_FUNCAO_COMISSAO } from "@/lib/validation/schemas";
import type { ComissaoFormState } from "./actions";

const initialState: ComissaoFormState = {};

export function ComissaoForm({
  action,
  entityId,
  defaultValues,
  fotoUrl,
  submitLabel,
}: {
  action: (prevState: ComissaoFormState, formData: FormData) => Promise<ComissaoFormState>;
  entityId?: string;
  defaultValues?: Record<string, string>;
  fotoUrl?: string | null;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};

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
          <TextField
            label="Apelido"
            name="apelido"
            defaultValue={values.apelido}
            error={errors.apelido}
            placeholder="Como a pessoa é chamada no dia a dia"
          />
          <TextField label="RG" name="rg" required defaultValue={values.rg} error={errors.rg} />
          <CpfField label="CPF" name="cpf" required defaultValue={values.cpf} error={errors.cpf} />
          <TextField
            label="Data de nascimento"
            name="dataNascimento"
            type="date"
            required
            defaultValue={values.dataNascimento}
            error={errors.dataNascimento}
          />
          <TelefoneField label="Telefone" name="telefone" defaultValue={values.telefone} error={errors.telefone} />
          <TextField
            label="E-mail"
            name="email"
            type="email"
            defaultValue={values.email}
            error={errors.email}
          />
          <div className="sm:col-span-2">
            <PhotoField label="Foto (opcional)" name="foto" currentUrl={fotoUrl} />
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection title="Função">
        <FieldGroup>
          <SuggestionField
            label="Função/cargo"
            name="funcao"
            required
            defaultValue={values.funcao}
            error={errors.funcao}
            suggestions={SUGESTOES_FUNCAO_COMISSAO}
          />
          <SelectField
            label="Tipo de contrato"
            name="tipoContrato"
            defaultValue={values.tipoContrato}
            error={errors.tipoContrato}
          >
            <option value="">Não definido</option>
            {COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
          <CurrencyField
            label="Salário mensal"
            name="valorSalario"
            defaultValue={values.valorSalario}
            error={errors.valorSalario}
          />
          <TextField
            label="Quando iniciou"
            name="dataInicio"
            type="date"
            defaultValue={values.dataInicio}
            error={errors.dataInicio}
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
