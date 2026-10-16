"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { CpfField } from "@/components/cpf-field";
import { TelefoneField } from "@/components/telefone-field";
import { EnderecoFields, type EnderecoValues } from "@/components/endereco-fields";
import { PhotoField } from "@/components/photo-field";
import { SubmitButton } from "@/components/submit-button";
import { ATLETA_POSICAO_OPTIONS, TAMANHO_UNIFORME_OPTIONS } from "@/lib/validation/schemas";
import type { AtletaFormState } from "./actions";

const initialState: AtletaFormState = {};

/** Endereço passou a ser estruturado (CEP/logradouro/número/complemento/bairro/cidade/UF, com
 * autopreenchimento por CEP — ver `EnderecoFields`) em 2026-09-10, mesmo padrão que já existia em
 * `app/base/atletas/atleta-base-form.tsx` (pedido do Mateus: "no profissional, deva ter todos os
 * dados do endereço"). O campo de texto livre antigo (`enderecoAtual`) continua existindo só pra
 * não sumir com dados de cadastros antigos — ver "Ver atleta".
 *
 * Em 2026-10-16: Tipo de contrato/datas de contrato/Número FPF saíram deste formulário (viraram a
 * aba "Contrato" própria e deixaram de ser editáveis aqui — ver docs/superpowers/specs/
 * 2026-10-16-atleta-dados-esportivos-contrato-design.md); ganhou Email, segundo endereço
 * ("Endereço de origem", com checkbox "Mesmo endereço de origem" que copia pro endereço atual),
 * telefone/e-mail do empresário e tamanho de uniforme (ver
 * docs/superpowers/specs/2026-10-16-atleta-dados-pessoais-design.md pro endereço/e-mail). */
export function AtletaForm({
  action,
  entityId,
  defaultValues,
  fotoUrl,
  submitLabel,
}: {
  action: (prevState: AtletaFormState, formData: FormData) => Promise<AtletaFormState>;
  entityId?: string;
  defaultValues?: Record<string, string>;
  fotoUrl?: string | null;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};
  const [possuiAlergia, setPossuiAlergia] = useState(values.possuiAlergiaMedicamento === "on");
  // Valores digitados no bloco "Endereço de origem", acompanhados via `onChange` do EnderecoFields
  // só pra alimentar a cópia do checkbox "Mesmo endereço de origem" abaixo.
  const [origemEndereco, setOrigemEndereco] = useState<EnderecoValues>({
    cep: values.origemCep,
    logradouro: values.origemLogradouro,
    numero: values.origemNumero,
    complemento: values.origemComplemento,
    bairro: values.origemBairro,
    cidade: values.origemCidade,
    uf: values.origemUf,
  });
  // Valores padrão do bloco "Endereço atual" — só muda (e força o bloco a remontar, via `key`
  // abaixo) quando o checkbox "Mesmo endereço de origem" é marcado, copiando o que já estiver em
  // Origem. Fora isso, continua vindo de `values` como sempre (edição normal).
  const [enderecoAtualValues, setEnderecoAtualValues] = useState<EnderecoValues>({
    cep: values.cep,
    logradouro: values.logradouro,
    numero: values.numero,
    complemento: values.complemento,
    bairro: values.bairro,
    cidade: values.cidade,
    uf: values.uf,
  });
  const [enderecoAtualKey, setEnderecoAtualKey] = useState(0);

  function copiarEnderecoDeOrigem(marcado: boolean) {
    if (!marcado) return;
    setEnderecoAtualValues(origemEndereco);
    setEnderecoAtualKey((k) => k + 1);
  }

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      {entityId ? <input type="hidden" name="id" value={entityId} /> : null}
      <FormSection title="Dados pessoais">
        <FieldGroup>
          <div className="sm:col-span-2">
            <PhotoField label="Foto" name="foto" currentUrl={fotoUrl} showDownload />
          </div>
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
            placeholder="Como aparece nos pôsteres de Relacionados (ex: Thomas Kayck)"
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
            defaultValue={values.telefone}
            error={errors.telefone}
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            defaultValue={values.email}
            error={errors.email}
          />
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <input
                id="possuiAlergiaMedicamento"
                name="possuiAlergiaMedicamento"
                type="checkbox"
                checked={possuiAlergia}
                onChange={(e) => setPossuiAlergia(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
              />
              <label htmlFor="possuiAlergiaMedicamento" className="text-sm font-medium text-neutral-700">
                Possui alergia a algum medicamento
              </label>
            </div>
            {possuiAlergia ? (
              <div className="mt-3">
                <TextField
                  label="Qual"
                  name="alergiaMedicamentoQual"
                  defaultValue={values.alergiaMedicamentoQual}
                  error={errors.alergiaMedicamentoQual}
                />
              </div>
            ) : null}
          </div>
          <TextField
            label="Naturalidade"
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
        </FieldGroup>
        <div className="mt-4">
          <p className="field-label">Endereço de origem (com busca por CEP)</p>
          <EnderecoFields
            namePrefix="origem"
            defaultValues={origemEndereco}
            onChange={setOrigemEndereco}
            errors={{
              cep: errors.origemCep,
              logradouro: errors.origemLogradouro,
              numero: errors.origemNumero,
              complemento: errors.origemComplemento,
              bairro: errors.origemBairro,
              cidade: errors.origemCidade,
              uf: errors.origemUf,
            }}
          />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="field-label">Endereço atual (com busca por CEP)</p>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                onChange={(e) => copiarEnderecoDeOrigem(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
              />
              Mesmo endereço de origem
            </label>
          </div>
          {/* `key` força remontar o bloco quando o checkbox acima copia o Endereço de origem pra
              cá — é um autopreenchimento único (não fica sincronizado depois), mesmo princípio já
              usado em `DocumentoForm` pra limpar campos de arquivo. */}
          <EnderecoFields
            key={enderecoAtualKey}
            defaultValues={enderecoAtualValues}
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
        </div>
      </FormSection>

      <FormSection title="Dados esportivos">
        <FieldGroup>
          <SelectField
            label="Posição"
            name="posicao"
            required
            defaultValue={values.posicao}
            error={errors.posicao}
          >
            <option value="">Selecione</option>
            {ATLETA_POSICAO_OPTIONS.map((posicao) => (
              <option key={posicao} value={posicao}>
                {posicao}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Número da camisa"
            name="numeroCamisa"
            type="number"
            min={0}
            defaultValue={values.numeroCamisa}
            error={errors.numeroCamisa}
          />
          <TextField
            label="Número CBF"
            name="numeroCbf"
            type="number"
            min={0}
            defaultValue={values.numeroCbf}
            error={errors.numeroCbf}
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
            <option value="departamento_medico">Depto. Médico</option>
            <option value="transicao">Transição</option>
          </SelectField>
          <TextField
            label="Data de início no clube"
            name="dataInicioClube"
            type="date"
            defaultValue={values.dataInicioClube}
            error={errors.dataInicioClube}
          />
          <TextField
            label="Empresário/representante"
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
          <TextField
            label="Email do empresário"
            name="empresarioEmail"
            type="email"
            defaultValue={values.empresarioEmail}
            error={errors.empresarioEmail}
          />
          <SelectField
            label="Tamanho do uniforme"
            name="tamanhoUniforme"
            defaultValue={values.tamanhoUniforme}
            error={errors.tamanhoUniforme}
          >
            <option value="">Não informado</option>
            {TAMANHO_UNIFORME_OPTIONS.map((tamanho) => (
              <option key={tamanho} value={tamanho}>
                {tamanho}
              </option>
            ))}
          </SelectField>
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
