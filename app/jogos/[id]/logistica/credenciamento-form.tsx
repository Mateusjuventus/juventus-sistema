"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import type {
  ComissaoTecnicaRow,
  CredenciamentoCatalogoRow,
  StaffOperacionalComFuncaoRow,
} from "@/lib/supabase/types";
import type { CredenciamentoFormState } from "./actions";

const initialState: CredenciamentoFormState = {};

export interface CredenciamentoAtual {
  pessoaTipo: "comissao" | "staff";
  pessoaId: string;
  catalogoId: string;
  vagaExtra: boolean;
}

export function CredenciamentoForm({
  action,
  jogoId,
  comissao,
  staff,
  catalogo,
  atribuicoesAtuais,
  usoPorCatalogo,
}: {
  action: (prevState: CredenciamentoFormState, formData: FormData) => Promise<CredenciamentoFormState>;
  jogoId: string;
  comissao: ComissaoTecnicaRow[];
  staff: StaffOperacionalComFuncaoRow[];
  catalogo: CredenciamentoCatalogoRow[];
  atribuicoesAtuais: CredenciamentoAtual[];
  usoPorCatalogo: Record<string, number>;
}) {
  const [state, formAction] = useFormState(action, initialState);

  const zonas = Array.from(new Set(catalogo.map((c) => c.zona)));

  const atribuicaoDe = (pessoaTipo: "comissao" | "staff", pessoaId: string) =>
    atribuicoesAtuais.find((a) => a.pessoaTipo === pessoaTipo && a.pessoaId === pessoaId);

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

      {state.success ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Credenciamento salvo com sucesso.
        </p>
      ) : null}
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-grena">Vagas por zona</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {zonas.map((zona) => {
            const cor = catalogo.find((c) => c.zona === zona)?.zona_cor ?? "#a3a3a3";
            return (
              <div key={zona} className="card p-3">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cor }} />
                  {zona}
                </p>
                <div className="space-y-1">
                  {catalogo
                    .filter((c) => c.zona === zona)
                    .map((c) => {
                      const usado = usoPorCatalogo[c.id] ?? 0;
                      const cheio = usado >= c.vagas_totais;
                      return (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span className="text-neutral-600">{c.funcao}</span>
                          <span className={cheio ? "font-semibold text-red-700" : "text-neutral-500"}>
                            {usado}/{c.vagas_totais}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-grena">
          Credenciamento — Comissão Técnica/Diretoria e Staff
        </h3>
        {pessoas.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Ninguém foi convocado ainda para este jogo. Monte a convocação primeiro.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">Zona / Função</th>
                  <th className="py-2">Vaga extra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pessoas.map((p) => {
                  const atual = atribuicaoDe(p.tipo, p.id);
                  return (
                    <tr key={`${p.tipo}-${p.id}`}>
                      <td className="py-2 pr-3 font-medium text-neutral-800">
                        {p.nome} <span className="text-neutral-400">— {p.extra}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          name={`pessoa_${p.tipo}_${p.id}`}
                          defaultValue={atual?.catalogoId ?? ""}
                          className="field-input"
                        >
                          <option value="">Sem credenciamento</option>
                          {zonas.map((zona) => (
                            <optgroup key={zona} label={zona}>
                              {catalogo
                                .filter((c) => c.zona === zona)
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.funcao} ({usoPorCatalogo[c.id] ?? 0}/{c.vagas_totais})
                                  </option>
                                ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      <td className="py-2">
                        <input
                          type="checkbox"
                          name={`vagaExtra_${p.tipo}_${p.id}`}
                          defaultChecked={atual?.vagaExtra ?? false}
                          className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SubmitButton label="Salvar credenciamento" />
    </form>
  );
}
