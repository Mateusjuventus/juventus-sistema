"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { EnderecoFields } from "@/components/endereco-fields";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import type { CadastroAtletaPublicoState } from "./actions";

const initialState: CadastroAtletaPublicoState = {};

/**
 * Formulário público pra pais/atletas se candidatarem ao Futebol de Base (ver
 * app/cadastro-atleta-base/actions.ts). Cria um registro em avaliação — não é o cadastro oficial
 * de Atleta ainda, que só nasce quando o Mateus aprova pela tela interna.
 */
export function AtletaPublicoForm({
  action,
}: {
  action: (prevState: CadastroAtletaPublicoState, formData: FormData) => Promise<CadastroAtletaPublicoState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <div className="py-8 text-center">
        <p className="text-lg font-semibold text-grena-escuro">Cadastro enviado com sucesso!</p>
        <p className="mt-2 text-sm text-neutral-500">
          Obrigado por preencher os dados. O Departamento de Futebol de Base vai avaliar e entrar em
          contato.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <FormSection title="Dados do atleta">
        <FieldGroup>
          <TextField
            label="Nome completo do atleta"
            name="nomeCompleto"
            required
            defaultValue={values.nomeCompleto}
            error={errors.nomeCompleto}
          />
          <TextField
            label="Data de nascimento"
            name="dataNascimento"
            type="date"
            required
            defaultValue={values.dataNascimento}
            error={errors.dataNascimento}
          />
          <SelectField label="Categoria" name="categoria" required defaultValue={values.categoria} error={errors.categoria}>
            <option value="">Selecione</option>
            {CATEGORIAS_BASE.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Posição"
            name="posicao"
            required
            defaultValue={values.posicao}
            error={errors.posicao}
            placeholder="Ex: Zagueiro, Atacante"
          />
          <TextField label="Telefone de contato" name="telefone" defaultValue={values.telefone} error={errors.telefone} />
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="desejaAlojamento"
              name="desejaAlojamento"
              type="checkbox"
              defaultChecked={values.desejaAlojamento === "on"}
              className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
            />
            <label htmlFor="desejaAlojamento" className="text-sm font-medium text-neutral-700">
              Precisa de alojamento
            </label>
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection title="Responsáveis">
        <FieldGroup>
          <TextField label="Nome da mãe" name="maeNome" defaultValue={values.maeNome} error={errors.maeNome} />
          <TextField
            label="Telefone da mãe"
            name="maeTelefone"
            defaultValue={values.maeTelefone}
            error={errors.maeTelefone}
          />
          <TextField label="Nome do pai" name="paiNome" defaultValue={values.paiNome} error={errors.paiNome} />
          <TextField
            label="Telefone do pai"
            name="paiTelefone"
            defaultValue={values.paiTelefone}
            error={errors.paiTelefone}
          />
          <TextField label="Escola" name="escola" defaultValue={values.escola} error={errors.escola} />
        </FieldGroup>
      </FormSection>

      <FormSection title="Empresário/representante (se houver)">
        <FieldGroup>
          <TextField
            label="Nome do empresário"
            name="empresarioNome"
            defaultValue={values.empresarioNome}
            error={errors.empresarioNome}
          />
          <TextField
            label="Telefone do empresário"
            name="empresarioTelefone"
            defaultValue={values.empresarioTelefone}
            error={errors.empresarioTelefone}
          />
          <TextField label="Agência" name="agencia" defaultValue={values.agencia} error={errors.agencia} />
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

      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <SubmitButton label="Enviar cadastro" pendingLabel="Enviando..." />
    </form>
  );
}
