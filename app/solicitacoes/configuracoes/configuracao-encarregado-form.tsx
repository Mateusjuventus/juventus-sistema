"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { PerfilParaSelecao } from "@/lib/auth/perfis";
import type { ConfiguracaoSolicitacoesFormState } from "./actions";

const initialState: ConfiguracaoSolicitacoesFormState = {};

/**
 * Configuração do Encarregado do Departamento que assina digitalmente as Solicitações (ver
 * docs/superpowers/specs/2026-08-28-assinatura-digital-notificacoes-design.md, Fase 2) — nome/cargo
 * ficam em branco até o Mateus preencher (não é obrigatório pra Solicitações continuarem
 * funcionando normalmente; só o bloco de assinatura fica "sem encarregado definido" até então).
 */
export function ConfiguracaoEncarregadoForm({
  action,
  entityId,
  defaultValues,
  perfis,
}: {
  action: (prevState: ConfiguracaoSolicitacoesFormState, formData: FormData) => Promise<ConfiguracaoSolicitacoesFormState>;
  entityId: string;
  defaultValues: Record<string, string>;
  perfis: PerfilParaSelecao[];
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues;
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={entityId} />
      <FormSection title="Encarregado do Departamento">
        <FieldGroup>
          <TextField
            label="Nome"
            name="encarregadoNome"
            defaultValue={values.encarregadoNome}
            error={errors.encarregadoNome}
          />
          <TextField
            label="Cargo"
            name="encarregadoCargo"
            defaultValue={values.encarregadoCargo}
            error={errors.encarregadoCargo}
          />
          <SelectField
            label="Usuário que assina digitalmente"
            name="encarregadoUsuarioId"
            defaultValue={values.encarregadoUsuarioId}
          >
            <option value="">— Não vincular (qualquer master pode assinar) —</option>
            {perfis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
          </SelectField>
        </FieldGroup>
      </FormSection>

      {/* Seções "Departamento de Compras", "Departamento Financeiro" e "Aprovador" removidas a
          pedido do Mateus em 2026-10-20 — só a UI: os campos `compras_*`/`financeiro_*`/
          `aprovador_*` continuam existindo em `configuracoes_solicitacoes` e sendo lidos por
          `papeisAssinaturaSolicitacao`/`podeAssinarPapel` (`lib/assinaturas/config.ts`), que já
          tratam ausência de valor com os mesmos fallbacks de sempre: rótulo genérico ("Departamento
          de Compras"/"Departamento Financeiro"/"Aprovador") quando o Cargo está vazio, e "qualquer
          master pode assinar" quando não há usuário vinculado — exatamente o estado em que esses 3
          papéis ficam a partir de agora. "Encarregado do Departamento" continua configurável abaixo. */}

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label="Salvar alterações" />
      </div>
    </form>
  );
}
