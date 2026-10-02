"use client";

import { useFormState } from "react-dom";
import { SelectField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import type { ComissaoTecnicaParaSelecao } from "@/lib/auth/perfis";
import type { PermissaoActionState } from "@/components/permissao-checkboxes-form";

const initialState: PermissaoActionState = {};

/**
 * Vínculo (obrigatório) de um usuário "treinador" já existente com a Comissão Técnica (Base) — ver
 * docs/superpowers/specs/2026-10-02-assinatura-treinador-design.md. Diferente de
 * `VinculoComissaoTecnicaForm` (pros papéis Regular/Master, onde o vínculo é opcional, cobre
 * também o Profissional, e tem o bloco de categorias manuais quando não vinculado), aqui é só o
 * select da Base, sempre obrigatório, sem opção de desvincular.
 */
export function VinculoTreinadorForm({
  id,
  comissaoTecnicaBase,
  comissaoTecnicaBaseIdAtual,
  action,
}: {
  id: string;
  comissaoTecnicaBase: ComissaoTecnicaParaSelecao[];
  comissaoTecnicaBaseIdAtual: string | null;
  action: (prevState: PermissaoActionState, formData: FormData) => Promise<PermissaoActionState>;
}) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="space-y-2 border-t border-neutral-100 pt-3">
      <input type="hidden" name="id" value={id} />
      <SelectField
        label="Vínculo com a Comissão Técnica (Base)"
        name="comissaoTecnicaBaseId"
        defaultValue={comissaoTecnicaBaseIdAtual ?? ""}
        required
      >
        <option value="">Selecione</option>
        {comissaoTecnicaBase.map((p) => (
          <option key={p.id} value={p.id}>
            {p.rotulo}
          </option>
        ))}
      </SelectField>
      <p className="-mt-0.5 text-xs text-neutral-400">
        Sem isso, esse Treinador não consegue assinar o Parecer de Avaliação nem o Relatório de
        Dispensa — o nome e a função usados na assinatura vêm desse cadastro.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label="Salvar vínculo" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
        {state.success ? <span className="text-xs font-medium text-emerald-700">{state.success}</span> : null}
        {state.error ? <span className="text-xs font-medium text-red-700">{state.error}</span> : null}
      </div>
    </form>
  );
}
