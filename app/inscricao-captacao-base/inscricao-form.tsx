"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import type { InscricaoCaptacaoState } from "./actions";

const initialState: InscricaoCaptacaoState = {};

/**
 * Formulário público de inscrição pro teste/avaliação (ver app/inscricao-captacao-base/actions.ts).
 * Bem mais enxuto que a Ficha de Cadastro de Atleta — é só o suficiente pra agendar a avaliação; o
 * Mateus aprova pela aba "Aprovações" antes de virar "Em avaliação" de verdade.
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
          <TextField label="Telefone de contato" name="telefone" defaultValue={values.telefone} error={errors.telefone} />
          <TextField label="Cidade" name="cidade" defaultValue={values.cidade} error={errors.cidade} />
          <TextField
            label="UF"
            name="uf"
            maxLength={2}
            defaultValue={values.uf}
            error={errors.uf}
            placeholder="Ex: SP"
          />
          <TextField
            label="Indicação"
            name="indicacao"
            defaultValue={values.indicacao}
            error={errors.indicacao}
            placeholder="Quem indicou o candidato"
          />
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

      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <SubmitButton label="Enviar inscrição" pendingLabel="Enviando..." />
    </form>
  );
}
