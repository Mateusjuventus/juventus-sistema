"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/fields";
import type { OnibusFormState } from "../operacao-actions";

const initialState: OnibusFormState = {};

export interface PessoaOnibus {
  id: string;
  nome: string;
  extra: string;
}

function chave(tipo: "atleta" | "comissao", id: string): string {
  return `${tipo}:${id}`;
}

/** Espelha a seção de `app/jogos/[id]/onibus/onibus-form.tsx` para o Futebol de Base. */
function SecaoPessoas({
  titulo,
  tipo,
  convocados,
  extras,
  todos,
  incluidos,
  onToggle,
  onAdicionar,
  onRemoverExtra,
}: {
  titulo: string;
  tipo: "atleta" | "comissao";
  convocados: PessoaOnibus[];
  extras: PessoaOnibus[];
  todos: PessoaOnibus[];
  incluidos: Record<string, boolean>;
  onToggle: (chave: string) => void;
  onAdicionar: (pessoa: PessoaOnibus) => void;
  onRemoverExtra: (id: string) => void;
}) {
  const presentesIds = new Set([...convocados, ...extras].map((p) => p.id));
  const disponiveis = todos.filter((p) => !presentesIds.has(p.id));

  return (
    <div className="card space-y-3 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-grena">{titulo}</h3>

      {convocados.length === 0 && extras.length === 0 ? (
        <p className="text-sm text-neutral-400">Ninguém convocado ainda.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {convocados.map((p) => {
            const k = chave(tipo, p.id);
            return (
              <li key={k} className="flex items-center justify-between gap-2 py-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={incluidos[k] ?? false}
                    onChange={() => onToggle(k)}
                    className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                  />
                  <span className="text-neutral-800">
                    {p.nome} <span className="text-neutral-400">— {p.extra}</span>
                  </span>
                </label>
              </li>
            );
          })}
          {extras.map((p) => {
            const k = chave(tipo, p.id);
            return (
              <li key={k} className="flex items-center justify-between gap-2 py-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={incluidos[k] ?? false}
                    onChange={() => onToggle(k)}
                    className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                  />
                  <span className="text-neutral-800">
                    {p.nome} <span className="text-neutral-400">— {p.extra}</span>
                  </span>
                  <span className="rounded-full bg-dourado/20 px-2 py-0.5 text-xs text-grena-escuro">
                    Não convocado
                  </span>
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-red-600 hover:underline"
                  onClick={() => onRemoverExtra(p.id)}
                >
                  Remover
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {disponiveis.length > 0 ? (
        <select
          className="field-input"
          value=""
          onChange={(e) => {
            const pessoa = disponiveis.find((p) => p.id === e.target.value);
            if (pessoa) onAdicionar(pessoa);
          }}
        >
          <option value="">+ Adicionar {titulo.toLowerCase()} não convocado(a)...</option>
          {disponiveis.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} — {p.extra}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

export function OnibusFormBase({
  action,
  jogoId,
  atletasConvocados,
  comissaoConvocados,
  atletasTodos,
  comissaoTodos,
  extrasAtletasIniciais,
  extrasComissaoIniciais,
  existeRegistro,
  incluidosIniciais,
  horarioInicial,
}: {
  action: (prevState: OnibusFormState, formData: FormData) => Promise<OnibusFormState>;
  jogoId: string;
  atletasConvocados: PessoaOnibus[];
  comissaoConvocados: PessoaOnibus[];
  atletasTodos: PessoaOnibus[];
  comissaoTodos: PessoaOnibus[];
  extrasAtletasIniciais: PessoaOnibus[];
  extrasComissaoIniciais: PessoaOnibus[];
  existeRegistro: boolean;
  incluidosIniciais: string[];
  horarioInicial: string;
}) {
  const [state, formAction] = useFormState(action, initialState);

  const [extrasAtletas, setExtrasAtletas] = useState<PessoaOnibus[]>(extrasAtletasIniciais);
  const [extrasComissao, setExtrasComissao] = useState<PessoaOnibus[]>(extrasComissaoIniciais);

  const [incluidos, setIncluidos] = useState<Record<string, boolean>>(() => {
    const mapa: Record<string, boolean> = {};
    for (const p of atletasConvocados) {
      const k = chave("atleta", p.id);
      mapa[k] = existeRegistro ? incluidosIniciais.includes(k) : true;
    }
    for (const p of comissaoConvocados) {
      const k = chave("comissao", p.id);
      mapa[k] = existeRegistro ? incluidosIniciais.includes(k) : true;
    }
    for (const p of extrasAtletasIniciais) mapa[chave("atleta", p.id)] = true;
    for (const p of extrasComissaoIniciais) mapa[chave("comissao", p.id)] = true;
    return mapa;
  });

  function toggle(k: string) {
    setIncluidos((atual) => ({ ...atual, [k]: !atual[k] }));
  }

  function adicionarAtleta(pessoa: PessoaOnibus) {
    setExtrasAtletas((atual) => [...atual, pessoa]);
    setIncluidos((atual) => ({ ...atual, [chave("atleta", pessoa.id)]: true }));
  }

  function removerExtraAtleta(id: string) {
    setExtrasAtletas((atual) => atual.filter((p) => p.id !== id));
  }

  function adicionarComissao(pessoa: PessoaOnibus) {
    setExtrasComissao((atual) => [...atual, pessoa]);
    setIncluidos((atual) => ({ ...atual, [chave("comissao", pessoa.id)]: true }));
  }

  function removerExtraComissao(id: string) {
    setExtrasComissao((atual) => atual.filter((p) => p.id !== id));
  }

  const todasPessoas = [
    ...atletasConvocados.map((p) => ({ tipo: "atleta" as const, id: p.id })),
    ...comissaoConvocados.map((p) => ({ tipo: "comissao" as const, id: p.id })),
    ...extrasAtletas.map((p) => ({ tipo: "atleta" as const, id: p.id })),
    ...extrasComissao.map((p) => ({ tipo: "comissao" as const, id: p.id })),
  ];

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="jogoId" value={jogoId} />
      {todasPessoas.map((p) => {
        const k = chave(p.tipo, p.id);
        return incluidos[k] ? (
          <input key={k} type="hidden" name={`vai_${p.tipo}_${p.id}`} value="on" />
        ) : null;
      })}

      {state.success ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Lista de ônibus salva com sucesso.
        </p>
      ) : null}
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <div className="max-w-xs">
        <TextField label="Horário de saída" name="horario" type="time" defaultValue={horarioInicial} />
      </div>

      {atletasConvocados.length === 0 && comissaoConvocados.length === 0 ? (
        <p className="text-sm text-neutral-400">
          Ninguém foi convocado ainda para este jogo. Monte a convocação primeiro.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SecaoPessoas
            titulo="Atletas"
            tipo="atleta"
            convocados={atletasConvocados}
            extras={extrasAtletas}
            todos={atletasTodos}
            incluidos={incluidos}
            onToggle={toggle}
            onAdicionar={adicionarAtleta}
            onRemoverExtra={removerExtraAtleta}
          />
          <SecaoPessoas
            titulo="Comissão Técnica"
            tipo="comissao"
            convocados={comissaoConvocados}
            extras={extrasComissao}
            todos={comissaoTodos}
            incluidos={incluidos}
            onToggle={toggle}
            onAdicionar={adicionarComissao}
            onRemoverExtra={removerExtraComissao}
          />
        </div>
      )}

      <SubmitButton label="Salvar lista de ônibus" />
    </form>
  );
}
