"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { PhotoField } from "@/components/photo-field";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import type { AtletaBaseFormState } from "./actions";

const initialState: AtletaBaseFormState = {};

/**
 * Espelha `app/atletas/atleta-form.tsx`, com um campo a mais (Categoria) na seção "Dados
 * esportivos" — obrigatório, e editável mesmo depois de criado (o atleta pode subir de categoria).
 */
export function AtletaBaseForm({
  action,
  entityId,
  defaultValues,
  fotoUrl,
  submitLabel,
}: {
  action: (prevState: AtletaBaseFormState, formData: FormData) => Promise<AtletaBaseFormState>;
  entityId?: string;
  defaultValues?: Record<string, string>;
  fotoUrl?: string | null;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};
  const [tipoContrato, setTipoContrato] = useState(values.tipoContrato ?? "");

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
            placeholder="Como aparece nos pôsteres (ex: Thomas Kayck)"
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
          <div className="sm:col-span-2">
            <PhotoField label="Foto" name="foto" currentUrl={fotoUrl} />
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection title="Dados esportivos">
        <FieldGroup>
          <SelectField
            label="Categoria"
            name="categoria"
            required
            defaultValue={values.categoria}
            error={errors.categoria}
          >
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
            placeholder="Ex: Goleiro, Zagueiro, Atacante"
          />
          <TextField
            label="Número da camisa"
            name="numeroCamisa"
            type="number"
            min={0}
            defaultValue={values.numeroCamisa}
            error={errors.numeroCamisa}
          />
          <SelectField
            label="Pé dominante"
            name="peDominante"
            defaultValue={values.peDominante}
            error={errors.peDominante}
          >
            <option value="">Não informado</option>
            <option value="destro">Destro</option>
            <option value="canhoto">Canhoto</option>
            <option value="ambidestro">Ambidestro</option>
          </SelectField>
          <SelectField
            label="Status"
            name="status"
            defaultValue={values.status ?? "liberado"}
            error={errors.status}
          >
            <option value="liberado">Liberado</option>
            <option value="suspenso">Suspenso</option>
            <option value="departamento_medico">Departamento Médico</option>
          </SelectField>
          <SelectField
            label="Tipo de contrato"
            name="tipoContrato"
            defaultValue={values.tipoContrato}
            error={errors.tipoContrato}
            onChange={setTipoContrato}
          >
            <option value="">Não informado</option>
            {ATLETA_BASE_TIPO_CONTRATO_OPTIONS.map((opcao) => (
              <option key={opcao.value} value={opcao.value}>
                {opcao.label}
              </option>
            ))}
          </SelectField>
          {tipoContrato === "amador" ? (
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="possuiContratoFormacao"
                name="possuiContratoFormacao"
                type="checkbox"
                defaultChecked={values.possuiContratoFormacao === "on"}
                className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
              />
              <label htmlFor="possuiContratoFormacao" className="text-sm font-medium text-neutral-700">
                Possui contrato de formação
              </label>
            </div>
          ) : null}
          <TextField
            label="Data de início no clube"
            name="dataInicioClube"
            type="date"
            defaultValue={values.dataInicioClube}
            error={errors.dataInicioClube}
          />
          <TextField
            label="Data de término do contrato"
            name="dataFimContrato"
            type="date"
            defaultValue={values.dataFimContrato}
            error={errors.dataFimContrato}
          />
          <TextField
            label="Empresário/representante"
            name="empresarioNome"
            defaultValue={values.empresarioNome}
            error={errors.empresarioNome}
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Naturalidade e endereço">
        <FieldGroup>
          <TextField
            label="Cidade natal"
            name="cidadeNatal"
            defaultValue={values.cidadeNatal}
            error={errors.cidadeNatal}
          />
          <TextField
            label="UF natal"
            name="ufNatal"
            maxLength={2}
            defaultValue={values.ufNatal}
            error={errors.ufNatal}
            placeholder="Ex: SP"
          />
          <div className="sm:col-span-2">
            <TextField
              label="Endereço atual"
              name="enderecoAtual"
              defaultValue={values.enderecoAtual}
              error={errors.enderecoAtual}
            />
          </div>
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
