"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { DadosJogoFormState } from "./actions";

const initialState: DadosJogoFormState = {};

function SalvarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

/**
 * Mini-formulário do topo da aba Súmula: placar (escreve em `jogos.gols_pro`/`gols_contra`, mesma
 * fonte de verdade da aba "Dados do jogo") e duração de cada tempo. Botão "Salvar" próprio,
 * separado da lista de eventos abaixo — ver docs/superpowers/specs/2026-08-04-sumula-design.md.
 */
export function DadosJogoForm({
  action,
  jogoId,
  golsPro,
  golsContra,
  duracaoPrimeiroTempo,
  duracaoSegundoTempo,
  nomeMandante,
  nomeVisitante,
}: {
  action: (prevState: DadosJogoFormState, formData: FormData) => Promise<DadosJogoFormState>;
  jogoId: string;
  golsPro: number | null;
  golsContra: number | null;
  duracaoPrimeiroTempo: number;
  duracaoSegundoTempo: number;
  nomeMandante: string;
  nomeVisitante: string;
}) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="card flex flex-wrap items-end gap-4 p-4">
      <input type="hidden" name="jogoId" value={jogoId} />

      <div className="flex items-end gap-2">
        <div>
          <label className="field-label">{nomeMandante}</label>
          <input
            type="number"
            name="golsPro"
            min={0}
            defaultValue={golsPro ?? ""}
            className="field-input w-16"
          />
        </div>
        <span className="pb-2 text-neutral-400">×</span>
        <div>
          <label className="field-label">{nomeVisitante}</label>
          <input
            type="number"
            name="golsContra"
            min={0}
            defaultValue={golsContra ?? ""}
            className="field-input w-16"
          />
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div>
          <label className="field-label">1º Tempo (min)</label>
          <input
            type="number"
            name="duracaoPrimeiroTempo"
            min={1}
            required
            defaultValue={duracaoPrimeiroTempo}
            className="field-input w-20"
          />
        </div>
        <div>
          <label className="field-label">2º Tempo (min)</label>
          <input
            type="number"
            name="duracaoSegundoTempo"
            min={1}
            required
            defaultValue={duracaoSegundoTempo}
            className="field-input w-20"
          />
        </div>
      </div>

      <SalvarButton />
      {state.error ? <p className="field-error">{state.error}</p> : null}
      {state.success ? <p className="text-sm font-medium text-green-700">Salvo!</p> : null}
    </form>
  );
}
