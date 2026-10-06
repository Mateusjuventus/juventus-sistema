"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { ModalShell } from "@/components/programacao/modal";
import { SelectField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { calcularLinhaDoTempoBase, type LinhaHistoricoComDiasBase } from "@/lib/futebol/status-historico-base";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import { hojeBrasilia } from "@/lib/data-brasil";
import type { AtletaBaseStatus } from "@/lib/supabase/types";
import {
  buscarHistoricoStatusBase,
  editarLancamentoStatusBase,
  lancarStatusManualBase,
  type HistoricoStatusFormStateBase,
} from "./[atletaId]/actions";

/** Mesmos 4 rótulos já usados em outras telas que exibem `AtletaBaseStatus` (ex.: `app/base/
 * atletas/[categoria]/page.tsx`) — o sistema não tem uma constante única compartilhada pra isso;
 * cada tela que precisa define o próprio mapa local, e este segue o mesmo padrão. */
const STATUS_LABEL_BASE: Record<AtletaBaseStatus, string> = {
  liberado: "Apto",
  suspenso: "Não apto",
  departamento_medico: "Depto. Médico",
  dispensado: "Dispensado",
};

const STATUS_OPTIONS: { value: AtletaBaseStatus; label: string }[] = [
  { value: "liberado", label: STATUS_LABEL_BASE.liberado },
  { value: "suspenso", label: STATUS_LABEL_BASE.suspenso },
  { value: "departamento_medico", label: STATUS_LABEL_BASE.departamento_medico },
  { value: "dispensado", label: STATUS_LABEL_BASE.dispensado },
];

const initialState: HistoricoStatusFormStateBase = {};

function Feedback({ state }: { state: HistoricoStatusFormStateBase }) {
  if (state.error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state.success)
    return <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</p>;
  return null;
}

/** Formulário de "+ Novo lançamento" — status + data, mesma permissão de editar a Fisioterapia da
 * Base. Espelha `NovoLancamentoForm` (Profissional, ver `historico-status-modal.tsx`). */
function NovoLancamentoForm({ atletaId, onSalvo }: { atletaId: string; onSalvo: () => void }) {
  const [state, formAction] = useFormState(lancarStatusManualBase, initialState);
  const [aberto, setAberto] = useState(false);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.success) {
      setAberto(false);
      onSalvo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="btn-secondary btn-sm">
        + Novo lançamento
      </button>
    );
  }

  return (
    <form action={formAction} className="card space-y-3 p-4">
      <input type="hidden" name="atletaId" value={atletaId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField label="Status" name="status" error={errors.status} required>
          <option value="">Selecione</option>
          {STATUS_OPTIONS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </SelectField>
        <TextField label="Data" name="data" type="date" defaultValue={hojeBrasilia()} error={errors.data} required />
      </div>
      {state.error ? <Feedback state={state} /> : null}
      <div className="flex gap-2">
        <SubmitButton label="Salvar" pendingLabel="Salvando..." className="btn-primary btn-sm" />
        <button type="button" onClick={() => setAberto(false)} className="btn-secondary btn-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Uma linha da linha do tempo — mesma ideia de `LinhaHistorico` (Profissional). */
function LinhaHistorico({
  linha,
  atletaId,
  podeEditar,
  onSalvo,
}: {
  linha: LinhaHistoricoComDiasBase;
  atletaId: string;
  podeEditar: boolean;
  onSalvo: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [state, formAction] = useFormState(editarLancamentoStatusBase, initialState);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.success) {
      setEditando(false);
      onSalvo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  if (editando) {
    return (
      <form action={formAction} className="card space-y-3 p-3">
        <input type="hidden" name="historicoId" value={linha.id} />
        <input type="hidden" name="atletaId" value={atletaId} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField label="Status" name="status" defaultValue={linha.status} error={errors.status} required>
            {STATUS_OPTIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </SelectField>
          <TextField label="Data" name="data" type="date" defaultValue={linha.data} error={errors.data} required />
        </div>
        {state.error ? <Feedback state={state} /> : null}
        <div className="flex gap-2">
          <SubmitButton label="Salvar" pendingLabel="Salvando..." className="btn-primary btn-sm" />
          <button type="button" onClick={() => setEditando(false)} className="btn-secondary btn-sm">
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-linha px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-grena-escuro">
          {STATUS_LABEL_BASE[linha.status]}
          <span className="ml-2 font-normal text-neutral-500">
            {formatDataBr(linha.data)} · {linha.dias} {linha.dias === 1 ? "dia" : "dias"}
          </span>
        </p>
        <p className="truncate text-xs text-neutral-400">Lançado por {linha.criado_por_nome ?? "—"}</p>
      </div>
      {podeEditar ? (
        <button
          type="button"
          onClick={() => setEditando(true)}
          aria-label="Editar lançamento"
          className="shrink-0 text-neutral-400 transition-colors hover:text-grena"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

/**
 * Modal "Histórico de Status" (Futebol de Base) — espelha `HistoricoStatusModal` (Profissional),
 * com os 4 valores de `AtletaBaseStatus` em vez de 3. Aberto ao clicar num atleta na listagem da
 * Fisioterapia da Base. Ver docs/superpowers/specs/2026-10-06-fisioterapia-base-design.md.
 */
export function HistoricoStatusModalBase({
  atletaId,
  nome,
  podeEditar,
  onClose,
}: {
  atletaId: string;
  nome: string;
  podeEditar: boolean;
  onClose: () => void;
}) {
  const [linhas, setLinhas] = useState<LinhaHistoricoComDiasBase[] | null>(null);

  function recarregar() {
    buscarHistoricoStatusBase(atletaId).then((historico) => {
      setLinhas(calcularLinhaDoTempoBase(historico, hojeBrasilia()));
    });
  }

  useEffect(() => {
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atletaId]);

  const statusAtual = linhas && linhas.length > 0 ? linhas[0].status : null;

  return (
    <ModalShell
      titulo="Histórico de Status"
      subtitulo={nome}
      onClose={onClose}
      footer={
        <Link
          href={`/base/departamento-medico/fisioterapia/${atletaId}`}
          className="text-sm font-medium text-grena hover:underline"
        >
          Ver ficha completa →
        </Link>
      }
    >
      <div className="space-y-4">
        {statusAtual ? (
          <p className="text-sm text-neutral-600">
            Status atual: <span className="font-semibold text-grena-escuro">{STATUS_LABEL_BASE[statusAtual]}</span>
          </p>
        ) : null}

        {linhas === null ? (
          <p className="text-sm text-neutral-400">Carregando...</p>
        ) : linhas.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum lançamento ainda.</p>
        ) : (
          <div className="space-y-2">
            {linhas.map((linha) => (
              <LinhaHistorico
                key={linha.id}
                linha={linha}
                atletaId={atletaId}
                podeEditar={podeEditar}
                onSalvo={recarregar}
              />
            ))}
          </div>
        )}

        {podeEditar ? <NovoLancamentoForm atletaId={atletaId} onSalvo={recarregar} /> : null}
      </div>
    </ModalShell>
  );
}
