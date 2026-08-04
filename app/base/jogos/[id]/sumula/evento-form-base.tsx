"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { SUMULA_EVENTO_TIPO_OPTIONS } from "@/lib/futebol/sumula-eventos";
import type { SumulaEventoTipo } from "@/lib/supabase/types";
import type { SumulaEventoFormState } from "./actions";

const initialState: SumulaEventoFormState = {};

export interface ConvocadoOption {
  id: string;
  nome: string;
  numeroCamisa: number | null;
  sigla: string;
}

function labelAtleta(a: ConvocadoOption): string {
  return `${a.sigla} · ${a.nome}${a.numeroCamisa ? ` (#${a.numeroCamisa})` : ""}`;
}

function AdicionarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Adicionando..." : "Adicionar evento"}
    </button>
  );
}

/** Espelha `app/jogos/[id]/sumula/evento-form.tsx` para o Futebol de Base. */
export function EventoFormBase({
  action,
  jogoId,
  tempo,
  convocados,
  reservas,
}: {
  action: (prevState: SumulaEventoFormState, formData: FormData) => Promise<SumulaEventoFormState>;
  jogoId: string;
  tempo: "primeiro" | "segundo";
  convocados: ConvocadoOption[];
  reservas: ConvocadoOption[];
}) {
  const [state, formAction] = useFormState(action, initialState);
  const [tipo, setTipo] = useState<SumulaEventoTipo>("gol");
  const [atletaId, setAtletaId] = useState("");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.success) {
      setTipo("gol");
      setAtletaId("");
      setFormKey((k) => k + 1);
    }
  }, [state]);

  const opcoesAssistencia = convocados.filter((c) => c.id !== atletaId);

  return (
    <div className="mt-2">
      <form
        key={formKey}
        action={formAction}
        className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-neutral-300 p-3"
      >
        <input type="hidden" name="jogoId" value={jogoId} />
        <input type="hidden" name="tempo" value={tempo} />

        <div>
          <label className="field-label">Tipo</label>
          <select
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as SumulaEventoTipo)}
            className="field-input"
          >
            {SUMULA_EVENTO_TIPO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Minuto</label>
          <input type="number" name="minuto" min={0} required className="field-input w-20" />
        </div>

        {tipo === "substituicao" ? (
          <>
            <div className="min-w-[200px]">
              <label className="field-label">Saiu</label>
              <select
                name="atletaId"
                required
                value={atletaId}
                onChange={(e) => setAtletaId(e.target.value)}
                className="field-input"
              >
                <option value="">Selecione...</option>
                {convocados.map((c) => (
                  <option key={c.id} value={c.id}>
                    {labelAtleta(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[200px]">
              <label className="field-label">Entrou</label>
              <select name="atletaEntrouId" required defaultValue="" className="field-input">
                <option value="">Selecione...</option>
                {reservas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {labelAtleta(c)}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div className="min-w-[200px]">
            <label className="field-label">Atleta</label>
            <select
              name="atletaId"
              required
              value={atletaId}
              onChange={(e) => setAtletaId(e.target.value)}
              className="field-input"
            >
              <option value="">Selecione...</option>
              {convocados.map((c) => (
                <option key={c.id} value={c.id}>
                  {labelAtleta(c)}
                </option>
              ))}
            </select>
          </div>
        )}

        {tipo === "gol" ? (
          <div className="min-w-[200px]">
            <label className="field-label">Assistência</label>
            <select name="atletaAssistenciaId" defaultValue="" className="field-input">
              <option value="">Nenhuma / não informar</option>
              {opcoesAssistencia.map((c) => (
                <option key={c.id} value={c.id}>
                  {labelAtleta(c)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <AdicionarButton />
      </form>
      {state.error ? <p className="field-error">{state.error}</p> : null}
    </div>
  );
}
