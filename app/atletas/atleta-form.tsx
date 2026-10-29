"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { CpfField } from "@/components/cpf-field";
import { TelefoneField } from "@/components/telefone-field";
import { EnderecoFields, type EnderecoValues } from "@/components/endereco-fields";
import { PhotoField } from "@/components/photo-field";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIAS_ATLETA, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { ATLETA_POSICAO_OPTIONS, TAMANHO_UNIFORME_OPTIONS } from "@/lib/validation/schemas";
import { ATLETA_CLASSIFICACAO_OPTIONS } from "@/lib/futebol/classificacao-atleta";
import type { AtletaFormState } from "./actions";

const initialState: AtletaFormState = {};

/**
 * Cadastro de Atleta — formulário único pro Futebol Profissional e pro Futebol de Base desde a
 * unificação de 28/10/2026 (ver docs/superpowers/specs/2026-10-28-unificacao-atletas-design.md).
 * Até então existiam `AtletaForm` (Profissional) e `AtletaBaseForm` (Base, quase idêntico, com
 * Categoria/Classificação/Responsáveis/Alojamento a mais) — colapsados aqui num só, com um
 * seletor de Categoria no topo que decide (reativamente, sem precisar salvar) quais seções
 * "Base-only" aparecem: "Responsáveis" (dentro de Dados pessoais), "Agência" (Dados esportivos) e
 * "Alojamento e ajuda de custo" (seção própria) só aparecem quando a categoria escolhida é uma das
 * 7 categorias da Base. Classificação (G1/G2/G3) e RG/CPF/data de nascimento valem pras duas
 * categorias sem distinção — RG/CPF/nascimento já eram obrigatórios nos dois formulários antigos,
 * sem mudança aqui.
 */
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
  const [categoria, setCategoria] = useState(values.categoria ?? "");
  const isBase = ehCategoriaBaseValida(categoria);
  // Ver comentário equivalente nos formulários antigos — mesmo mecanismo do checkbox "Mesmo
  // endereço de origem".
  const [origemEndereco, setOrigemEndereco] = useState<EnderecoValues>({
    cep: values.origemCep,
    logradouro: values.origemLogradouro,
    numero: values.origemNumero,
    complemento: values.origemComplemento,
    bairro: values.origemBairro,
    cidade: values.origemCidade,
    uf: values.origemUf,
  });
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

      <FormSection title="Categoria">
        <FieldGroup>
          <SelectField
            label="Categoria"
            name="categoria"
            required
            defaultValue={categoria}
            onChange={setCategoria}
            error={errors.categoria}
          >
            <option value="">Selecione</option>
            {CATEGORIAS_ATLETA.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </SelectField>
        </FieldGroup>
      </FormSection>

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

        {/* Só faz sentido pra atleta menor de idade, então só aparece pras categorias da Base — os
            campos continuam existindo no banco pra qualquer categoria (ver `atletaSchema`), então
            nada se perde ao trocar a Categoria de ida e volta antes de salvar. */}
        {isBase ? (
          <div className="mt-4">
            <p className="field-label">Responsáveis</p>
            <FieldGroup>
              <TextField label="Nome da mãe" name="maeNome" defaultValue={values.maeNome} error={errors.maeNome} />
              <TelefoneField
                label="Telefone da mãe"
                name="maeTelefone"
                defaultValue={values.maeTelefone}
                error={errors.maeTelefone}
              />
              <TextField
                label="Email da mãe"
                name="emailMae"
                type="email"
                defaultValue={values.emailMae}
                error={errors.emailMae}
              />
              <TextField label="Nome do pai" name="paiNome" defaultValue={values.paiNome} error={errors.paiNome} />
              <TelefoneField
                label="Telefone do pai"
                name="paiTelefone"
                defaultValue={values.paiTelefone}
                error={errors.paiTelefone}
              />
              <TextField
                label="Email do pai"
                name="emailPai"
                type="email"
                defaultValue={values.emailPai}
                error={errors.emailPai}
              />
            </FieldGroup>
          </div>
        ) : null}
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
            {/* Normalmente só a tela de Relatório de Dispensa (Base) ou uma edição manual grava
                este valor — fica aqui também pra o <select> exibir certo um atleta já dispensado. */}
            <option value="dispensado">Dispensado</option>
          </SelectField>
          {/* Até 28/10/2026 era só da Base; a unificação estendeu pro Profissional também (decisão
              do Mateus). */}
          <SelectField
            label="Classificação"
            name="classificacao"
            defaultValue={values.classificacao}
            error={errors.classificacao}
          >
            <option value="">Não classificado</option>
            {ATLETA_CLASSIFICACAO_OPTIONS.map((opcao) => (
              <option key={opcao.value} value={opcao.value}>
                {opcao.label}
              </option>
            ))}
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
          {isBase ? (
            <TextField label="Agência" name="agencia" defaultValue={values.agencia} error={errors.agencia} />
          ) : null}
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

      {isBase ? (
        <FormSection title="Alojamento e ajuda de custo">
          <FieldGroup>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="alojado"
                name="alojado"
                type="checkbox"
                defaultChecked={values.alojado === "on"}
                className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
              />
              <label htmlFor="alojado" className="text-sm font-medium text-neutral-700">
                Mora no alojamento do clube
              </label>
            </div>
            <TextField
              label="Valor de ajuda de custo (R$)"
              name="valorAjudaCusto"
              type="number"
              min={0}
              step="0.01"
              defaultValue={values.valorAjudaCusto}
              error={errors.valorAjudaCusto}
            />
            <TextField label="Escola" name="escola" defaultValue={values.escola} error={errors.escola} />
          </FieldGroup>
        </FormSection>
      ) : null}

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
