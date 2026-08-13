"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { DeleteButton } from "@/components/delete-button";

/** Mesma forma do `ProgramacaoLinhaFormState` das duas `actions.ts` (Profissional e Base) — o tipo
 * é declarado aqui por estrutura pra este componente servir aos dois departamentos sem importar de
 * um deles. */
interface LinhaFormState {
  error?: string;
  success?: boolean;
}

export interface ProgramacaoItem {
  id: string;
  horario: string;
  atividade: string;
  local: string;
  eh_confronto: boolean;
}

function SalvarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary text-sm" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

/**
 * Uma linha do cronograma da Programação, com edição no lugar: clicando em "Editar", a linha vira
 * um formulário com os mesmos campos do cadastro (horário, atividade, local e, no Dia de Jogo, a
 * marcação de confronto). Antes só existia apagar — corrigir um horário custava refazer a linha.
 *
 * A edição acontece no próprio card em vez de abrir outra tela porque a programação é lida como um
 * bloco: quem ajusta um horário quase sempre está conferindo a sequência inteira, e sair da página
 * perderia esse contexto.
 *
 * Compartilhada por Futebol Profissional e Futebol de Base — cada página passa a sua própria
 * Server Action já com o id da linha embutido (`.bind`).
 */
export function ProgramacaoLinha({
  item,
  confrontoTexto,
  mostrarConfronto,
  acaoAtualizar,
  acaoRemover,
}: {
  item: ProgramacaoItem;
  confrontoTexto: string;
  /** Só a seção Dia de Jogo tem a linha do confronto. */
  mostrarConfronto?: boolean;
  acaoAtualizar: (prevState: LinhaFormState, formData: FormData) => Promise<LinhaFormState>;
  acaoRemover: (formData: FormData) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [state, formAction] = useFormState(acaoAtualizar, {} as LinhaFormState);
  const [ehConfronto, setEhConfronto] = useState(item.eh_confronto);
  const [atividade, setAtividade] = useState(item.atividade);

  // Fecha o formulário quando a gravação dá certo. Se der erro, continua aberto com o erro à vista
  // e o que foi digitado ainda na tela.
  useEffect(() => {
    if (state.success) setEditando(false);
  }, [state]);

  if (!editando) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md bg-neutral-50 px-3 py-2 text-sm">
        <span className="w-24 shrink-0 font-semibold text-grena-escuro">{item.horario}</span>
        <span className="min-w-[160px] flex-1 font-medium text-neutral-800">
          {item.eh_confronto ? confrontoTexto : item.atividade}
        </span>
        <span className="min-w-[120px] flex-1 text-neutral-600">{item.local}</span>
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="rounded-md px-2 py-1 text-xs font-medium text-grena hover:bg-white hover:underline"
        >
          Editar
        </button>
        <DeleteButton action={acaoRemover} id={item.id} entityLabel="item da programação" />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-grena/30 bg-white p-3">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="field-label">Horário</label>
          <input
            type="text"
            name="horario"
            defaultValue={item.horario}
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
            required={!ehConfronto}
            disabled={ehConfronto}
            value={ehConfronto ? confrontoTexto : atividade}
            onChange={(e) => setAtividade(e.target.value)}
            className="field-input disabled:bg-neutral-100 disabled:text-neutral-500"
          />
        </div>

        <div className="min-w-[140px] flex-1">
          <label className="field-label">Local</label>
          <input type="text" name="local" defaultValue={item.local} required className="field-input" />
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

        <SalvarButton />
        <button
          type="button"
          onClick={() => {
            setEditando(false);
            setEhConfronto(item.eh_confronto);
            setAtividade(item.atividade);
          }}
          className="btn-secondary text-sm"
        >
          Cancelar
        </button>
      </form>
      {state.error ? <p className="field-error">{state.error}</p> : null}
    </div>
  );
}
