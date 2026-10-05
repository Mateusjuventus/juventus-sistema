"use client";

import { useMemo, useState } from "react";
import { AtletaCard } from "@/components/atletas/atleta-card";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import { fatiasPizza } from "@/lib/futebol/grafico-pizza";
import {
  CATEGORIAS_BASE,
  CATEGORIA_BASE_COR,
  type CategoriaBase,
} from "@/lib/auth/categorias-base";
import type { AssistenciaSocialAtletaItem } from "./page";

function alternarNoConjunto<T>(atual: Set<T>, valor: T): Set<T> {
  const novo = new Set(atual);
  if (novo.has(valor)) novo.delete(valor);
  else novo.add(valor);
  return novo;
}

/**
 * Grade de cards + busca por nome + filtro/gráfico de categoria (ver docs/superpowers/specs/
 * 2026-10-05-assistencia-social-e-demandas-design.md, Parte 1 — pedido do Mateus em 05/10: "a tela
 * da assistência social precisa dos atletas separados por categoria... coloque um filtro de
 * categoria... e ao lado um gráfico desse [o de Contrato em /base/atletas] mas com a quantidade
 * das categorias e uma quantidade total"). Mesma peça (pizza + legenda clicável, ver
 * `PizzaCategoria` abaixo) e mesmo padrão de busca client-side já usado em
 * `fisioterapia-listagem.tsx`. Diferente da Fisioterapia, aqui o clique navega direto pra ficha
 * (`href` do próprio `AtletaCard`, `as="link"` padrão) — não há modal intermediário, porque não
 * existe aqui um resumo rápido equivalente ao "Histórico de Status" que justifique um.
 */
export function AssistenciaSocialListagem({ atletas }: { atletas: AssistenciaSocialAtletaItem[] }) {
  const [busca, setBusca] = useState("");
  const [categoriaSel, setCategoriaSel] = useState<Set<CategoriaBase>>(new Set());
  const buscaNormalizada = busca.trim().toLowerCase();

  const contagensCategoria = useMemo(() => {
    const mapa = new Map<CategoriaBase, number>();
    for (const a of atletas) {
      mapa.set(a.categoria as CategoriaBase, (mapa.get(a.categoria as CategoriaBase) ?? 0) + 1);
    }
    return mapa;
  }, [atletas]);

  const atletasFiltrados = useMemo(
    () =>
      atletas.filter((a) => {
        if (categoriaSel.size > 0 && !categoriaSel.has(a.categoria as CategoriaBase)) return false;
        if (buscaNormalizada) {
          return nomeExibido({ apelido: a.apelido, nome_completo: a.nome }).toLowerCase().includes(buscaNormalizada);
        }
        return true;
      }),
    [atletas, categoriaSel, buscaNormalizada],
  );

  const algumFiltroAtivo = categoriaSel.size > 0 || buscaNormalizada.length > 0;

  return (
    <div>
      {atletas.length > 0 ? (
        <div className="card mb-3 p-4">
          <p className="mb-1.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Categoria · clique para filtrar
          </p>
          <div className="flex items-center justify-end gap-3">
            <PizzaCategoria
              contagens={contagensCategoria}
              total={atletas.length}
              selecionadas={categoriaSel}
              aoClicar={(cat) => setCategoriaSel((atual) => alternarNoConjunto(atual, cat))}
            />
            <div className="flex w-40 shrink-0 flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setCategoriaSel(new Set())}
                className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-xs transition-colors ${
                  categoriaSel.size === 0 ? "bg-grena/10" : "hover:bg-neutral-50"
                }`}
              >
                <span className="min-w-0 flex-1 truncate font-bold text-neutral-800">Total</span>
                <span className="font-bold tabular-nums text-neutral-800">{atletas.length}</span>
              </button>
              {CATEGORIAS_BASE.map(({ value, label }) => {
                const count = contagensCategoria.get(value) ?? 0;
                if (count === 0) return null;
                const ativo = categoriaSel.has(value);
                const percentual = Math.round((count / atletas.length) * 100);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCategoriaSel((atual) => alternarNoConjunto(atual, value))}
                    className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-xs transition-colors ${
                      ativo ? "bg-grena/10" : "hover:bg-neutral-50"
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-sm"
                      style={{ backgroundColor: CATEGORIA_BASE_COR[value] }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-neutral-700">{label}</span>
                    <span className="font-bold tabular-nums text-neutral-800">{count}</span>
                    <span className="w-9 shrink-0 text-right tabular-nums text-neutral-400">{percentual}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar atleta pelo nome..."
          className="field-input max-w-sm"
        />
        <button
          type="button"
          onClick={() => {
            setBusca("");
            setCategoriaSel(new Set());
          }}
          disabled={!algumFiltroAtivo}
          className="text-sm font-semibold text-grena hover:underline disabled:cursor-default disabled:text-neutral-300 disabled:no-underline"
        >
          Limpar filtros
        </button>
      </div>

      {atletasFiltrados.length === 0 ? (
        <p className="mt-6 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
          {atletas.length === 0 ? "Nenhum atleta ativo cadastrado na Base ainda." : "Nenhum atleta encontrado com esses filtros."}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2">
          {atletasFiltrados.map((atleta) => (
            <AtletaCard key={atleta.id} atleta={atleta} href={atleta.href} mostrarCpf={false} mostrarContrato={false} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Pizza de composição por categoria — mesma peça/matemática (`fatiasPizza`) da pizza de Contrato
 * em `AtletasResumoFiltros`, só trocando a dimensão (categoria em vez de tipo de contrato). */
function PizzaCategoria({
  contagens,
  total,
  selecionadas,
  aoClicar,
}: {
  contagens: Map<CategoriaBase, number>;
  total: number;
  selecionadas: Set<CategoriaBase>;
  aoClicar: (categoria: CategoriaBase) => void;
}) {
  if (total === 0) {
    return (
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-dashed border-neutral-200 text-center text-[10px] text-neutral-400">
        sem atletas
      </div>
    );
  }

  const fatias = fatiasPizza(
    CATEGORIAS_BASE.map(({ value }) => ({ chave: value, valor: contagens.get(value) ?? 0 })),
  );

  return (
    <svg viewBox="0 0 36 36" className="h-20 w-20 shrink-0">
      {fatias.map((fatia) => {
        const dimmed = selecionadas.size > 0 && !selecionadas.has(fatia.chave);
        return (
          <path
            key={fatia.chave}
            d={fatia.path}
            fill={CATEGORIA_BASE_COR[fatia.chave]}
            stroke="#EEF0F2"
            strokeWidth="0.5"
            opacity={dimmed ? 0.35 : 1}
            className="cursor-pointer transition-opacity"
            onClick={() => aoClicar(fatia.chave)}
          >
            <title>{`${fatia.chave}: ${contagens.get(fatia.chave) ?? 0} (${fatia.percentual}%)`}</title>
          </path>
        );
      })}
    </svg>
  );
}
