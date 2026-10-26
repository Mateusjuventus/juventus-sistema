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

/** Espelha `app/jogos/[id]/sumula/dados-jogo-form.tsx` para o Futebol de Base. */
export function DadosJogoFormBase({
  action,
  jogoId,
  golsPro,
  golsContra,
  penaltisPro,
  penaltisContra,
  duracaoPrimeiroTempo,
  duracaoSegundoTempo,
  duracaoTerceiroTempo,
  temTerceiroTempo,
  acrescimoPrimeiroTempo,
  acrescimoSegundoTempo,
  acrescimoTerceiroTempo,
  nomeMandante,
  nomeVisitante,
}: {
  action: (prevState: DadosJogoFormState, formData: FormData) => Promise<DadosJogoFormState>;
  jogoId: string;
  golsPro: number | null;
  golsContra: number | null;
  /** Placar da disputa de pênaltis (jogos de mata-mata que empataram) — opcional, qualquer jogo
   * pode ir pra pênaltis, não só os de 3 tempos. Ver 0146_sumula_pdf_terceiro_tempo_penaltis.sql. */
  penaltisPro: number | null;
  penaltisContra: number | null;
  duracaoPrimeiroTempo: number;
  duracaoSegundoTempo: number;
  /** Só relevante quando `temTerceiroTempo` é true — jogo vinculado a uma competição com
   * `numero_tempos = 3` (ver docs/superpowers/specs/2026-10-21-competicoes-formato-partida-
   * design.md). */
  duracaoTerceiroTempo?: number | null;
  /** Mostra (e exige) o campo "3º Tempo (min)" — false em todo o resto dos jogos. */
  temTerceiroTempo?: boolean;
  /** Acréscimo (tempo extra/compensação) de cada tempo, à parte da duração regulamentar acima —
   * ver 0147_sumula_acrescimo.sql. Default 0 (nenhum acréscimo lançado ainda). */
  acrescimoPrimeiroTempo: number;
  acrescimoSegundoTempo: number;
  acrescimoTerceiroTempo?: number;
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
          <label className="field-label">Pênaltis — {nomeMandante}</label>
          <input
            type="number"
            name="penaltisPro"
            min={0}
            defaultValue={penaltisPro ?? ""}
            placeholder="—"
            className="field-input w-16"
          />
        </div>
        <span className="pb-2 text-neutral-400">×</span>
        <div>
          <label className="field-label">Pênaltis — {nomeVisitante}</label>
          <input
            type="number"
            name="penaltisContra"
            min={0}
            defaultValue={penaltisContra ?? ""}
            placeholder="—"
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
        {temTerceiroTempo ? (
          <div>
            <label className="field-label">3º Tempo (min)</label>
            <input
              type="number"
              name="duracaoTerceiroTempo"
              min={1}
              required
              defaultValue={duracaoTerceiroTempo ?? ""}
              className="field-input w-20"
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-end gap-2">
        <div>
          <label className="field-label" title="Tempo extra/compensação jogado no 1º tempo — some à duração acima só pra calcular o fim de jogo e a minutagem de cada atleta.">
            Acréscimo 1º Tempo (min)
          </label>
          <input
            type="number"
            name="acrescimoPrimeiroTempo"
            min={0}
            defaultValue={acrescimoPrimeiroTempo}
            className="field-input w-20"
          />
        </div>
        <div>
          <label className="field-label" title="Tempo extra/compensação jogado no 2º tempo — some à duração acima só pra calcular o fim de jogo e a minutagem de cada atleta.">
            Acréscimo 2º Tempo (min)
          </label>
          <input
            type="number"
            name="acrescimoSegundoTempo"
            min={0}
            defaultValue={acrescimoSegundoTempo}
            className="field-input w-20"
          />
        </div>
        {temTerceiroTempo ? (
          <div>
            <label className="field-label" title="Tempo extra/compensação jogado no 3º tempo — some à duração acima só pra calcular o fim de jogo e a minutagem de cada atleta.">
              Acréscimo 3º Tempo (min)
            </label>
            <input
              type="number"
              name="acrescimoTerceiroTempo"
              min={0}
              defaultValue={acrescimoTerceiroTempo ?? 0}
              className="field-input w-20"
            />
          </div>
        ) : null}
      </div>

      <SalvarButton />
      {state.error ? <p className="field-error">{state.error}</p> : null}
      {state.success ? <p className="text-sm font-medium text-green-700">Salvo!</p> : null}
    </form>
  );
}
