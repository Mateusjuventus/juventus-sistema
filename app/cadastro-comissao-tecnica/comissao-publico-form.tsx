"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, SuggestionField, TextField } from "@/components/fields";
import { CpfField } from "@/components/cpf-field";
import { TelefoneField } from "@/components/telefone-field";
import { CurrencyField } from "@/components/currency-field";
import { PhotoField } from "@/components/photo-field";
import { SubmitButton } from "@/components/submit-button";
import { COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS, SUGESTOES_FUNCAO_COMISSAO } from "@/lib/validation/schemas";
import type { CadastroPublicoComissaoTecnicaFormState } from "./actions";

const initialState: CadastroPublicoComissaoTecnicaFormState = {};

/** Espelha `app/cadastro-staff-base/staff-publico-base-form.tsx`, mas TODOS os campos são
 * obrigatórios (pedido do Mateus: "para o preenchimento da comissão, todos os dados devem ser
 * obrigatórios" — ver docs/superpowers/specs/2026-08-25-comissao-tecnica-cadastro-publico-design.md). */
export function ComissaoPublicoForm({
  action,
}: {
  action: (
    prevState: CadastroPublicoComissaoTecnicaFormState,
    formData: FormData,
  ) => Promise<CadastroPublicoComissaoTecnicaFormState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <div className="py-8 text-center">
        <p className="text-lg font-semibold text-grena-escuro">Cadastro enviado com sucesso!</p>
        <p className="mt-2 text-sm text-neutral-500">
          Obrigado por preencher seus dados. O responsável do Futebol Profissional já tem acesso ao
          seu cadastro.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
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
            required
            defaultValue={values.apelido}
            error={errors.apelido}
            placeholder="Como você é chamado no dia a dia"
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
          <TelefoneField
            label="Telefone"
            name="telefone"
            required
            defaultValue={values.telefone}
            error={errors.telefone}
          />
          <TextField
            label="E-mail"
            name="email"
            type="email"
            required
            defaultValue={values.email}
            error={errors.email}
          />
          <div className="sm:col-span-2">
            <PhotoField label="Sua foto" name="foto" required error={errors.foto} />
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection title="Função e contrato">
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
            required
            defaultValue={values.tipoContrato}
            error={errors.tipoContrato}
          >
            <option value="" disabled>
              Selecione
            </option>
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
            required
            defaultValue={values.dataInicio}
            error={errors.dataInicio}
          />
        </FieldGroup>
      </FormSection>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label="Enviar cadastro" />
      </div>
    </form>
  );
}
