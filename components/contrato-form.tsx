"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { CurrencyField } from "@/components/currency-field";
import { SubmitButton } from "@/components/submit-button";

export interface ContratoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

/**
 * Formulário de "Novo contrato" (aba Contrato do atleta) — compartilhado por Profissional e Base
 * (a Base só passa uma opção a mais em `tipoContratoOptions`: Iniciação). Ver
 * docs/superpowers/specs/2026-10-16-atleta-dados-esportivos-contrato-design.md.
 *
 * "Clube de origem" só aparece quando Tipo de contrato = Empréstimo — mesmo princípio já usado
 * pro "Possui contrato de formação" condicional que existia em `atleta-form.tsx` antes desta
 * mudança. Ao salvar, a action (`criarContrato`/`criarContratoBase`) encerra o contrato vigente
 * atual (se existir) e insere este como o novo vigente, numa operação atômica só — ver a função de
 * banco `criar_contrato_atleta`/`criar_contrato_atleta_base`.
 */
export function ContratoForm({
  action,
  tipoContratoOptions,
  camposExtras,
}: {
  action: (prevState: ContratoFormState, formData: FormData) => Promise<ContratoFormState>;
  tipoContratoOptions: readonly { value: string; label: string }[];
  camposExtras: Record<string, string>;
}) {
  const [state, formAction] = useFormState(action, {});
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};
  const [tipoContrato, setTipoContrato] = useState(values.tipoContrato ?? "");

  return (
    <form action={formAction} className="space-y-6">
      {Object.entries(camposExtras).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}

      <FormSection title="Contrato">
        <FieldGroup>
          <SelectField
            label="Tipo de contrato"
            name="tipoContrato"
            required
            defaultValue={values.tipoContrato}
            error={errors.tipoContrato}
            onChange={setTipoContrato}
          >
            <option value="">Selecione</option>
            {tipoContratoOptions.map((opcao) => (
              <option key={opcao.value} value={opcao.value}>
                {opcao.label}
              </option>
            ))}
          </SelectField>
          {tipoContrato === "emprestimo" ? (
            <TextField
              label="Clube de origem"
              name="clubeOrigem"
              required
              defaultValue={values.clubeOrigem}
              error={errors.clubeOrigem}
            />
          ) : null}
          <TextField
            label="Vigência — início"
            name="vigenciaInicio"
            type="date"
            defaultValue={values.vigenciaInicio}
            error={errors.vigenciaInicio}
          />
          <TextField
            label="Vigência — término"
            name="vigenciaFim"
            type="date"
            defaultValue={values.vigenciaFim}
            error={errors.vigenciaFim}
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Remuneração">
        <FieldGroup>
          <CurrencyField
            label="Salário CTPS"
            name="salarioCtps"
            defaultValue={values.salarioCtps}
            error={errors.salarioCtps}
          />
          <CurrencyField
            label="Direito de imagem"
            name="direitoImagem"
            defaultValue={values.direitoImagem}
            error={errors.direitoImagem}
          />
          <CurrencyField
            label="Bonificação"
            name="bonificacao"
            defaultValue={values.bonificacao}
            error={errors.bonificacao}
          />
          <CurrencyField
            label="Auxílio moradia"
            name="auxilioMoradia"
            defaultValue={values.auxilioMoradia}
            error={errors.auxilioMoradia}
          />
          <CurrencyField label="Outros" name="outros" defaultValue={values.outros} error={errors.outros} />
        </FieldGroup>
        <p className="mt-3 text-sm text-neutral-500">
          O percentual de cada rubrica sobre o valor total aparece na tela de Contrato depois de salvar.
        </p>
      </FormSection>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label="Salvar contrato" />
      </div>
    </form>
  );
}
