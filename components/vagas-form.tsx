"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { StaffFuncaoCatalogoRow } from "@/lib/supabase/types";
/** Estado devolvido pelas Server Actions dos dois departamentos — declarado por estrutura pra este
 * componente servir ao Profissional e à Base sem importar de nenhum dos dois. */
export interface VagasFormState {
  error?: string;
  success?: boolean;
}

function SalvarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvando..." : "Salvar vagas"}
    </button>
  );
}

interface Linha {
  chave: string;
  funcaoId: string;
  quantidade: string;
  horario: string;
}

export interface FuncaoInicial {
  funcaoId: string;
  quantidade: number;
  horario: string | null;
  /** Quantas pessoas já entraram nessa função — a linha não pode ser removida se houver alguém. */
  inscritos: number;
}

/**
 * Define quais funções o jogo precisa e quantas vagas cada uma tem. As funções vêm do catálogo do
 * Staff Operacional (não são digitadas), porque é justamente esse mesmo campo que o cadastro de
 * cada pessoa aponta — é o que permite o link público saber, sozinho, qual vaga é de quem.
 *
 * O horário por função é opcional e sobrescreve o horário geral: gandula costuma chegar depois da
 * segurança, e essa é a primeira pergunta de quem confirma.
 */
export function VagasForm({
  action,
  funcoes,
  funcoesIniciais,
  horarioInicial,
  localInicial,
  observacoesIniciais,
}: {
  action: (prevState: VagasFormState, formData: FormData) => Promise<VagasFormState>;
  funcoes: StaffFuncaoCatalogoRow[];
  funcoesIniciais: FuncaoInicial[];
  horarioInicial: string;
  localInicial: string;
  observacoesIniciais: string;
}) {
  const [state, formAction] = useFormState(action, {} as VagasFormState);
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    funcoesIniciais.length > 0
      ? funcoesIniciais.map((f, i) => ({
          chave: `inicial-${i}`,
          funcaoId: f.funcaoId,
          quantidade: String(f.quantidade),
          horario: f.horario ?? "",
        }))
      : [{ chave: "nova-0", funcaoId: "", quantidade: "1", horario: "" }],
  );

  const inscritosPorFuncao = new Map(funcoesIniciais.map((f) => [f.funcaoId, f.inscritos]));

  const atualizar = (chave: string, campo: keyof Omit<Linha, "chave">, valor: string) =>
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)));

  const total = linhas.reduce((soma, l) => {
    const n = Number(l.quantidade);
    return soma + (Number.isFinite(n) && n > 0 && l.funcaoId ? n : 0);
  }, 0);

  return (
    <form action={formAction} className="card space-y-5 p-5">
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.success ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">Vagas salvas.</p>
      ) : null}

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-grena-escuro">Funções e quantidade</h3>
        <p className="mt-1 text-xs text-neutral-400">
          A função vem do cadastro de cada pessoa — quem é gandula só consegue pegar vaga de gandula.
        </p>

        <div className="mt-3 space-y-2">
          {linhas.map((linha, i) => {
            const inscritos = inscritosPorFuncao.get(linha.funcaoId) ?? 0;
            return (
              <div key={linha.chave} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[180px] flex-1">
                  {i === 0 ? <label className="field-label">Função</label> : null}
                  <select
                    name="funcaoId"
                    className="field-input"
                    value={linha.funcaoId}
                    onChange={(e) => atualizar(linha.chave, "funcaoId", e.target.value)}
                  >
                    <option value="">— escolher —</option>
                    {funcoes.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  {i === 0 ? <label className="field-label">Vagas</label> : null}
                  <input
                    name="quantidade"
                    type="number"
                    min="1"
                    step="1"
                    className="field-input"
                    value={linha.quantidade}
                    onChange={(e) => atualizar(linha.chave, "quantidade", e.target.value)}
                  />
                </div>
                <div className="w-32">
                  {i === 0 ? <label className="field-label">Chegar às</label> : null}
                  <input
                    name="horarioFuncao"
                    className="field-input"
                    placeholder="opcional"
                    value={linha.horario}
                    onChange={(e) => atualizar(linha.chave, "horario", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  disabled={inscritos > 0}
                  title={
                    inscritos > 0
                      ? `${inscritos} pessoa(s) já pegaram vaga nesta função — remova-as antes de tirar a função`
                      : "Remover função"
                  }
                  onClick={() =>
                    setLinhas((atual) => (atual.length > 1 ? atual.filter((l) => l.chave !== linha.chave) : atual))
                  }
                  className="mb-1 rounded px-2 py-1 text-sm text-neutral-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:text-neutral-200 disabled:hover:bg-transparent"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() =>
              setLinhas((atual) => [
                ...atual,
                { chave: `nova-${atual.length}-${Date.now()}`, funcaoId: "", quantidade: "1", horario: "" },
              ])
            }
            className="btn-secondary text-sm"
          >
            + Adicionar função
          </button>
          <p className="text-sm text-neutral-600">
            Total: <span className="font-bold text-grena-escuro">{total} vaga{total === 1 ? "" : "s"}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 border-t border-linha pt-4 sm:grid-cols-2">
        <div>
          <label htmlFor="horarioApresentacao" className="field-label">
            Horário de apresentação (padrão)
          </label>
          <input
            id="horarioApresentacao"
            name="horarioApresentacao"
            className="field-input"
            placeholder="Ex.: 12h30"
            defaultValue={horarioInicial}
          />
        </div>
        <div>
          <label htmlFor="localApresentacao" className="field-label">
            Local de apresentação
          </label>
          <input
            id="localApresentacao"
            name="localApresentacao"
            className="field-input"
            placeholder="Ex.: Portão 3 — Rua Javari, 117"
            defaultValue={localInicial}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="observacoes" className="field-label">
            Observações (aparecem no link)
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={2}
            className="field-input"
            placeholder="Ex.: levar uniforme preto; almoço por conta do clube"
            defaultValue={observacoesIniciais}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <SalvarButton />
      </div>
    </form>
  );
}
