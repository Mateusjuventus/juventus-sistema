"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { SelectField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { MOTIVO_DESATIVACAO_ATLETA_OPTIONS } from "@/lib/futebol/ativo-historico";
import type { AtivarDesativarAtletaFormState } from "@/app/atletas/actions";

const initialState: AtivarDesativarAtletaFormState = {};

/**
 * Botão de ativar/desativar um atleta (Profissional ou Base), na página "Ver atleta" ao lado de
 * "Editar" (ver `AtletaPerfilHeader`) — mesmo padrão de `StaffAtivoButton`
 * (components/staff-ativo-button.tsx). Desde 05/11/2026 (ver docs/superpowers/specs/2026-11-04-
 * atletas-desativacao-transicao-pagamento-design.md), em vez de trocar na hora, abre uma caixa
 * inline pedindo motivo (desativar) ou observação (reativar) — mesmo padrão de
 * `NovoLancamentoForm` (app/departamento-medico/fisioterapia/historico-status-modal.tsx).
 */
export function AtletaAtivoButton({ action, id, ativo }: { action: (prevState: AtivarDesativarAtletaFormState, formData: FormData) => Promise<AtivarDesativarAtletaFormState>; id: string; ativo: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction] = useFormState(action, initialState);
  const [motivo, setMotivo] = useState("");
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (!state.error && !errors.motivo && !errors.motivoOutro && !errors.observacao && state !== initialState) {
      setAberto(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="btn-secondary">
        {ativo ? "Desativar atleta" : "Ativar atleta"}
      </button>
    );
  }

  return (
    <form action={formAction} className="card w-full max-w-sm space-y-3 p-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="ativo" value={(!ativo).toString()} />
      <p className="text-sm font-semibold text-grena-escuro">{ativo ? "Desativar atleta" : "Reativar atleta"}</p>

      {ativo ? (
        <>
          <SelectField label="Motivo" name="motivo" required onChange={setMotivo} error={errors.motivo}>
            <option value="">Selecione</option>
            {MOTIVO_DESATIVACAO_ATLETA_OPTIONS.map((opcao) => (
              <option key={opcao.value} value={opcao.value}>
                {opcao.label}
              </option>
            ))}
          </SelectField>
          {motivo === "outro" ? (
            <TextField label="Qual?" name="motivoOutro" required error={errors.motivoOutro} />
          ) : null}
          <TextField label="Observação (opcional)" name="observacao" error={errors.observacao} />
        </>
      ) : (
        <TextField label="Observação (motivo da volta)" name="observacao" required error={errors.observacao} />
      )}

      {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}

      <div className="flex gap-2">
        <SubmitButton label="Confirmar" pendingLabel="Salvando..." className="btn-primary btn-sm" />
        <button type="button" onClick={() => setAberto(false)} className="btn-secondary btn-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}
