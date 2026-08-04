"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { FpfConfigRow } from "@/lib/supabase/types";
import { salvarConfigFpf, type ConfigFpfFormState } from "./actions";

const initialState: ConfigFpfFormState = {};

function SalvarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvando..." : "Salvar configuração"}
    </button>
  );
}

export function ConfigFpfForm({ config }: { config: FpfConfigRow | null }) {
  const [state, formAction] = useFormState(salvarConfigFpf, initialState);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <div>
        <label className="field-label">Nome de exibição da competição</label>
        <input
          type="text"
          name="nomeExibicao"
          defaultValue={config?.nome_exibicao ?? "Copa Paulista Rivalo"}
          required
          className="field-input"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="field-label">ID do campeonato (FPF)</label>
          <input
            type="number"
            name="idCampeonato"
            defaultValue={config?.id_campeonato ?? 100}
            required
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">ID da categoria (FPF)</label>
          <input
            type="number"
            name="idCategoria"
            defaultValue={config?.id_categoria ?? 70}
            required
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">ID do clube (FPF)</label>
          <input
            type="number"
            name="idClube"
            defaultValue={config?.id_clube ?? 287}
            required
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Temporada (ano)</label>
          <input type="number" name="ano" defaultValue={config?.ano ?? new Date().getFullYear()} required className="field-input" />
        </div>
      </div>
      <p className="text-xs text-neutral-500">
        Os valores pré-preenchidos são os já confirmados pra Copa Paulista Rivalo / Juventus SAF —
        só precisam mudar se a FPF trocar algum ID ou quando a temporada virar.
      </p>
      {state.error ? <p className="field-error">{state.error}</p> : null}
      <div>
        <SalvarButton />
      </div>
    </form>
  );
}
