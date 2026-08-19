"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextAreaField, TextField } from "@/components/fields";
import { EnderecoFields } from "@/components/endereco-fields";
import { PhotoField } from "@/components/photo-field";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import { CAPTACAO_STATUS_OPTIONS, captacaoStatusLabel } from "@/lib/futebol/captacao";
import type { CaptacaoFormState } from "./actions";

const initialState: CaptacaoFormState = {};

/**
 * Formulário da Captação/Avaliação — mesma tela serve pra criar e editar (uso interno, staff). Só o
 * nome é obrigatório de verdade (ver `captacaoBaseSchema`) — um candidato pode chegar só com nome e
 * telefone e o resto entrar conforme a avaliação anda. Banco totalmente separado de `atletas_base`.
 */
export function CaptacaoForm({
  action,
  entityId,
  defaultValues,
  fotoUrl,
  submitLabel,
}: {
  action: (prevState: CaptacaoFormState, formData: FormData) => Promise<CaptacaoFormState>;
  entityId?: string;
  defaultValues?: Record<string, string>;
  fotoUrl?: string | null;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      {entityId ? <input type="hidden" name="id" value={entityId} /> : null}

      <FormSection title="Candidato">
        <FieldGroup>
          <div className="sm:col-span-2">
            <PhotoField label="Foto" name="foto" currentUrl={fotoUrl} />
          </div>
          <TextField
            label="Nome completo"
            name="nomeCompleto"
            required
            defaultValue={values.nomeCompleto}
            error={errors.nomeCompleto}
          />
          <TextField
            label="Data de início (na avaliação)"
            name="dataInicio"
            type="date"
            defaultValue={values.dataInicio}
            error={errors.dataInicio}
          />
          <TextField
            label="Data de término"
            name="dataTermino"
            type="date"
            defaultValue={values.dataTermino}
            error={errors.dataTermino}
          />
          <TextField
            label="Data de nascimento"
            name="dataNascimento"
            type="date"
            defaultValue={values.dataNascimento}
            error={errors.dataNascimento}
          />
          <TextField label="Telefone" name="telefone" defaultValue={values.telefone} error={errors.telefone} />
          <SelectField
            label="Categoria pretendida"
            name="categoria"
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
            defaultValue={values.posicao}
            error={errors.posicao}
            placeholder="Ex: Zagueiro, Atacante"
          />
          <TextField
            label="Indicação"
            name="indicacao"
            defaultValue={values.indicacao}
            error={errors.indicacao}
            placeholder="Quem indicou o candidato"
          />
          <TextField
            label="Clube anterior"
            name="clubeAnterior"
            defaultValue={values.clubeAnterior}
            error={errors.clubeAnterior}
          />
          <SelectField label="Status" name="status" defaultValue={values.status ?? "avaliacao"} error={errors.status}>
            {/* "Inscrição enviada" só aparece aqui pra não quebrar quem já chegou pelo link público
                com esse status — trocar pra ele manualmente não costuma fazer sentido (é só a
                Aprovações, /base/captacao/aprovacoes, que tira alguém dessa fila). */}
            {values.status === "inscricao" ? (
              <option value="inscricao">{captacaoStatusLabel("inscricao")}</option>
            ) : null}
            {CAPTACAO_STATUS_OPTIONS.map((opcao) => (
              <option key={opcao.value} value={opcao.value}>
                {opcao.label}
              </option>
            ))}
          </SelectField>
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
          <div className="sm:col-span-2">
            <TextAreaField
              label="Observações"
              name="observacoes"
              rows={3}
              defaultValue={values.observacoes}
              error={errors.observacoes}
            />
          </div>
        </FieldGroup>
      </FormSection>

      {/* Empresário, Ajuda de custo e Agência saem daqui (19/08) — são dados do cadastro de Atleta
          (Ficha de Cadastro), não da Captação. */}
      <FormSection title="Responsáveis e escola">
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

      <FormSection title="Endereço">
        {/* EnderecoFields envia o número do endereço no campo name="numero" (padrão do componente).
            No banco isso vira `numero_endereco` — "numero" já é o Nº sequencial do candidato,
            gerado sozinho pelo banco (ver 0076_captacao_alojamento_base.sql) — mas na tela é só
            mais um campo de endereço, sem confusão nenhuma pra quem preenche. */}
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

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
