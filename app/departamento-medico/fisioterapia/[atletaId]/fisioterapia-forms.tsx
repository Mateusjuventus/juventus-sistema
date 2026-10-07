"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { DeleteButton } from "@/components/delete-button";
import { FieldGroup, SelectField, TextAreaField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import {
  FISIOTERAPIA_STATUS_DIA_COR,
  FISIOTERAPIA_STATUS_DIA_LABEL,
  FISIOTERAPIA_STATUS_DIA_OPTIONS,
  FISIOTERAPIA_TIPO_OPTIONS,
  diasAfastados,
  fisioterapiaTipoLabel,
} from "@/lib/futebol/fisioterapia";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import type { FisioterapiaAtendimentoRow, FisioterapiaLesaoRow, FisioterapiaQueixaRow, FisioterapiaTipo } from "@/lib/supabase/types";
import {
  atualizarAtendimento,
  atualizarLesao,
  atualizarQueixa,
  encerrarLesao,
  excluirAtendimento,
  excluirLesao,
  excluirQueixa,
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
function SalvarEdicaoButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary text-xs" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

/** Pílula de uma opção de tipo dentro do formulário de edição — preenchida (grena) quando é a
 * escolhida no momento, contorno quando não é. Só troca o estado local do formulário (`onTipo`); o
 * submit em si continua sendo o botão "Salvar" do formulário inteiro. */
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

/** Uma lesão da ficha, com edição no lugar: passando o mouse por cima ela fica destacada como um
 * card clicável (com "Editar" aparecendo), e clicando ela vira um formulário com TODOS os campos —
 * descrição, tipo, datas e observações — não só o tipo. Mesmo princípio de edição-no-lugar já usado
 * na Programação (`ProgramacaoLinha`): a correção acontece ali mesmo, sem abrir outra tela nem
 * apagar e relançar. Pedido explícito do Mateus: "quero que... clicar ele abre pra editar". */
export function LesaoItem({
  atletaId,
  lesao,
  hojeStr,
}: {
  atletaId: string;
  lesao: FisioterapiaLesaoRow;
  hojeStr: string;
}) {
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState<FisioterapiaTipo>(lesao.tipo);
  const [state, formAction] = useFormState(atualizarLesao, initialState);

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
          <span className="mt-1 text-xs text-neutral-400">Histórico anterior ao sistema — sem data exata.</span>
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
      {/* `DeleteButton` fica fora do `<form>` acima de propósito — ele é o próprio um `<form>` por
       * dentro (ver `components/delete-button.tsx`), e `<form>` dentro de `<form>` não é válido. */}
      <div className="mt-2 flex justify-end">
        <DeleteButton errorAction={excluirLesao} id={lesao.id} entityLabel="lesão" />
      </div>
    </div>
  );
}

/** Mesma ideia de `LesaoItem`, pras Queixas — sem datas de início/fim nem observações, que não
 * existem nesse registro (só descrição, tipo e data). */
export function QueixaItem({
  atletaId,
  queixa,
}: {
  atletaId: string;
  queixa: FisioterapiaQueixaRow;
}) {
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState<FisioterapiaTipo>(queixa.tipo);
  const [state, formAction] = useFormState(atualizarQueixa, initialState);

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
          {queixa.data ? formatDataBr(queixa.data) : "histórico, sem data exata"}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-md border border-grena/30 bg-white p-3">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="atletaId" value={atletaId} />
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
        <DeleteButton errorAction={excluirQueixa} id={queixa.id} entityLabel="queixa" />
      </div>
    </div>
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

/** Etiqueta colorida do status do dia (Manutenção/Tratamento/Reavaliação) — mesmo estilo visual do
 * Modelo A de referência que o Mateus mandou (ver docs/superpowers/specs/
 * 2026-10-07-relatorio-dia-fisioterapia-design.md). `null` não renderiza nada (atendimento sem
 * status, o caso mais comum fora do Lançamento do dia). */
export function EtiquetaStatusDia({ status }: { status: FisioterapiaAtendimentoRow["status_dia"] }) {
  if (!status) return null;
  return (
    <span
      className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
      style={{ backgroundColor: FISIOTERAPIA_STATUS_DIA_COR[status] }}
    >
      {FISIOTERAPIA_STATUS_DIA_LABEL[status]}
    </span>
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
        <SelectField label="Status do dia (opcional)" name="statusDia" defaultValue="">
          <option value="">Sem status</option>
          {FISIOTERAPIA_STATUS_DIA_OPTIONS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </SelectField>
        <TextAreaField label="O que foi feito na sessão" name="descricao" error={errors.descricao} required rows={2} />
        {state.error || state.success ? <Feedback state={state} /> : null}
        <SubmitButton label="Salvar atendimento" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
      </form>
    </details>
  );
}

/** Mesma ideia de `QueixaItem`, pros Atendimentos — antes só dava pra criar, sem jeito de corrigir
 * ou apagar um já lançado (pedido do Mateus em 2026-10-01). O vínculo com lesão aceita qualquer
 * lesão do atleta (não só as "em andamento", diferente do formulário de criação) pra não perder o
 * vínculo de um atendimento antigo ligado a uma lesão que já foi encerrada. */
export function AtendimentoItem({
  atletaId,
  atendimento,
  lesoes,
}: {
  atletaId: string;
  atendimento: FisioterapiaAtendimentoRow;
  lesoes: { id: string; descricao: string }[];
}) {
  const [editando, setEditando] = useState(false);
  const [state, formAction] = useFormState(atualizarAtendimento, initialState);

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
            {atendimento.data ? formatDataBr(atendimento.data) : "Histórico, sem data exata"}
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-grena opacity-0 transition group-hover:opacity-100">
            Editar
          </span>
        </span>
        <span className="text-xs text-neutral-500">{atendimento.descricao}</span>
        <EtiquetaStatusDia status={atendimento.status_dia} />
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
          <label className="field-label">Status do dia (opcional)</label>
          <select name="statusDia" defaultValue={atendimento.status_dia ?? ""} className="field-input">
            <option value="">Sem status</option>
            {FISIOTERAPIA_STATUS_DIA_OPTIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
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
        <DeleteButton errorAction={excluirAtendimento} id={atendimento.id} entityLabel="atendimento" />
      </div>
    </div>
  );
}
