"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { EnderecoFields } from "@/components/endereco-fields";
import { SubmitButton } from "@/components/submit-button";
import type { StaffFuncaoCatalogoRow } from "@/lib/supabase/types";
import type { CadastroPublicoFormState } from "./actions";

const initialState: CadastroPublicoFormState = {};

export function StaffPublicoForm({
  action,
  funcoes,
}: {
  action: (
    prevState: CadastroPublicoFormState,
    formData: FormData,
  ) => Promise<CadastroPublicoFormState>;
  funcoes: StaffFuncaoCatalogoRow[];
}) {
  const [state, formAction] = useFormState(action, initialState);

  if (state.success) {
    return (
      <div className="py-8 text-center">
        <p className="text-lg font-semibold text-grena-escuro">Cadastro enviado com sucesso!</p>
        <p className="mt-2 text-sm text-neutral-500">
          Obrigado por preencher seus dados. O responsável do Departamento de Futebol Profissional
          já tem acesso ao seu cadastro.
        </p>
      </div>
    );
  }

  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
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

      <FormSection title="Função">
        <FieldGroup>
          <SelectField
            label="Função/setor"
            name="funcaoId"
            required
            defaultValue={values.funcaoId}
            error={errors.funcaoId}
          >
            <option value="" disabled>
              Selecione uma função
            </option>
            {funcoes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Chave PIX"
            name="chavePix"
            defaultValue={values.chavePix}
            error={errors.chavePix}
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
