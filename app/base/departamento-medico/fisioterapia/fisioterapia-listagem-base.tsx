"use client";

import { useMemo, useState } from "react";
import { AtletaCard } from "@/components/atletas/atleta-card";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import { fatiasPizza } from "@/lib/futebol/grafico-pizza";
import { CATEGORIAS_BASE, CATEGORIA_BASE_COR } from "@/lib/auth/categorias-base";
import type { AtletaBaseStatus, CategoriaBase } from "@/lib/supabase/types";
import { HistoricoStatusModalBase } from "./historico-status-modal-base";
import type { FisioterapiaAtletaItemBase } from "./page";

/** Mesma cor do indicador "em tratamento" do Profissional (ver `fisioterapia-listagem.tsx`). */
const BORDA_EM_TRATAMENTO = "border-red-500";

// Os 3 status possíveis aqui (a lista já é só `ativo = true` — "dispensado" nunca aparece). Mesmos
// rótulos de `STATUS_LABEL_BASE` em `historico-status-modal-base.tsx`, pra não introduzir um
// segundo nome pro mesmo status na mesma tela. Cores: mesmo verde/vermelho já usados pro par
// apto/não apto em `AtletasResumoFiltros`, mais âmbar pro meio-termo ("Suspenso").
const STATUS_LABEL_PIZZA: Record<Exclude<AtletaBaseStatus, "dispensado">, string> = {
  liberado: "Apto",
  suspenso: "Não apto",
  departamento_medico: "Depto. Médico",
};
const STATUS_COR_PIZZA: Record<Exclude<AtletaBaseStatus, "dispensado">, string> = {
  liberado: "#10B981",
  suspenso: "#F59E0B",
  departamento_medico: "#EF4444",
};
const STATUS_OPCOES_PIZZA = Object.keys(STATUS_LABEL_PIZZA) as Exclude<AtletaBaseStatus, "dispensado">[];

function alternarNoConjunto<T>(atual: Set<T>, valor: T): Set<T> {
  const novo = new Set(atual);
  if (novo.has(valor)) novo.delete(valor);
  else novo.add(valor);
  return novo;
}

/**
 * Grade de cards + busca por nome + filtros de categoria e status da listagem de Fisioterapia
 * (Base) — espelha `fisioterapia-listagem.tsx` (Profissional) na grade de cards, mas com um painel
 * de filtros adicional só aqui (pedido do Mateus, ver docs/superpowers/specs/
 * 2026-10-06-fisioterapia-base-filtros-categoria-status-design.md): Categoria em cartões (mesmo
 * estilo do bloco "Posições" de `AtletasResumoFiltros`, trocando posição por categoria) e Status em
 * pizza + legenda (mesmo estilo da pizza de Contrato, ali mesmo, ou da pizza de Categoria da
 * Assistência Social) — mesma combinação cartão+pizza lado a lado que `AtletasResumoFiltros` já usa
 * pra Posição+Contrato. Os três filtros (categoria, status, busca) são instantâneos no cliente,
 * sobre a lista que o servidor já restringiu às categorias permitidas.
 */
