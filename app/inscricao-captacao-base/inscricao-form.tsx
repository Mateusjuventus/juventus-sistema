"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { EnderecoFields } from "@/components/endereco-fields";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import type { InscricaoCaptacaoState } from "./actions";

const initialState: InscricaoCaptacaoState = {};

/**
 * Formulário público de inscrição pro teste/avaliação (ver app/inscricao-captacao-base/actions.ts).
 * Mesmos campos do cadastro interno de Captação, exceto Data de início/término e Status — o Mateus
 * preenche isso na hora de aprovar (aba "Aprovações") ou trocar o status depois. TODOS os campos
 * são obrigatórios (pedido de 19/08) — ver `captacaoInscricaoSchema`.
 */
export function InscricaoCaptacaoForm({
  action,
}: {
  action: (prevState: InscricaoCaptacaoState, formData: FormData) => Promise<InscricaoCaptacaoState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <div className="py-8 text-center">
        <p className="text-lg font-semibold text-grena-escuro">Inscrição enviada com sucesso!</p>
        <p className="mt-2 text-sm text-neutral-500">
          Obrigado por se inscrever. O Departamento de Futebol de Base vai avaliar e entrar em
          contato pra combinar a avaliação.
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
          <TextField
            label="Telefone de contato"
            name="telefone"
            required
            defaultValue={values.telefone}
            error={errors.telefone}
          />
          <TextField
            label="Indicação"
            name="indicacao"
            required
            defaultValue={values.indicacao}
            error={errors.indicacao}
            placeholder="Quem indicou o candidato"
          />
          <TextField
            label="Clube anterior"
            name="clubeAnterior"
            required
            defaultValue={values.clubeAnterior}
            error={errors.clubeAnterior}
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Responsáveis e escola">
        <FieldGroup>
          <TextField
            label="Nome da mãe"
            name="maeNome"
            required
            defaultValue={values.maeNome}
            error={errors.maeNome}
          />
          <TextField
            label="Telefone da mãe"
            name="maeTelefone"
            required
            defaultValue={values.maeTelefone}
            error={errors.maeTelefone}
          />
          <TextField
            label="Nome do pai"
            name="paiNome"
            required
            defaultValue={values.paiNome}
            error={errors.paiNome}
          />
          <TextField
            label="Telefone do pai"
            name="paiTelefone"
            required
            defaultValue={values.paiTelefone}
            error={errors.paiTelefone}
          />
          <TextField label="Escola" name="escola" required defaultValue={values.escola} error={errors.escola} />
        </FieldGroup>
      </FormSection>

      <FormSection title="Endereço">
        <EnderecoFields
          required
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

      <SubmitButton label="Enviar inscrição" pendingLabel="Enviando..." />
    </form>
  );
}
