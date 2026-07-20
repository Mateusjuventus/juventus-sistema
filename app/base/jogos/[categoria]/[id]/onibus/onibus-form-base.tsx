"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import type { AtletaBaseRow, ComissaoTecnicaBaseRow, StaffOperacionalBaseComFuncaoRow } from "@/lib/supabase/types";
import type { OnibusFormState } from "../operacao-actions";

const initialState: OnibusFormState = {};

export interface OnibusInicial {
  horario: string;
  passageiros: { pessoaTipo: "atleta" | "comissao" | "staff"; pessoaId: string }[];
}

/** Espelha `app/jogos/[id]/onibus/onibus-form.tsx` para o Futebol de Base. */
export function OnibusFormBase({
  action,
  jogoId,
  atletas,
  comissao,
  staff,
  onibusIniciais,
}: {
  action: (prevState: OnibusFormState, formData: FormData) => Promise<OnibusFormState>;
  jogoId: string;
  atletas: AtletaBaseRow[];
  comissao: ComissaoTecnicaBaseRow[];
  staff: StaffOperacionalBaseComFuncaoRow[];
  onibusIniciais: OnibusInicial[];
}) {
  const [state, formAction] = useFormState(action, initialState);
  const [onibusList, setOnibusList] = useState<{ horario: string }[]>(
    onibusIniciais.map((o) => ({ horario: o.horario })),
  );

  const defaultOnibusIndex = (pessoaTipo: "atleta" | "comissao" | "staff", pessoaId: string): string => {
    const index = onibusIniciais.findIndex((o) =>
      o.passageiros.some((p) => p.pessoaTipo === pessoaTipo && p.pessoaId === pessoaId),
    );
    return index >= 0 ? String(index) : "";
  };

  function atualizarHorario(index: number, horario: string) {
    setOnibusList((atual) => atual.map((o, i) => (i === index ? { ...o, horario } : o)));
  }

  const pessoas = [
    ...atletas.map((a) => ({ tipo: "atleta" as const, id: a.id, nome: a.nome_completo, extra: a.posicao })),
    ...comissao.map((c) => ({ tipo: "comissao" as const, id: c.id, nome: c.nome_completo, extra: c.funcao })),
    ...staff.map((s) => ({
      tipo: "staff" as const,
      id: s.id,
      nome: s.nome_completo,
      extra: s.funcao?.nome ?? "—",
    })),
  ];

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="jogoId" value={jogoId} />
      <input type="hidden" name="onibusCount" value={onibusList.length} />
      {onibusList.map((o, i) => (
        <span key={i}>
          <input type="hidden" name={`onibus_${i}_numero`} value={i + 1} />
          <input type="hidden" name={`onibus_${i}_horario`} value={o.horario} />
        </span>
      ))}

      {state.success ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Lista de ônibus salva com sucesso.
        </p>
      ) : null}
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-grena">Ônibus</h3>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOnibusList((atual) => [...atual, { horario: "" }])}
            >
              + Adicionar ônibus
            </button>
            {onibusList.length > 0 ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOnibusList((atual) => atual.slice(0, -1))}
              >
                Remover último
              </button>
            ) : null}
          </div>
        </div>

        {onibusList.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum ônibus adicionado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {onibusList.map((o, i) => (
              <div key={i} className="max-w-xs">
                <label className="field-label">Ônibus {i + 1} — horário de saída</label>
                <input
                  type="time"
                  value={o.horario}
                  onChange={(e) => atualizarHorario(i, e.target.value)}
                  className="field-input"
                />
              </div>
            ))}
          </div>
        )}

        {pessoas.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Ninguém foi convocado ainda para este jogo. Monte a convocação primeiro.
          </p>
        ) : onibusList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2">Ônibus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pessoas.map((p) => (
                  <tr key={`${p.tipo}-${p.id}`}>
                    <td className="py-2 pr-3 font-medium text-neutral-800">
                      {p.nome} <span className="text-neutral-400">— {p.extra}</span>
                    </td>
                    <td className="py-2">
                      <select
                        name={`pessoa_${p.tipo}_${p.id}`}
                        defaultValue={defaultOnibusIndex(p.tipo, p.id)}
                        className="field-input"
                      >
                        <option value="">Não vai de ônibus</option>
                        {onibusList.map((_, i) => (
                          <option key={i} value={i}>
                            Ônibus {i + 1}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Adicione ao menos um ônibus para poder distribuir os passageiros.</p>
        )}
      </div>

      <SubmitButton label="Salvar lista de ônibus" />
    </form>
  );
}
