"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { CurrencyField } from "@/components/currency-field";
import { SubmitButton } from "@/components/submit-button";
import { dataFimFormacao } from "@/lib/futebol/contrato";

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
 *
 * `valoresIniciais`/`modoAditivo` (ver docs/superpowers/specs/2026-11-04-contrato-atleta-
 * extensoes-design.md) — "Aditivo" reaproveita este mesmo formulário, só que pré-preenchido com o
 * contrato vigente atual (`valoresIniciais`, lido pela página) e com Tipo de contrato travado em
 * "Definitivo" (um aditivo sempre resulta num contrato definitivo, não importa o que o anterior
 * era). `state.values` (depois de uma tentativa de envio com erro) sempre tem prioridade sobre
 * `valoresIniciais` — é o que a pessoa realmente digitou por último.
 *
 * `dataNascimentoAtleta` (ver docs/superpowers/specs/2026-11-09-contrato-formacao-design.md) — só
 * usada pra sugerir a vigência fim quando Tipo de contrato = "Formação" (nascimento + 20 anos,
 * menos 1 dia, mesma regra do próprio texto do contrato). O campo de "Bolsa de aprendizagem"
 * aparece no mesmo gatilho, dentro de "Remuneração".
 */
export function ContratoForm({
  action,
  tipoContratoOptions,
  camposExtras,
  valoresIniciais,
  modoAditivo,
  dataNascimentoAtleta,
}: {
  action: (prevState: ContratoFormState, formData: FormData) => Promise<ContratoFormState>;
  tipoContratoOptions: readonly { value: string; label: string }[];
  camposExtras: Record<string, string>;
  valoresIniciais?: Record<string, string | undefined>;
  modoAditivo?: boolean;
  dataNascimentoAtleta?: string | null;
}) {
  const [state, formAction] = useFormState(action, {});
  const values = state.values ?? valoresIniciais ?? {};
  const errors = state.fieldErrors ?? {};
  const [tipoContrato, setTipoContrato] = useState(modoAditivo ? "definitivo" : values.tipoContrato ?? "");

  // Vigência fim sugerida (ver comentário acima) — só recalcula o `defaultValue` do campo quando
  // ENTRA ou SAI de "Formação" (chave do TextField abaixo), não a cada digitação; trocar entre os
  // outros tipos (Definitivo/Empréstimo/Amador/Iniciação) nunca remonta o campo, preservando o que
  // a pessoa já tiver digitado.
  const vigenciaFimSugerida =
    tipoContrato === "formacao" && dataNascimentoAtleta ? dataFimFormacao(dataNascimentoAtleta) : undefined;

  return (
    <form action={formAction} className="space-y-6">
      {Object.entries(camposExtras).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}

      <FormSection title="Contrato">
        <FieldGroup>
          {modoAditivo ? (
            <div>
              <label className="field-label">Tipo de contrato</label>
              <p className="field-input flex items-center bg-neutral-50 text-neutral-500">Definitivo</p>
              <input type="hidden" name="tipoContrato" value="definitivo" />
            </div>
          ) : (
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
          )}
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
            key={tipoContrato === "formacao" ? `formacao-${dataNascimentoAtleta ?? ""}` : "padrao"}
            label="Vigência — término"
            name="vigenciaFim"
            type="date"
            defaultValue={vigenciaFimSugerida ?? values.vigenciaFim}
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
          {tipoContrato === "formacao" ? (
            <CurrencyField
              label="Bolsa de aprendizagem"
              name="bolsaAprendizagem"
              defaultValue={values.bolsaAprendizagem}
              error={errors.bolsaAprendizagem}
            />
          ) : null}
        </FieldGroup>
        <p className="mt-3 text-sm text-neutral-500">
          O percentual de cada rubrica sobre o valor total aparece na tela de Contrato depois de salvar.
        </p>
      </FormSection>

      <FormSection title="Direitos econômicos">
        <FieldGroup>
          <TextField
            label="Juventus (%)"
            name="direitoEconomicoJuventusPct"
            type="number"
            min={0}
            max={100}
            step="0.1"
            defaultValue={values.direitoEconomicoJuventusPct}
            error={errors.direitoEconomicoJuventusPct}
          />
          <TextField
            label="Atleta (%)"
            name="direitoEconomicoAtletaPct"
            type="number"
            min={0}
            max={100}
            step="0.1"
            defaultValue={values.direitoEconomicoAtletaPct}
            error={errors.direitoEconomicoAtletaPct}
          />
          <TextField
            label="Outro clube"
            name="direitoEconomicoTerceiroNome"
            placeholder="ex: Botafogo-SP"
            defaultValue={values.direitoEconomicoTerceiroNome}
            error={errors.direitoEconomicoTerceiroNome}
          />
          <TextField
            label="Outro clube (%)"
            name="direitoEconomicoTerceiroPct"
            type="number"
            min={0}
            max={100}
            step="0.1"
            defaultValue={values.direitoEconomicoTerceiroPct}
            error={errors.direitoEconomicoTerceiroPct}
          />
        </FieldGroup>
        <p className="mt-3 text-sm text-neutral-500">
          Todos opcionais — preencha só o que já estiver negociado. A soma das 3 partes não pode
          passar de 100%.
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
