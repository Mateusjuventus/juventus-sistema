"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { ProgramacaoLinhaFormState } from "./actions";

const initialState: ProgramacaoLinhaFormState = {};

function AdicionarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Adicionando..." : "Adicionar"}
    </button>
  );
}

/**
 * Formulário de adicionar uma linha de cronograma (horário, atividade, local). Na seção Dia de
 * Jogo (`mostrarConfronto`), existe o checkbox "Esta linha é o confronto" — quando marcado, o
 * campo de atividade fica desabilitado (o pôster preenche sozinho a partir do adversário/mandante
 * do jogo, ver `lib/posters/jogo-texto.ts`).
 *
 * Usa `useFormState` (em vez de um action de retorno `void`) pra mostrar erro na tela quando a
 * linha não é adicionada (ex: RLS, migração não aplicada) — antes, uma falha aqui era silenciosa
 * e dava a impressão de um limite de "só 1 atividade". Ao adicionar com sucesso, os campos são
 * limpos (o `key` no form força o React a remontar os inputs não controlados de horário/local).
 */
export function ProgramacaoLinhaForm({
  action,
  jogoId,
  tipo,
  mostrarConfronto,
  confrontoTexto,
}: {
  action: (prevState: ProgramacaoLinhaFormState, formData: FormData) => Promise<ProgramacaoLinhaFormState>;
  jogoId: string;
  tipo: "concentracao" | "dia_jogo";
  mostrarConfronto?: boolean;
  confrontoTexto?: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const [ehConfronto, setEhConfronto] = useState(false);
  const [atividade, setAtividade] = useState("");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.success) {
      setEhConfronto(false);
      setAtividade("");
      setFormKey((k) => k + 1);
    }
  }, [state]);

  return (
    <div>
      <form
        key={formKey}
        action={formAction}
        className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-neutral-300 p-3"
      >
        <input type="hidden" name="jogoId" value={jogoId} />
        <input type="hidden" name="tipo" value={tipo} />

        <div>
          <label className="field-label">Horário</label>
          <input
            type="text"
            name="horario"
            placeholder="Ex.: 12:00"
            required
            className="field-input w-28"
          />
        </div>

        <div className="min-w-[180px] flex-1">
          <label className="field-label">Atividade</label>
          <input
            type="text"
            name="atividade"
            placeholder="Ex.: Almoço"
            required={!ehConfronto}
            disabled={ehConfronto}
            value={ehConfronto ? confrontoTexto ?? "" : atividade}
            onChange={(e) => setAtividade(e.target.value)}
            className="field-input disabled:bg-neutral-100 disabled:text-neutral-500"
          />
        </div>

        <div className="min-w-[140px] flex-1">
          <label className="field-label">Local</label>
          <input type="text" name="local" placeholder="Ex.: Javari" required className="field-input" />
        </div>

        {mostrarConfronto ? (
          <label className="mb-2 flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              name="ehConfronto"
              checked={ehConfronto}
              onChange={(e) => setEhConfronto(e.target.checked)}
            />
            Esta linha é o confronto
          </label>
        ) : null}

        <AdicionarButton />
      </form>
      {state.error ? <p className="field-error">{state.error}</p> : null}
    </div>
  );
}
