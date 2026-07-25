"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/fields";
import type { AtletaBaseRow, ComissaoTecnicaBaseRow, PessoaTipoRooming, TipoQuarto } from "@/lib/supabase/types";
import type { RoomingListFormState } from "../operacao-actions";

const initialState: RoomingListFormState = {};

const TIPO_QUARTO_LABEL: Record<TipoQuarto, string> = { single: "Single", duplo: "Duplo", triplo: "Triplo" };
const LIMITE_POR_TIPO_QUARTO: Record<TipoQuarto, number> = { single: 1, duplo: 2, triplo: 3 };
const TIPO_PESSOA_LABEL: Record<PessoaTipoRooming, string> = { atleta: "Atleta", comissao: "Comissão", staff: "Staff" };

export interface QuartoInicial {
  tipo: TipoQuarto;
  numeroApartamento?: string | null;
  ocupantes: { pessoaTipo: PessoaTipoRooming; pessoaId: string }[];
}

interface PessoaOpcao {
  tipo: PessoaTipoRooming;
  id: string;
  nome: string;
  extra: string;
}

/** Um quarto no estado do formulário. `id` é estável (não muda quando o quarto é reordenado),
 * diferente da posição no array — usado como `key` do card pra o React mover o cartão inteiro
 * (inclusive o texto já digitado no campo de apartamento) junto com a reordenação, em vez de deixar
 * o valor "para trás" na posição antiga. */
interface QuartoState {
  id: string;
  tipo: TipoQuarto;
  numeroApartamento: string;
}

function chavePessoa(tipo: PessoaTipoRooming, id: string): string {
  return `${tipo}:${id}`;
}

/**
 * Espelha `app/jogos/[id]/rooming-list/rooming-list-form.tsx` para o Futebol de Base — organizado
 * por QUARTO (cada quarto é um cartão com quem já está nele e um jeito de adicionar/remover
 * pessoas direto ali), em vez de uma tabela só com todo mundo e um menu "Quarto" por pessoa. As
 * setas ▲▼ em cada card permitem reordenar os quartos manualmente (ex.: por hierarquia de função
 * na Comissão Técnica) — essa ordem é a que sai no PDF pra Comissão Técnica, que não tem nenhuma
 * ordenação automática.
 */
