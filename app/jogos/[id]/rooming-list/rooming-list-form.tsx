"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/fields";
import type { ComissaoTecnicaRow, StaffOperacionalComFuncaoRow, TipoQuarto } from "@/lib/supabase/types";
import type { RoomingListFormState } from "../operacao-actions";

const initialState: RoomingListFormState = {};

export interface QuartoInicial {
  tipo: TipoQuarto;
  ocupantes: { pessoaTipo: "comissao" | "staff"; pessoaId: string }[];
}

/**
 * Formulário de Rooming List de um jogo. Quartos só podem ser adicionados ou o último removido
 * (nunca um do meio) — evita que remover um quarto embaralhe a atribuição de pessoas nos quartos
 * anteriores, já que a posição na lista é o identificador enviado ao servidor.
 */
export function RoomingListForm({
  action,
  jogoId,
  mandante,
  comissao,
  staff,
  hotelNomeInicial,
  hotelEnderecoInicial,
  checkinInicial,
  checkoutInicial,
  quartosIniciais,
}: {
  action: (prevState: RoomingListFormState, formData: FormData) => Promise<RoomingListFormState>;
  jogoId: string;
  mandante: boolean;
  comissao: ComissaoTecnicaRow[];
  staff: StaffOperacionalComFuncaoRow[];
  hotelNomeInicial: string;
  hotelEnderecoInicial: string;
  checkinInicial: string;
  checkoutInicial: string;
  quartosIniciais: QuartoInicial[];
}) {
  const [state, formAction] = useFormState(action, initialState);
  const [quartos, setQuartos] = useState<{ tipo: TipoQuarto }[]>(
    quartosIniciais.map((q) => ({ tipo: q.tipo })),
  );

  const defaultQuartoIndex = (pessoaTipo: "comissao" | "staff", pessoaId: string): string => {
    const index = quartosIniciais.findIndex((q) =>
      q.ocupantes.some((o) => o.pessoaTipo === pessoaTipo && o.pessoaId === pessoaId),
    );
    return index >= 0 ? String(index) : "";
  };

  const pessoas = [
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
      <input type="hidden" name="quartosCount" value={quartos.length} />
      {quartos.map((q, i) => (
        <input key={i} type="hidden" name={`quarto_${i}_tipo`} value={q.tipo} />
      ))}

      {!mandante ? (
        <p className="rounded-md bg-dourado/10 px-3 py-2 text-xs text-grena-escuro">
          Este jogo é fora — a rooming list normalmente se aplica aqui.
        </p>
      ) : (
        <p className="rounded-md bg-neutral-100 px-3 py-2 text-xs text-neutral-600">
          Rooming list normalmente é usada em jogos fora. Este jogo é em casa, mas os campos continuam
          disponíveis caso precise.
        </p>
      )}

      {state.success ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Rooming list salva com sucesso.
        </p>
      ) : null}
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Hotel" name="hotelNome" defaultValue={hotelNomeInicial} />
        <TextField label="Endereço do hotel" name="hotelEndereco" defaultValue={hotelEnderecoInicial} />
        <TextField label="Check-in" name="checkin" type="date" defaultValue={checkinInicial} />
        <TextField label="Check-out" name="checkout" type="date" defaultValue={checkoutInicial} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-grena">Quartos</h3>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setQuartos((atual) => [...atual, { tipo: "single" }])}
            >
              + Quarto single
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setQuartos((atual) => [...atual, { tipo: "duplo" }])}
            >
              + Quarto duplo
            </button>
            {quartos.length > 0 ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setQuartos((atual) => atual.slice(0, -1))}
              >
                Remover último
              </button>
            ) : null}
          </div>
        </div>

        {quartos.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum quarto adicionado ainda.</p>
        ) : null}

        {pessoas.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Ninguém foi convocado ainda para este jogo. Monte a convocação primeiro.
          </p>
        ) : quartos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2">Quarto</th>
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
                        defaultValue={defaultQuartoIndex(p.tipo, p.id)}
                        className="field-input"
                      >
                        <option value="">Sem quarto</option>
                        {quartos.map((q, i) => (
                          <option key={i} value={i}>
                            Quarto {i + 1} — {q.tipo === "single" ? "Single" : "Duplo"}
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
          <p className="text-sm text-neutral-400">Adicione ao menos um quarto para poder distribuir as pessoas.</p>
        )}
      </div>

      <SubmitButton label="Salvar rooming list" />
    </form>
  );
}
