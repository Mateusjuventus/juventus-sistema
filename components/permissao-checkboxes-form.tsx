"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";

export interface PermissaoActionState {
  success?: string;
  error?: string;
}

const initialState: PermissaoActionState = {};

/**
 * Um grupo de checkboxes com botão de salvar próprio e feedback de "Salvo!"/erro depois do
 * clique (`useFormState`) — usado tanto nos cards de usuário em `/usuarios` (Departamentos,
 * Módulos, ramificações de Estoque, categorias de Tarefas de outra pessoa) quanto no painel
 * "Personalizar categorias" que cada usuário vê pra si mesmo em `/tarefas`.
 *
 * Sem esse feedback visível, um `<form action={...}>` que só retorna `void` não dava nenhum sinal
 * de que o clique em "Salvar" tinha funcionado — daí a mudança pra `useFormState`.
 *
 * `id` é opcional: nos cards de `/usuarios` identifica QUEM está sendo editado (o master edita
 * outra pessoa, por isso a action recebe o id via campo oculto); no autoatendimento de `/tarefas`
 * não faz sentido (a pessoa só edita a si mesma, a action pega isso da sessão), então some o
 * campo oculto quando não vem `id`.
 */
export function PermissaoCheckboxesForm({
  id,
  fieldName,
  titulo,
  ajuda,
  opcoes,
  valoresIniciais,
  action,
  submitLabel,
  className,
}: {
  id?: string;
  fieldName: string;
  titulo: string;
  ajuda?: string;
  opcoes: readonly { value: string; label: string }[];
  valoresIniciais: string[];
  action: (prevState: PermissaoActionState, formData: FormData) => Promise<PermissaoActionState>;
  submitLabel: string;
  className?: string;
}) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className={className}>
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{titulo}</p>
      {ajuda ? <p className="-mt-1 text-xs text-neutral-400">{ajuda}</p> : null}
      <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {opcoes.map((op) => (
          <label key={op.value} className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name={fieldName}
              value={op.value}
              defaultChecked={valoresIniciais.includes(op.value)}
              className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
            />
            {op.label}
          </label>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <SubmitButton label={submitLabel} pendingLabel="Salvando..." className="btn-secondary btn-sm" />
        {state.success ? <span className="text-xs font-medium text-emerald-700">{state.success}</span> : null}
        {state.error ? <span className="text-xs font-medium text-red-700">{state.error}</span> : null}
      </div>
    </form>
  );
}
