"use client";

import { useFormState } from "react-dom";
import { FieldGroup, SelectField, TextAreaField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { FISIOTERAPIA_TIPO_OPTIONS, fisioterapiaTipoLabel } from "@/lib/futebol/fisioterapia";
import type { FisioterapiaTipo } from "@/lib/supabase/types";
import {
  atualizarTipoLesao,
  atualizarTipoQueixa,
  encerrarLesao,
  registrarAtendimento,
  registrarLesao,
  registrarQueixa,
  type FisioterapiaFormState,
} from "./actions";

const initialState: FisioterapiaFormState = {};

function Feedback({ state }: { state: FisioterapiaFormState }) {
  if (state.error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state.success)
    return <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</p>;
  return null;
}

export function NovaLesaoForm({ atletaId }: { atletaId: string }) {
  const [state, formAction] = useFormState(registrarLesao, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <details className="card mt-3 p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold text-grena">+ Nova lesão</summary>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="atletaId" value={atletaId} />
        <TextAreaField label="Descrição da lesão" name="descricao" error={errors.descricao} required rows={2} />
        <FieldGroup>
          <SelectField label="Tipo" name="tipo" error={errors.tipo} required>
            <option value="">Selecione</option>
            {FISIOTERAPIA_TIPO_OPTIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </SelectField>
          <TextField label="Data de início" name="dataInicio" type="date" error={errors.dataInicio} required />
        </FieldGroup>
        <TextField
          label="Data de fim (deixe em branco se ainda estiver em andamento)"
          name="dataFim"
          type="date"
          error={errors.dataFim}
        />
        <TextAreaField label="Observações" name="observacoes" rows={2} />
        {state.error || state.success ? <Feedback state={state} /> : null}
        <SubmitButton label="Salvar lesão" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
      </form>
    </details>
  );
}

export function EncerrarLesaoForm({ atletaId, lesaoId, dataInicio }: { atletaId: string; lesaoId: string; dataInicio: string }) {
  const [state, formAction] = useFormState(encerrarLesao, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <details className="mt-2">
      <summary className="cursor-pointer select-none text-xs font-semibold text-grena">Encerrar lesão</summary>
      <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
        <input type="hidden" name="atletaId" value={atletaId} />
        <input type="hidden" name="lesaoId" value={lesaoId} />
        <input type="hidden" name="dataInicioAtual" value={dataInicio} />
        <TextField label="Data de fim" name="dataFim" type="date" error={errors.dataFim} required />
        <SubmitButton label="Encerrar" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
      </form>
      {state.error ? <p className="mt-1 text-xs text-red-700">{state.error}</p> : null}
      {state.success ? <p className="mt-1 text-xs text-emerald-700">{state.success}</p> : null}
    </details>
  );
}

/** Corrigir o tipo de uma lesão já lançada, sem precisar apagar e relançar — pedido explícito do
 * Mateus ao trazer a classificação certa do relatório em papel: "deixar no sistema tipo editável
 * essas caso precise". O tipo em si É o gatilho: fica exibido normalmente (fechado) e só abre o
 * seletor ao clicar nele — mesmo padrão de "Encerrar lesão" logo abaixo, pra não deixar a tela com
 * um `<select>` sempre visível em cada lesão/queixa. */
/** Pílula de uma opção de tipo — preenchida (grena) quando é o tipo atual, contorno quando não é.
 * Cada pílula é o próprio botão de submit (sem campo de formulário nenhum) — clicou, salvou. */
function PilulaTipo({ value, label, selecionado }: { value: FisioterapiaTipo; label: string; selecionado: boolean }) {
  return (
    <button
      type="submit"
      name="tipo"
      value={value}
      disabled={selecionado}
      className={
        selecionado
          ? "rounded-full bg-grena px-2 py-0.5 text-[11px] font-semibold text-white"
          : "rounded-full border border-grena/30 px-2 py-0.5 text-[11px] font-semibold text-grena hover:bg-grena/10"
      }
    >
      {label}
    </button>
  );
}

export function EditarTipoLesaoForm({
  atletaId,
  lesaoId,
  tipoAtual,
}: {
  atletaId: string;
  lesaoId: string;
  tipoAtual: FisioterapiaTipo;
}) {
  const [state, formAction] = useFormState(atualizarTipoLesao, initialState);

  return (
    <details className="mt-0.5">
      <summary className="inline-block cursor-pointer select-none rounded-full bg-grena px-2 py-0.5 text-[11px] font-semibold text-white">
        {fisioterapiaTipoLabel(tipoAtual)}
      </summary>
      <form action={formAction} className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <input type="hidden" name="atletaId" value={atletaId} />
        <input type="hidden" name="lesaoId" value={lesaoId} />
        {FISIOTERAPIA_TIPO_OPTIONS.map((op) => (
          <PilulaTipo key={op.value} value={op.value} label={op.label} selecionado={op.value === tipoAtual} />
        ))}
        {state.error ? <span className="text-xs text-red-700">{state.error}</span> : null}
      </form>
    </details>
  );
}

/** Mesma ideia de `EditarTipoLesaoForm`, pras Queixas. */
export function EditarTipoQueixaForm({
  atletaId,
  queixaId,
  tipoAtual,
}: {
  atletaId: string;
  queixaId: string;
  tipoAtual: FisioterapiaTipo;
}) {
  const [state, formAction] = useFormState(atualizarTipoQueixa, initialState);

  return (
    <details className="mt-0.5">
      <summary className="inline-block cursor-pointer select-none rounded-full bg-grena px-2 py-0.5 text-[11px] font-semibold text-white">
        {fisioterapiaTipoLabel(tipoAtual)}
      </summary>
      <form action={formAction} className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <input type="hidden" name="atletaId" value={atletaId} />
        <input type="hidden" name="queixaId" value={queixaId} />
        {FISIOTERAPIA_TIPO_OPTIONS.map((op) => (
          <PilulaTipo key={op.value} value={op.value} label={op.label} selecionado={op.value === tipoAtual} />
        ))}
        {state.error ? <span className="text-xs text-red-700">{state.error}</span> : null}
      </form>
    </details>
  );
}

export function NovaQueixaForm({ atletaId }: { atletaId: string }) {
  const [state, formAction] = useFormState(registrarQueixa, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <details className="card mt-3 p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold text-grena">+ Nova queixa</summary>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="atletaId" value={atletaId} />
        <FieldGroup>
          <SelectField label="Tipo" name="tipo" error={errors.tipo} required>
            <option value="">Selecione</option>
            {FISIOTERAPIA_TIPO_OPTIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </SelectField>
          <TextField label="Data" name="data" type="date" error={errors.data} required />
        </FieldGroup>
        <TextAreaField label="O que o atleta sentiu, onde" name="descricao" error={errors.descricao} required rows={2} />
        {state.error || state.success ? <Feedback state={state} /> : null}
        <SubmitButton label="Salvar queixa" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
      </form>
    </details>
  );
}

export function NovoAtendimentoForm({
  atletaId,
  lesoesAtivas,
}: {
  atletaId: string;
  lesoesAtivas: { id: string; descricao: string }[];
}) {
  const [state, formAction] = useFormState(registrarAtendimento, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <details className="card mt-3 p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold text-grena">+ Novo atendimento</summary>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="atletaId" value={atletaId} />
        <FieldGroup>
          <TextField label="Data" name="data" type="date" error={errors.data} required />
          <SelectField label="Ligar a uma lesão em andamento (opcional)" name="lesaoId" defaultValue="">
            <option value="">Sessão solta (sem lesão vinculada)</option>
            {lesoesAtivas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.descricao}
              </option>
            ))}
          </SelectField>
        </FieldGroup>
        <TextAreaField label="O que foi feito na sessão" name="descricao" error={errors.descricao} required rows={2} />
        {state.error || state.success ? <Feedback state={state} /> : null}
        <SubmitButton label="Salvar atendimento" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
      </form>
    </details>
  );
}