export function FisioterapiaListagemBase({
  atletas,
  podeEditar,
  categoriasPermitidas,
}: {
  atletas: FisioterapiaAtletaItemBase[];
  podeEditar: boolean;
  categoriasPermitidas: CategoriaBase[];
}) {
  const [busca, setBusca] = useState("");
  const [categoriaSel, setCategoriaSel] = useState<Set<CategoriaBase>>(new Set());
  const [statusSel, setStatusSel] = useState<Set<Exclude<AtletaBaseStatus, "dispensado">>>(new Set());
  const buscaNormalizada = busca.trim().toLowerCase();
  const [selecionado, setSelecionado] = useState<FisioterapiaAtletaItemBase | null>(null);

  const contagensCategoria = useMemo(() => {
    const mapa = new Map<CategoriaBase, number>();
    for (const a of atletas) mapa.set(a.categoria, (mapa.get(a.categoria) ?? 0) + 1);
    return mapa;
  }, [atletas]);

  const contagensStatus = useMemo(() => {
    const mapa = new Map<Exclude<AtletaBaseStatus, "dispensado">, number>();
    for (const a of atletas) {
      if (a.status === "dispensado") continue;
      mapa.set(a.status, (mapa.get(a.status) ?? 0) + 1);
    }
    return mapa;
  }, [atletas]);

  const atletasFiltrados = useMemo(
    () =>
      atletas.filter((a) => {
        const combinaCategoria = categoriaSel.size === 0 || categoriaSel.has(a.categoria);
        const combinaStatus = statusSel.size === 0 || (a.status !== "dispensado" && statusSel.has(a.status));
        const combinaBusca =
          !buscaNormalizada ||
          nomeExibido({ apelido: a.apelido, nome_completo: a.nome }).toLowerCase().includes(buscaNormalizada);
        return combinaCategoria && combinaStatus && combinaBusca;
      }),
    [atletas, buscaNormalizada, categoriaSel, statusSel],
  );

  const algumFiltroAtivo = categoriaSel.size > 0 || statusSel.size > 0 || buscaNormalizada.length > 0;

  return (
    <div>
      {atletas.length > 0 ? (
        <div className="card mb-3 grid gap-4 p-4 lg:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Categoria · clique para filtrar (uma ou mais)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS_BASE.filter((cat) => categoriasPermitidas.includes(cat.value)).map((cat) => {
                const count = contagensCategoria.get(cat.value) ?? 0;
                const percentual = atletas.length > 0 ? Math.round((count / atletas.length) * 100) : 0;
                const ativo = categoriaSel.has(cat.value);
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategoriaSel((atual) => alternarNoConjunto(atual, cat.value))}
                    className={`rounded-md border px-2 py-1 text-left transition-colors ${
                      ativo
                        ? "border-grena bg-grena/10 text-grena-escuro"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                    }`}
                  >
                    <p className="flex items-center gap-1 text-[10px] font-bold leading-tight text-neutral-800">
                      <span
                        className="h-2 w-2 shrink-0 rounded-sm"
                        style={{ backgroundColor: CATEGORIA_BASE_COR[cat.value] }}
                        aria-hidden
                      />
                      {cat.label}
                    </p>
                    <p className="whitespace-nowrap text-[9px] font-medium leading-tight text-neutral-500">
                      {count} atleta{count === 1 ? "" : "s"} · {percentual}%
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Status · clique para filtrar
            </p>
            <div className="flex items-center justify-end gap-3">
              <PizzaStatus contagens={contagensStatus} total={atletas.length} selecionados={statusSel} aoClicar={(s) => setStatusSel((atual) => alternarNoConjunto(atual, s))} />
              <div className="flex w-40 shrink-0 flex-col gap-0.5">
                {STATUS_OPCOES_PIZZA.map((status) => {
                  const count = contagensStatus.get(status) ?? 0;
                  const ativo = statusSel.has(status);
                  const percentual = atletas.length > 0 ? Math.round((count / atletas.length) * 100) : 0;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusSel((atual) => alternarNoConjunto(atual, status))}
                      className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-xs transition-colors ${
                        ativo ? "bg-grena/10" : "hover:bg-neutral-50"
                      }`}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: STATUS_COR_PIZZA[status] }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate font-medium text-neutral-700">{STATUS_LABEL_PIZZA[status]}</span>
                      <span className="font-bold tabular-nums text-neutral-800">{count}</span>
                      <span className="w-9 shrink-0 text-right tabular-nums text-neutral-400">{percentual}%</span>
                    </button>
                  );
                })}
              </div>
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
            setStatusSel(new Set());
          }}
          disabled={!algumFiltroAtivo}
          className="text-sm font-semibold text-grena hover:underline disabled:cursor-default disabled:text-neutral-300 disabled:no-underline"
        >
          Limpar filtros
        </button>
      </div>

      {atletasFiltrados.length === 0 ? (
        <p className="mt-6 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
          {atletas.length === 0
            ? "Nenhum atleta ativo cadastrado na Base ainda."
            : "Nenhum atleta encontrado com esses filtros."}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2">
          {atletasFiltrados.map((atleta) => (
            <div key={atleta.id} onClick={(e) => { e.preventDefault(); setSelecionado(atleta); }}>
              <AtletaCard
                atleta={atleta}
                href={atleta.href}
                mostrarCpf={false}
                mostrarContrato={false}
                corBordaExtra={atleta.emTratamento ? BORDA_EM_TRATAMENTO : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {selecionado ? (
        <HistoricoStatusModalBase
          atletaId={selecionado.id}
          nome={nomeExibido({ apelido: selecionado.apelido, nome_completo: selecionado.nome })}
          podeEditar={podeEditar}
          onClose={() => setSelecionado(null)}
        />
      ) : null}
    </div>
  );
}

/** Pizza de composição por status — mesma peça/matemática (`fatiasPizza`) da pizza de Categoria da
 * Assistência Social / Contrato de `AtletasResumoFiltros`, só trocando a dimensão. */
function PizzaStatus({
  contagens,
  total,
  selecionados,
  aoClicar,
}: {
  contagens: Map<Exclude<AtletaBaseStatus, "dispensado">, number>;
  total: number;
  selecionados: Set<Exclude<AtletaBaseStatus, "dispensado">>;
  aoClicar: (status: Exclude<AtletaBaseStatus, "dispensado">) => void;
}) {
  if (total === 0) {
    return (
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-dashed border-neutral-200 text-center text-[10px] text-neutral-400">
        sem atletas
      </div>
    );
  }

  const fatias = fatiasPizza(STATUS_OPCOES_PIZZA.map((status) => ({ chave: status, valor: contagens.get(status) ?? 0 })));

  return (
    <svg viewBox="0 0 36 36" className="h-20 w-20 shrink-0">
      {fatias.map((fatia) => {
        const dimmed = selecionados.size > 0 && !selecionados.has(fatia.chave);
        return (
          <path
            key={fatia.chave}
            d={fatia.path}
            fill={STATUS_COR_PIZZA[fatia.chave]}
            stroke="#EEF0F2"
            strokeWidth="0.5"
            opacity={dimmed ? 0.35 : 1}
            className="cursor-pointer transition-opacity"
            onClick={() => aoClicar(fatia.chave)}
          >
            <title>{`${STATUS_LABEL_PIZZA[fatia.chave]}: ${contagens.get(fatia.chave) ?? 0} (${fatia.percentual}%)`}</title>
          </path>
        );
      })}
    </svg>
  );
}
