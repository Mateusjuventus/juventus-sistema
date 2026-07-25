"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import type { AtletaBaseRow, ComissaoTecnicaBaseRow } from "@/lib/supabase/types";
import type { ConvocacaoFormState } from "./actions";

const initialState: ConvocacaoFormState = {};

/** Espelha `app/jogos/[id]/convocacao/convocacao-form.tsx` para o Futebol de Base. */
export function ConvocacaoFormBase({
  action,
  jogoId,
  atletas,
  comissao,
  atletaStatusMap,
  comissaoSelecionados,
  capitaoAtletaId,
}: {
  action: (prevState: ConvocacaoFormState, formData: FormData) => Promise<ConvocacaoFormState>;
  jogoId: string;
  atletas: AtletaBaseRow[];
  comissao: ComissaoTecnicaBaseRow[];
  atletaStatusMap: Record<string, "titular" | "reserva">;
  comissaoSelecionados: Set<string>;
  capitaoAtletaId: string | null;
}) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="jogoId" value={jogoId} />

      {state.success ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Convocação salva com sucesso.
        </p>
      ) : null}
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-grena">Atletas</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-neutral-500">
              <tr>
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">Posição</th>
                <th className="py-2">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {atletas.map((a) => (
                <tr key={a.id}>
                  <td className="py-2 pr-3 font-medium text-neutral-800">{a.nome_completo}</td>
                  <td className="py-2 pr-3 text-neutral-500">{a.posicao}</td>
                  <td className="py-2">
                    <select
                      name={`atleta_${a.id}`}
                      defaultValue={atletaStatusMap[a.id] ?? ""}
                      className="field-input"
                    >
                      <option value="">Não convocado</option>
                      <option value="titular">Titular</option>
                      <option value="reserva">Reserva</option>
                    </select>
                  </td>
                </tr>
              ))}
              {atletas.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-neutral-400">
                    Nenhum atleta cadastrado nesta categoria.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="max-w-sm">
          <label htmlFor="capitaoAtletaId" className="field-label">
            Capitão do jogo
          </label>
          <select
            id="capitaoAtletaId"
            name="capitaoAtletaId"
            defaultValue={capitaoAtletaId ?? ""}
            className="field-input"
          >
            <option value="">Nenhum selecionado</option>
            {atletas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome_completo}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-500">
            Precisa ser um atleta marcado como titular ou reserva acima.
          </p>
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-grena">
          Comissão Técnica / Diretoria
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {comissao.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`comissao_${c.id}`}
                defaultChecked={comissaoSelecionados.has(c.id)}
                className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
              />
              <span>
                {c.nome_completo} <span className="text-neutral-400">— {c.funcao}</span>
              </span>
            </label>
          ))}
          {comissao.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhum cadastro encontrado nesta categoria.</p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-3">
        <SubmitButton label="Salvar convocação" />
      </div>
    </form>
  );
}