export function RoomingListFormBase({
  action,
  jogoId,
  mandante,
  atletas,
  comissao,
  hotelNomeInicial,
  hotelEnderecoInicial,
  checkinInicial,
  checkoutInicial,
  quartosIniciais,
}: {
  action: (prevState: RoomingListFormState, formData: FormData) => Promise<RoomingListFormState>;
  jogoId: string;
  mandante: boolean;
  atletas: AtletaBaseRow[];
  comissao: ComissaoTecnicaBaseRow[];
  hotelNomeInicial: string;
  hotelEnderecoInicial: string;
  checkinInicial: string;
  checkoutInicial: string;
  quartosIniciais: QuartoInicial[];
}) {
  const [state, formAction] = useFormState(action, initialState);
  const [quartos, setQuartos] = useState<QuartoState[]>(() =>
    quartosIniciais.map((q, i) => ({
      id: `inicial-${i}`,
      tipo: q.tipo,
      numeroApartamento: q.numeroApartamento ?? "",
    })),
  );

  const pessoas: PessoaOpcao[] = [
    ...atletas.map((a) => ({ tipo: "atleta" as const, id: a.id, nome: a.nome_completo, extra: a.posicao })),
    ...comissao.map((c) => ({ tipo: "comissao" as const, id: c.id, nome: c.nome_completo, extra: c.funcao })),
  ];

  const [atribuicoes, setAtribuicoes] = useState<Record<string, number | null>>(() => {
    const mapa: Record<string, number | null> = {};
    for (const p of pessoas) {
      const index = quartosIniciais.findIndex((q) =>
        q.ocupantes.some((o) => o.pessoaTipo === p.tipo && o.pessoaId === p.id),
      );
      mapa[chavePessoa(p.tipo, p.id)] = index >= 0 ? index : null;
    }
    return mapa;
  });

  function atribuir(chave: string, quartoIndex: number | null) {
    setAtribuicoes((atual) => ({ ...atual, [chave]: quartoIndex }));
  }

  function adicionarQuarto(tipo: TipoQuarto) {
    setQuartos((atual) => [...atual, { id: crypto.randomUUID(), tipo, numeroApartamento: "" }]);
  }

  function removerUltimoQuarto() {
    const removidoIndex = quartos.length - 1;
    setQuartos((atual) => atual.slice(0, -1));
    setAtribuicoes((atual) => {
      const copia = { ...atual };
      for (const chave of Object.keys(copia)) {
        if (copia[chave] === removidoIndex) copia[chave] = null;
      }
      return copia;
    });
  }

  function atualizarApartamento(index: number, valor: string) {
    setQuartos((atual) => atual.map((q, i) => (i === index ? { ...q, numeroApartamento: valor } : q)));
  }

  /** Move um quarto uma posição pra cima (-1) ou pra baixo (+1) — troca de lugar com o vizinho.
   * A ordem dos quartos é o que decide a ordem "livre" da Comissão Técnica no PDF, então isso é a
   * forma de organizar manualmente essa ordem (ex.: por hierarquia de função). Atletas continuam
   * podendo ser ordenados por apartamento direto na hora de gerar o PDF, independente disso. */
  function moverQuarto(index: number, direcao: -1 | 1) {
    const alvo = index + direcao;
    if (alvo < 0 || alvo >= quartos.length) return;
    setQuartos((atual) => {
      const copia = [...atual];
      [copia[index], copia[alvo]] = [copia[alvo], copia[index]];
      return copia;
    });
    setAtribuicoes((atual) => {
      const copia = { ...atual };
      for (const chave of Object.keys(copia)) {
        if (copia[chave] === index) copia[chave] = alvo;
        else if (copia[chave] === alvo) copia[chave] = index;
      }
      return copia;
    });
  }

  const semQuarto = pessoas.filter((p) => atribuicoes[chavePessoa(p.tipo, p.id)] == null);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="jogoId" value={jogoId} />
      <input type="hidden" name="quartosCount" value={quartos.length} />
      {quartos.map((q, i) => (
        <input key={q.id} type="hidden" name={`quarto_${i}_tipo`} value={q.tipo} />
      ))}
      {pessoas.map((p) => {
        const chave = chavePessoa(p.tipo, p.id);
        return (
          <input
            key={chave}
            type="hidden"
            name={`pessoa_${p.tipo}_${p.id}`}
            value={atribuicoes[chave] ?? ""}
          />
        );
      })}

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
            <button type="button" className="btn-secondary" onClick={() => adicionarQuarto("single")}>
              + Quarto single
            </button>
            <button type="button" className="btn-secondary" onClick={() => adicionarQuarto("duplo")}>
              + Quarto duplo
            </button>
            <button type="button" className="btn-secondary" onClick={() => adicionarQuarto("triplo")}>
              + Quarto triplo
            </button>
            {quartos.length > 0 ? (
              <button type="button" className="btn-secondary" onClick={removerUltimoQuarto}>
                Remover último
              </button>
            ) : null}
          </div>
        </div>

        {quartos.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum quarto adicionado ainda.</p>
        ) : pessoas.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Ninguém foi convocado ainda para este jogo. Monte a convocação primeiro.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {quartos.map((q, i) => {
                const capacidade = LIMITE_POR_TIPO_QUARTO[q.tipo];
                const ocupantes = pessoas.filter((p) => atribuicoes[chavePessoa(p.tipo, p.id)] === i);
                const cheio = ocupantes.length >= capacidade;
                return (
                  <div key={q.id} className="card space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-grena-escuro">
                        Quarto {i + 1} — {TIPO_QUARTO_LABEL[q.tipo]}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${cheio ? "font-semibold text-grena" : "text-neutral-400"}`}>
                          {ocupantes.length}/{capacidade}
                        </span>
                        <div className="flex gap-0.5">
                          <button
                            type="button"
                            disabled={i === 0}
                            onClick={() => moverQuarto(i, -1)}
                            aria-label="Mover quarto para cima"
                            title="Mover para cima"
                            className="rounded border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={i === quartos.length - 1}
                            onClick={() => moverQuarto(i, 1)}
                            aria-label="Mover quarto para baixo"
                            title="Mover para baixo"
                            className="rounded border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor={`quarto_${i}_numero_apartamento`} className="field-label">
                        Apartamento
                      </label>
                      <input
                        id={`quarto_${i}_numero_apartamento`}
                        name={`quarto_${i}_numero_apartamento`}
                        value={q.numeroApartamento}
                        onChange={(e) => atualizarApartamento(i, e.target.value)}
                        placeholder="Preencher quando o hotel confirmar"
                        className="field-input"
                      />
                    </div>

                    {ocupantes.length === 0 ? (
                      <p className="text-xs text-neutral-400">Nenhuma pessoa neste quarto ainda.</p>
                    ) : (
                      <ul className="space-y-1">
                        {ocupantes.map((p) => (
                          <li
                            key={chavePessoa(p.tipo, p.id)}
                            className="flex items-center justify-between gap-2 rounded-md bg-neutral-50 px-2 py-1 text-sm"
                          >
                            <span className="text-neutral-800">
                              {p.nome} <span className="text-neutral-400">— {TIPO_PESSOA_LABEL[p.tipo]}</span>
                            </span>
                            <button
                              type="button"
                              className="text-xs font-semibold text-red-600 hover:underline"
                              onClick={() => atribuir(chavePessoa(p.tipo, p.id), null)}
                            >
                              Remover
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {!cheio && semQuarto.length > 0 ? (
                      <select
                        className="field-input"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) atribuir(e.target.value, i);
                        }}
                      >
                        <option value="">+ Adicionar pessoa...</option>
                        {semQuarto.map((p) => (
                          <option key={chavePessoa(p.tipo, p.id)} value={chavePessoa(p.tipo, p.id)}>
                            {p.nome} — {TIPO_PESSOA_LABEL[p.tipo]}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Sem quarto ({semQuarto.length})
              </h4>
              {semQuarto.length === 0 ? (
                <p className="text-xs text-neutral-400">Todo mundo já tem quarto.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {semQuarto.map((p) => (
                    <span
                      key={chavePessoa(p.tipo, p.id)}
                      className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600"
                    >
                      {p.nome} <span className="text-neutral-400">— {TIPO_PESSOA_LABEL[p.tipo]}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <SubmitButton label="Salvar rooming list" />
    </form>
  );
}
