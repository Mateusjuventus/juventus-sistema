"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ImportarSumulaState } from "../../actions";

/**
 * Formulários de importação da súmula da FPF por link (aba Súmulas dos Grupos). São Client
 * Components só por causa do feedback: a versão anterior era um form "e esquece", e quando o
 * download do PDF falhava a tela não dizia NADA (o Mateus clicava e não acontecia nada). Agora a
 * ação devolve `{ erro | sucesso, avisos }` e o resultado aparece embaixo do botão.
 */

function BotaoImportar({ label, pendenteLabel }: { label: string; pendenteLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary px-3 py-1.5 text-sm" disabled={pending}>
      {pending ? pendenteLabel : label}
    </button>
  );
}

function Retorno({ state }: { state: ImportarSumulaState }) {
  if (!state.erro && !state.sucesso) return null;
  return (
    <div className="w-full">
      {state.erro ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{state.erro}</p>
      ) : null}
      {state.sucesso ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{state.sucesso}</p>
      ) : null}
      {(state.avisos ?? []).length > 0 ? (
        <ul className="mt-1 space-y-0.5">
          {(state.avisos ?? []).map((aviso, i) => (
            <li key={i} className="text-[11px] text-amber-700">
              ⚠ {aviso}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ImportarResultadoForm({
  grupoId,
  equipes,
  action,
}: {
  grupoId: string;
  equipes: string[];
  action: (prevState: ImportarSumulaState, formData: FormData) => Promise<ImportarSumulaState>;
}) {
  const [state, formAction] = useFormState(action, {} as ImportarSumulaState);

  return (
    <form
      action={formAction}
      className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-dourado/30 bg-dourado/5 p-3"
    >
      <input type="hidden" name="grupoId" value={grupoId} />
      <div className="min-w-[240px] flex-1">
        <label className="field-label">Link do PDF da súmula (FPF) — importa placar e cartões</label>
        <input
          name="sumulaLink"
          type="url"
          required
          placeholder="https://conteudo.fpf.org.br/sumulas/..."
          className="field-input py-1 text-xs"
        />
      </div>
      <div>
        <label className="field-label">Mandante</label>
        <select name="equipeCasa" className="field-input w-36 py-1 text-xs" required>
          {equipes.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">Visitante</label>
        <select
          name="equipeFora"
          className="field-input w-36 py-1 text-xs"
          defaultValue={equipes[1] ?? equipes[0]}
          required
        >
          {equipes.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <BotaoImportar label="Importar da súmula" pendenteLabel="Lendo o PDF..." />
      <p className="w-full text-[11px] text-neutral-500">
        Mesmo leitor da aba Súmula do jogo do Juventus. Se o link falhar ou o nome das equipes não bater, use
        o lançamento manual abaixo.
      </p>
      <Retorno state={state} />
    </form>
  );
}

export function ImportarCartoesAdversarioForm({
  vinculoId,
  adversario,
  linkInicial,
  action,
}: {
  vinculoId: string;
  adversario: string;
  linkInicial: string;
  action: (prevState: ImportarSumulaState, formData: FormData) => Promise<ImportarSumulaState>;
}) {
  const [state, formAction] = useFormState(action, {} as ImportarSumulaState);

  return (
    <form action={formAction} className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
      <input type="hidden" name="vinculoId" value={vinculoId} />
      <input type="hidden" name="adversario" value={adversario} />
      <input
        name="sumulaLink"
        type="url"
        defaultValue={linkInicial}
        placeholder="Cole o link do PDF da súmula da FPF"
        className="field-input min-w-[260px] flex-1 py-1 text-xs"
      />
      <BotaoImportar label="Importar cartões do adversário" pendenteLabel="Lendo o PDF..." />
      <Retorno state={state} />
    </form>
  );
}
