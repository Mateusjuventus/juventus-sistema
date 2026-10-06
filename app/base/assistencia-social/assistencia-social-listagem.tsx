"use client";

import { useMemo, useState } from "react";
import { AtletaCard } from "@/components/atletas/atleta-card";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
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
 * Grade de cards + busca por nome + filtro de categoria em cartões (ver docs/superpowers/specs/
 * 2026-10-05-assistencia-social-e-demandas-design.md, Parte 1, e
 * 2026-10-06-fisioterapia-base-filtros-categoria-status-design.md — pedido do Mateus em 06/10 pra
 * usar aqui o mesmo estilo de cartão por categoria que a Fisioterapia da Base ganhou, no lugar da
 * pizza + legenda que existia antes aqui). Mesmo padrão de busca client-side já usado em
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
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Categoria · clique para filtrar (uma ou mais)
          </p>
          <div className="flex flex-wrap gap-1.5">
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
                  className={`rounded-md border px-2 py-1 text-left transition-colors ${
                    ativo
                      ? "border-grena bg-grena/10 text-grena-escuro"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <p className="flex items-center gap-1 text-[10px] font-bold leading-tight text-neutral-800">
                    <span
                      className="h-2 w-2 shrink-0 rounded-sm"
                      style={{ backgroundColor: CATEGORIA_BASE_COR[value] }}
                      aria-hidden
                    />
                    {label}
                  </p>
                  <p className="whitespace-nowrap text-[9px] font-medium leading-tight text-neutral-500">
                    {count} atleta{count === 1 ? "" : "s"} · {percentual}%
                  </p>
                </button>
              );
            })}
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
