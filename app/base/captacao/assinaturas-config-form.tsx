"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import type { AssinaturasParecerState } from "./actions";

const initialState: AssinaturasParecerState = {};

interface LinhaAssinatura {
  id: number;
  nome: string;
  cargo: string;
}

/**
 * Configuração das assinaturas do Parecer Final de Avaliação — lista que cresce (não um número
 * fixo de campos, diferente das 2 assinaturas fixas do Financeiro), porque o Mateus pediu "3 e se
 * precisar adiciono mais". Mesmo espírito de `CriteriosDesempateField`
 * (app/competicoes/criterios-desempate-field.tsx): estado local só pra controlar quantas linhas
 * aparecem — o valor de cada campo em si é uncontrolled (`defaultValue`), só lido do FormData no
 * momento de salvar. Só visível pro staff (Mateus), dentro de `/base/captacao` — o Treinador nunca
 * vê esta tela.
 */
export function AssinaturasConfigForm({
  id,
  assinaturasIniciais,
  action,
}: {
  id: string;
  assinaturasIniciais: { nome: string; cargo: string }[];
  action: (prevState: AssinaturasParecerState, formData: FormData) => Promise<AssinaturasParecerState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const proximoId = useRef(0);
  const [linhas, setLinhas] = useState<LinhaAssinatura[]>(() =>
    (assinaturasIniciais.length > 0 ? assinaturasIniciais : [{ nome: "", cargo: "" }]).map((a) => ({
      id: proximoId.current++,
      nome: a.nome,
      cargo: a.cargo,
    })),
  );

  function adicionar() {
    setLinhas((atual) => [...atual, { id: proximoId.current++, nome: "", cargo: "" }]);
  }

  function remover(rowId: number) {
    setLinhas((atual) => atual.filter((l) => l.id !== rowId));
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-xs text-neutral-400">Aparecem em todo Parecer Final gerado, na ordem abaixo.</p>

      {linhas.length === 0 ? (
        <p className="text-sm text-neutral-400">Nenhuma assinatura configurada.</p>
      ) : (
        <div className="space-y-2">
          {linhas.map((linha) => (
            <div key={linha.id} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1">
                <label htmlFor={`assinaturaNome-${linha.id}`} className="field-label">
                  Nome
                </label>
                <input
                  id={`assinaturaNome-${linha.id}`}
                  name="assinaturaNome"
                  defaultValue={linha.nome}
                  className="field-input"
                />
              </div>
              <div className="min-w-[180px] flex-1">
                <label htmlFor={`assinaturaCargo-${linha.id}`} className="field-label">
                  Cargo
                </label>
                <input
                  id={`assinaturaCargo-${linha.id}`}
                  name="assinaturaCargo"
                  defaultValue={linha.cargo}
                  className="field-input"
                />
              </div>
              <button
                type="button"
                onClick={() => remover(linha.id)}
                className="btn-secondary btn-sm"
                title="Remover"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={adicionar} className="btn-secondary btn-sm">
        + Adicionar assinatura
      </button>

      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3">
        <SubmitButton label="Salvar assinaturas" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
        {state.success ? <span className="text-xs font-medium text-emerald-700">{state.success}</span> : null}
        {state.error ? <span className="text-xs font-medium text-red-700">{state.error}</span> : null}
      </div>
    </form>
  );
}
