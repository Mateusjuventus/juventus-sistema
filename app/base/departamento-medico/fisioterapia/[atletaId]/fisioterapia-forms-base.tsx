"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { DeleteButton } from "@/components/delete-button";
import { FieldGroup, SelectField, TextAreaField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { FISIOTERAPIA_TIPO_OPTIONS, diasAfastados, fisioterapiaTipoLabel } from "@/lib/futebol/fisioterapia";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import type {
  FisioterapiaAtendimentoBaseRow,
  FisioterapiaLesaoBaseRow,
  FisioterapiaQueixaBaseRow,
  FisioterapiaTipo,
} from "@/lib/supabase/types";
import {
  atualizarAtendimentoBase,
  atualizarLesaoBase,
  atualizarQueixaBase,
  encerrarLesaoBase,
  excluirAtendimentoBase,
  excluirLesaoBase,
  excluirQueixaBase,
  registrarAtendimentoBase,
  registrarLesaoBase,
  registrarQueixaBase,
  type FisioterapiaFormStateBase,
} from "./actions";

/**
 * Espelha `app/departamento-medico/fisioterapia/[atletaId]/fisioterapia-forms.tsx` (Profissional)
 * — mesma UI/comportamento, chamando as Server Actions `_base`. `FISIOTERAPIA_TIPO_OPTIONS`,
 * `diasAfastados` e `fisioterapiaTipoLabel` são reaproveitadas de `lib/futebol/fisioterapia.ts`
 * (não dependem de nada específico do Profissional). Todo formulário carrega `categoria` como
 * campo oculto, junto de `atletaId`, pra `revalidarFichaBase` saber qual `/base/atletas/[categoria]`
 * revalidar sem precisar de uma query extra.
 */

const initialState: FisioterapiaFormStateBase = {};

function Feedback({ state }: { state: FisioterapiaFormStateBase }) {
  if (state.error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state.success)
    return <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</p>;
  return null;
}

export function NovaLesaoFormBase({ atletaId, categoria }: { atletaId: string; categoria: string }) {
  const [state, formAction] = useFormState(registrarLesaoBase, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <details className="card mt-3 p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold text-grena">+ Nova lesão</summary>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="atletaId" value={atletaId} />
        <input type="hidden" name="categoria" value={categoria} />
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

export function EncerrarLesaoFormBase({
  atletaId,
  categoria,
  lesaoId,
  dataInicio,
}: {
  atletaId: string;
  categoria: string;
  lesaoId: string;
  dataInicio: string;
}) {
  const [state, formAction] = useFormState(encerrarLesaoBase, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <details className="mt-2">
      <summary className="cursor-pointer select-none text-xs font-semibold text-grena">Encerrar lesão</summary>
      <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
        <input type="hidden" name="atletaId" value={atletaId} />
        <input type="hidden" name="categoria" value={categoria} />
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

function SalvarEdicaoButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary text-xs" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

function PilulaTipo({
  label,
  selecionado,
  onClick,
}: {
  label: string;
  selecionado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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

export function LesaoItemBase({
  atletaId,
  categoria,
  lesao,
  hojeStr,
}: {
  atletaId: string;
  categoria: string;
  lesao: FisioterapiaLesaoBaseRow;
  hojeStr: string;
}) {
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState<FisioterapiaTipo>(lesao.tipo);
  const [state, formAction] = useFormState(atualizarLesaoBase, initialState);

  useEffect(() => {
    if (state.success) setEditando(false);
  }, [state]);

  if (!editando) {
    const dias = diasAfastados(lesao.data_inicio, lesao.data_fim, hojeStr);
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="group -mx-2 flex w-[calc(100%+1rem)] flex-col items-start rounded-md px-2 py-1 text-left transition hover:bg-neutral-50"
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span className="text-sm font-medium text-neutral-800">{lesao.descricao}</span>
          <span className="shrink-0 text-[11px] font-semibold text-grena opacity-0 transition group-hover:opacity-100">
            Editar
          </span>
        </span>
        <span className="mt-0.5 inline-block rounded-full bg-grena px-2 py-0.5 text-[11px] font-semibold text-white">
          {fisioterapiaTipoLabel(lesao.tipo)}
        </span>
        {lesao.data_inicio ? (
          <span className="mt-1 text-xs text-neutral-500">
            {formatDataBr(lesao.data_inicio)} até {lesao.data_fim ? formatDataBr(lesao.data_fim) : "hoje"} ·{" "}
            {dias} dia{dias === 1 ? "" : "s"} afastado
          </span>
        ) : (
          <span className="mt-1 text-xs text-neutral-400">Sem data exata.</span>
        )}
        {lesao.data_inicio && !lesao.data_fim ? (
          <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
            Em andamento
          </span>
        ) : null}
        {lesao.observacoes ? <span className="mt-1 text-xs text-neutral-500">{lesao.observacoes}</span> : null}
      </button>
    );
  }

  return (
    <div className="rounded-md border border-grena/30 bg-white p-3">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="atletaId" value={atletaId} />
        <input type="hidden" name="categoria" value={categoria} />
        <input type="hidden" name="lesaoId" value={lesao.id} />
        <input type="hidden" name="tipo" value={tipo} />
        <div>
          <label className="field-label">Descrição</label>
          <textarea name="descricao" defaultValue={lesao.descricao} required rows={2} className="field-input" />
        </div>
        <div>
          <label className="field-label">Tipo</label>
          <div className="flex flex-wrap gap-1.5">
            {FISIOTERAPIA_TIPO_OPTIONS.map((op) => (
              <PilulaTipo key={op.value} label={op.label} selecionado={op.value === tipo} onClick={() => setTipo(op.value)} />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div>
            <label className="field-label">Data de início</label>
            <input type="date" name="dataInicio" defaultValue={lesao.data_inicio ?? ""} className="field-input" />
          </div>
          <div>
            <label className="field-label">Data de fim</label>
            <input type="date" name="dataFim" defaultValue={lesao.data_fim ?? ""} className="field-input" />
          </div>
        </div>
        <div>
          <label className="field-label">Observações</label>
          <textarea name="observacoes" defaultValue={lesao.observacoes ?? ""} rows={2} className="field-input" />
        </div>
        {state.error ? <p className="field-error">{state.error}</p> : null}
        <div className="flex items-center gap-2">
          <SalvarEdicaoButton />
          <button
            type="button"
            onClick={() => {
              setEditando(false);
              setTipo(lesao.tipo);
            }}
            className="btn-secondary text-xs"
          >
            Cancelar
          </button>
        </div>
      </form>
      <div className="mt-2 flex justify-end">
        <DeleteButton errorAction={excluirLesaoBase} id={lesao.id} entityLabel="lesão" />
      </div>
    </div>
  );
}

export function QueixaItemBase({
  atletaId,
  categoria,
  queixa,
}: {
  atletaId: string;
  categoria: string;
  queixa: FisioterapiaQueixaBaseRow;
}) {
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState<FisioterapiaTipo>(queixa.tipo);
  const [state, formAction] = useFormState(atualizarQueixaBase, initialState);

  useEffect(() => {
    if (state.success) setEditando(false);
  }, [state]);

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="group -mx-2 flex w-[calc(100%+1rem)] flex-col items-start rounded-md px-2 py-1 text-left transition hover:bg-neutral-50"
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span className="text-sm font-medium text-neutral-800">{queixa.descricao}</span>
          <span className="shrink-0 text-[11px] font-semibold text-grena opacity-0 transition group-hover:opacity-100">
            Editar
          </span>
        </span>
        <span className="mt-0.5 inline-block rounded-full bg-grena px-2 py-0.5 text-[11px] font-semibold text-white">
          {fisioterapiaTipoLabel(queixa.tipo)}
        </span>
        <span className="mt-0.5 text-xs text-neutral-500">
          {queixa.data ? formatDataBr(queixa.data) : "sem data exata"}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-md border border-grena/30 bg-white p-3">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="atletaId" value={atletaId} />
        <input type="hidden" name="categoria" value={categoria} />
        <input type="hidden" name="queixaId" value={queixa.id} />
        <input type="hidden" name="tipo" value={tipo} />
        <div>
          <label className="field-label">Descrição</label>
          <textarea name="descricao" defaultValue={queixa.descricao} required rows={2} className="field-input" />
        </div>
        <div>
          <label className="field-label">Tipo</label>
          <div className="flex flex-wrap gap-1.5">
            {FISIOTERAPIA_TIPO_OPTIONS.map((op) => (
              <PilulaTipo key={op.value} label={op.label} selecionado={op.value === tipo} onClick={() => setTipo(op.value)} />
            ))}
          </div>
        </div>
        <div>
          <label className="field-label">Data</label>
          <input type="date" name="data" defaultValue={queixa.data ?? ""} className="field-input w-40" />
        </div>
        {state.error ? <p className="field-error">{state.error}</p> : null}
        <div className="flex items-center gap-2">
          <SalvarEdicaoButton />
          <button
            type="button"
            onClick={() => {
              setEditando(false);
              setTipo(queixa.tipo);
            }}
            className="btn-secondary text-xs"
          >
            Cancelar
          </button>
        </div>
      </form>
      <div className="mt-2 flex justify-end">
        <DeleteButton errorAction={excluirQueixaBase} id={queixa.id} entityLabel="queixa" />
      </div>
    </div>
  );
}

export function NovaQueixaFormBase({ atletaId, categoria }: { atletaId: string; categoria: string }) {
  const [state, formAction] = useFormState(registrarQueixaBase, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <details className="card mt-3 p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold text-grena">+ Nova queixa</summary>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="atletaId" value={atletaId} />
        <input type="hidden" name="categoria" value={categoria} />
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

export function NovoAtendimentoFormBase({
  atletaId,
  categoria,
  lesoesAtivas,
}: {
  atletaId: string;
  categoria: string;
  lesoesAtivas: { id: string; descricao: string }[];
}) {
  const [state, formAction] = useFormState(registrarAtendimentoBase, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <details className="card mt-3 p-4">
      <summary className="cursor-pointer select-none text-sm font-semibold text-grena">+ Novo atendimento</summary>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="atletaId" value={atletaId} />
        <input type="hidden" name="categoria" value={categoria} />
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

export function AtendimentoItemBase({
  atletaId,
  categoria,
  atendimento,
  lesoes,
}: {
  atletaId: string;
  categoria: string;
  atendimento: FisioterapiaAtendimentoBaseRow;
  lesoes: { id: string; descricao: string }[];
}) {
  const [editando, setEditando] = useState(false);
  const [state, formAction] = useFormState(atualizarAtendimentoBase, initialState);

  useEffect(() => {
    if (state.success) setEditando(false);
  }, [state]);

  if (!editando) {
    const lesaoVinculada = atendimento.lesao_id ? lesoes.find((l) => l.id === atendimento.lesao_id) : null;
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="group -mx-2 flex w-[calc(100%+1rem)] flex-col items-start rounded-md px-2 py-1 text-left transition hover:bg-neutral-50"
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span className="text-sm font-medium text-neutral-800">
            {atendimento.data ? formatDataBr(atendimento.data) : "Sem data exata"}
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-grena opacity-0 transition group-hover:opacity-100">
            Editar
          </span>
        </span>
        <span className="text-xs text-neutral-500">{atendimento.descricao}</span>
        {lesaoVinculada ? (
          <span className="mt-0.5 text-xs text-neutral-400">Ligado à lesão: {lesaoVinculada.descricao}</span>
        ) : null}
      </button>
    );
  }

  return (
    <div className="rounded-md border border-grena/30 bg-white p-3">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="atletaId" value={atletaId} />
        <input type="hidden" name="categoria" value={categoria} />
        <input type="hidden" name="atendimentoId" value={atendimento.id} />
        <div className="flex flex-wrap gap-2">
          <div>
            <label className="field-label">Data</label>
            <input type="date" name="data" defaultValue={atendimento.data ?? ""} className="field-input" />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="field-label">Ligar a uma lesão (opcional)</label>
            <select name="lesaoId" defaultValue={atendimento.lesao_id ?? ""} className="field-input">
              <option value="">Sessão solta (sem lesão vinculada)</option>
              {lesoes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.descricao}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="field-label">O que foi feito na sessão</label>
          <textarea name="descricao" defaultValue={atendimento.descricao} required rows={2} className="field-input" />
        </div>
        {state.error ? <p className="field-error">{state.error}</p> : null}
        <div className="flex items-center gap-2">
          <SalvarEdicaoButton />
          <button type="button" onClick={() => setEditando(false)} className="btn-secondary text-xs">
            Cancelar
          </button>
        </div>
      </form>
      <div className="mt-2 flex justify-end">
        <DeleteButton errorAction={excluirAtendimentoBase} id={atendimento.id} entityLabel="atendimento" />
      </div>
    </div>
  );
}
