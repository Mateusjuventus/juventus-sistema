"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextField } from "@/components/fields";
import { CpfField } from "@/components/cpf-field";
import { TelefoneField } from "@/components/telefone-field";
import { CurrencyField } from "@/components/currency-field";
import { SubmitButton } from "@/components/submit-button";
import { dataFimFormacao } from "@/lib/futebol/contrato";

export interface ContratoFormacaoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
  success?: boolean;
}

/**
 * Formulário de "Contrato de Formação" — ver docs/superpowers/specs/2026-11-11-contrato-formacao-
 * fase2-design.md. Até 12/11/2026 vivia numa tela própria (`/atletas/[id]/contrato/formacao`);
 * virou um botão + modal dentro de `ContratoSecao` (ver `components/contrato-formacao-button.tsx`),
 * pedido do Mateus pra não precisar de "outra aba" — esta é a única mudança deste componente:
 * `onSuccessClose` (chamado quando a action retorna `success: true`, pra quem renderiza dentro de
 * um modal poder fechá-lo) substitui o antigo `redirect()` que as actions faziam. Substitui, pra
 * este tipo de contrato, o fluxo genérico de "Novo contrato"/"Aditivo" (`components/contrato-
 * form.tsx`, que continua existindo pros outros tipos e também continua oferecendo "Formação" como
 * opção — ver a spec, "a Formação continua no dropdown"). Um formulário só pros dois modos:
 *
 * - Criar (`modoEdicao=false`): action `criarContratoFormacao` — grava Responsáveis/Vigência do
 *   BID em `atletas` e encerra o contrato vigente atual (seja ele qual for) criando este como o
 *   novo vigente.
 * - Editar (`modoEdicao=true`, já existe um Contrato de Formação vigente): action
 *   `atualizarContratoFormacao` — mesma gravação em `atletas`, mas atualiza o contrato vigente NO
 *   MESMO REGISTRO (sem Aditivo, sem histórico novo).
 *
 * `dataNascimentoAtleta` só é usada pra sugerir a vigência fim do Contrato de Formação (nascimento
 * + 20 anos, menos 1 dia — mesma regra de `ContratoForm`/Cláusula 1.1 do próprio contrato de
 * menor). A Vigência do BID não tem sugestão nenhuma (é um dado independente, do registro na CBF/
 * FPF — ver a spec).
 */
export function ContratoFormacaoForm({
  action,
  atletaId,
  camposExtras,
  valoresIniciais,
  modoEdicao,
  dataNascimentoAtleta,
  onSuccessClose,
}: {
  action: (prevState: ContratoFormacaoFormState, formData: FormData) => Promise<ContratoFormacaoFormState>;
  atletaId: string;
  /** Campos extras pra devolver no FormData — mesmo padrão de `ContratoForm`. */
  camposExtras?: Record<string, string>;
  valoresIniciais?: Record<string, string | undefined>;
  modoEdicao: boolean;
  dataNascimentoAtleta?: string | null;
  /** Chamado quando a action salva com sucesso — quem usa este formulário dentro de um modal
   * (`ContratoFormacaoButton`) passa aqui o fechamento do próprio modal. Sem essa prop (ex.: se
   * algum dia este formulário voltar a aparecer fora de um modal), mostra uma mensagem de "Salvo
   * com sucesso." no lugar. */
  onSuccessClose?: () => void;
}) {
  const [state, formAction] = useFormState(action, {});
  const values = state.values ?? valoresIniciais ?? {};
  const errors = state.fieldErrors ?? {};
  const vigenciaFimSugerida = dataNascimentoAtleta ? dataFimFormacao(dataNascimentoAtleta) : undefined;

  useEffect(() => {
    if (state.success && onSuccessClose) onSuccessClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="atletaId" value={atletaId} />
      {camposExtras
        ? Object.entries(camposExtras).map(([nome, valor]) => <input key={nome} type="hidden" name={nome} value={valor} />)
        : null}

      <FormSection title="Responsáveis">
        <div className="space-y-4">
          <FieldGroup>
            <TextField label="Nome da mãe" name="maeNome" defaultValue={values.maeNome} error={errors.maeNome} />
            <TelefoneField
              label="Telefone da mãe"
              name="maeTelefone"
              defaultValue={values.maeTelefone}
              error={errors.maeTelefone}
            />
            <TextField label="Email da mãe" name="emailMae" type="email" defaultValue={values.emailMae} error={errors.emailMae} />
            <CpfField label="CPF da mãe" name="maeCpf" defaultValue={values.maeCpf} error={errors.maeCpf} />
          </FieldGroup>
          <FieldGroup>
            <TextField label="Nome do pai" name="paiNome" defaultValue={values.paiNome} error={errors.paiNome} />
            <TelefoneField
              label="Telefone do pai"
              name="paiTelefone"
              defaultValue={values.paiTelefone}
              error={errors.paiTelefone}
            />
            <TextField label="Email do pai" name="emailPai" type="email" defaultValue={values.emailPai} error={errors.emailPai} />
            <CpfField label="CPF do pai" name="paiCpf" defaultValue={values.paiCpf} error={errors.paiCpf} />
          </FieldGroup>
        </div>
        <p className="mt-3 text-sm text-neutral-500">
          Esses dados ficam gravados direto no cadastro do atleta — aparecem/atualizam também em
          &quot;Editar atleta&quot;.
        </p>
      </FormSection>

      <FormSection title="Contrato">
        <div className="space-y-4">
          <div>
            <p className="field-label">Vigência do Contrato de Formação</p>
            <FieldGroup>
              <TextField
                label="Início"
                name="vigenciaInicio"
                type="date"
                defaultValue={values.vigenciaInicio}
                error={errors.vigenciaInicio}
              />
              <TextField
                label="Término"
                name="vigenciaFim"
                type="date"
                defaultValue={values.vigenciaFim ?? vigenciaFimSugerida}
                error={errors.vigenciaFim}
              />
            </FieldGroup>
          </div>
          <div>
            <p className="field-label">Vigência do BID</p>
            <FieldGroup>
              <TextField
                label="Início"
                name="vigenciaBidInicio"
                type="date"
                defaultValue={values.vigenciaBidInicio}
                error={errors.vigenciaBidInicio}
              />
              <TextField
                label="Término"
                name="vigenciaBidFim"
                type="date"
                defaultValue={values.vigenciaBidFim}
                error={errors.vigenciaBidFim}
              />
            </FieldGroup>
            <p className="mt-1 text-xs text-neutral-400">
              Período do registro do atleta na CBF/FPF — pode ser diferente da vigência do
              Contrato de Formação acima.
            </p>
          </div>
        </div>
      </FormSection>

      <FormSection title="Remuneração">
        <FieldGroup>
          <CurrencyField
            label="Bolsa de aprendizagem"
            name="bolsaAprendizagem"
            defaultValue={values.bolsaAprendizagem}
            error={errors.bolsaAprendizagem}
          />
        </FieldGroup>
      </FormSection>

      {state.success && !onSuccessClose ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Salvo com sucesso.</p>
      ) : null}
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label={modoEdicao ? "Salvar alterações" : "Criar contrato de Formação"} />
      </div>
    </form>
  );
}
