"use client";

import { useMemo, useState } from "react";
import { AtletaCard, type AtletaCardDados } from "@/components/atletas/atleta-card";
import { ExportDropdown, type ExportOpcao } from "@/components/atletas/export-dropdown";
import {
  CATEGORIA_POSICAO_COR,
  CATEGORIA_POSICAO_SIGLA,
  categoriaDaPosicao,
} from "@/lib/futebol/categoria-posicao";
import { CONTRATO_ATLETA_COR, CONTRATO_ATLETA_LABEL } from "@/lib/futebol/contrato-atleta";
import { atletaPassaFiltro, filtrosParaQueryString, nenhumFiltroAtivo } from "@/lib/futebol/atletas-filtro";
import type { AtletaBaseTipoContrato, CategoriaPosicao } from "@/lib/supabase/types";

const GRUPOS_POSICAO: CategoriaPosicao[] = ["goleiro", "zagueiro", "lateral", "meia", "atacante"];

export interface AtletaResumoItem extends AtletaCardDados {
  href: string;
  /** Valor cru do status (`AtletaStatus`/`AtletaBaseStatus`) — string simples pra este componente
   * servir as duas telas sem depender de qual dos dois enums é o certo aqui. */
  status: string;
}

export interface StatusFiltroOpcao {
  value: string;
  label: string;
}

function alternarNoConjunto<T>(atual: Set<T>, valor: T): Set<T> {
  const novo = new Set(atual);
  if (novo.has(valor)) novo.delete(valor);
  else novo.add(valor);
  return novo;
}

function filtroChipClasse(ativo: boolean): string {
  return `rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
    ativo ? "border-grena bg-grena/10 text-grena-escuro" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
  }`;
}

/**
 * Resumo/filtros de Status, Posições e Contrato + busca instantânea + grade de `AtletaCard` (ver
 * docs/superpowers/specs/2026-09-09-atletas-resumo-filtros-design.md). Recebe a lista JÁ COMPLETA
 * de atletas (sem filtro nenhum aplicado no server) e faz toda a filtragem/contagem no client — as
 * contagens dos três blocos usam sempre a lista completa (não a filtrada), pra os números do resumo
 * não mudarem conforme a pessoa vai clicando filtros.
 */
export function AtletasResumoFiltros({
  atletas,
  statusOptions,
  contratoOptions,
  estatisticaExtra,
  statusOcultoPorPadrao,
  exportar,
}: {
  atletas: AtletaResumoItem[];
  statusOptions: StatusFiltroOpcao[];
  /** 3 tipos no Profissional, 4 na Base (com Iniciação) — nunca os 5 do protótipo inicial, "Formação"
   * não existe no sistema real. */
  contratoOptions: AtletaBaseTipoContrato[];
  /** "Média de idade" só existe hoje em `/atletas` (Profissional) — mostrado como um número solto ao
   * lado do título de Status, sem virar filtro (não é uma categoria pra clicar). */
  estatisticaExtra?: { label: string; valor: string };
  /** "dispensado" na Base — some da lista com nenhum status marcado, só aparece se a pessoa marcar o
   * chip dele explicitamente (ver `atletaPassaFiltro`). Sem valor no Profissional (não existe esse
   * status lá). */
  statusOcultoPorPadrao?: string;
  /** "Exportar para Excel" mora aqui (e não no cabeçalho da página) porque, desde que o filtro virou
   * inteiramente client-side, só quem guarda o estado do filtro (este componente) consegue montar o
   * link já com `?status=...&posicao=...&contrato=...&q=...` embutido (`filtrosParaQueryString`) —
   * a exportação sai com exatamente o que está na tela, e não a lista inteira sem filtro nenhum.
   * `extras` são outras opções de exportação que NÃO dependem do filtro atual (ex.: "Exportar
   * relação" da Base, que tem seu próprio formulário de categoria/status/colunas) — viram itens fixos
   * no mesmo dropdown. */
  exportar?: { excelHref: string; extras?: ExportOpcao[] };
}) {
  const [busca, setBusca] = useState("");
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set());
  const [posicaoSel, setPosicaoSel] = useState<Set<CategoriaPosicao>>(new Set());
  const [contratoSel, setContratoSel] = useState<Set<AtletaBaseTipoContrato>>(new Set());

  const contagensStatus = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const a of atletas) mapa.set(a.status, (mapa.get(a.status) ?? 0) + 1);
    return mapa;
  }, [atletas]);

  const contagensPosicao = useMemo(() => {
    const mapa = new Map<CategoriaPosicao, number>();
    for (const a of atletas) {
      const categoria = categoriaDaPosicao(a.posicao);
      if (categoria) mapa.set(categoria, (mapa.get(categoria) ?? 0) + 1);
    }
    return mapa;
  }, [atletas]);

  const contagensContrato = useMemo(() => {
    const mapa = new Map<AtletaBaseTipoContrato, number>();
    for (const a of atletas) {
      if (a.tipoContrato) mapa.set(a.tipoContrato, (mapa.get(a.tipoContrato) ?? 0) + 1);
    }
    return mapa;
  }, [atletas]);

  const totalComContrato = useMemo(() => atletas.filter((a) => a.tipoContrato).length, [atletas]);

  // Conta como se nenhum status estivesse marcado — mesma regra de `statusOcultoPorPadrao` (o
  // "Dispensado" da Base não entra no total "de vitrine", só quando a pessoa marca o chip dele).
  const totalPadrao = useMemo(
    () => atletas.filter((a) => !(statusOcultoPorPadrao && a.status === statusOcultoPorPadrao)).length,
    [atletas, statusOcultoPorPadrao],
  );

  const buscaNormalizada = busca.trim().toLowerCase();
  const filtros = useMemo(
    () => ({ status: statusSel, posicoes: posicaoSel, contratos: contratoSel, buscaNormalizada }),
    [statusSel, posicaoSel, contratoSel, buscaNormalizada],
  );

  const filtrados = useMemo(
    () => atletas.filter((a) => atletaPassaFiltro(a, filtros, statusOcultoPorPadrao)),
    [atletas, filtros, statusOcultoPorPadrao],
  );

  const algumFiltroAtivo = !nenhumFiltroAtivo(filtros);

  const excelHrefComFiltros = useMemo(() => {
    if (!exportar) return undefined;
    const query = filtrosParaQueryString(filtros);
    return query ? `${exportar.excelHref}?${query}` : exportar.excelHref;
  }, [exportar, filtros]);

  function limparFiltros() {
    setStatusSel(new Set());
    setPosicaoSel(new Set());
    setContratoSel(new Set());
    setBusca("");
  }

  return (
    <div>
      <div className="card grid gap-4 p-4 lg:grid-cols-3">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Status · clique para filtrar
            </p>
            {estatisticaExtra ? (
              <p className="whitespace-nowrap text-xs text-neutral-500">
                {estatisticaExtra.label}: <strong className="text-neutral-700">{estatisticaExtra.valor}</strong>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setStatusSel(new Set())}
              className={filtroChipClasse(statusSel.size === 0)}
            >
              <span className="font-bold tabular-nums">{totalPadrao}</span> Total
            </button>
            {statusOptions.map((opcao) => (
              <button
                key={opcao.value}
                type="button"
                onClick={() => setStatusSel((atual) => alternarNoConjunto(atual, opcao.value))}
                className={filtroChipClasse(statusSel.has(opcao.value))}
              >
                <span className="font-bold tabular-nums">{contagensStatus.get(opcao.value) ?? 0}</span>{" "}
                {opcao.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Posições · clique para filtrar
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {GRUPOS_POSICAO.map((grupo) => (
              <button
                key={grupo}
                type="button"
                onClick={() => setPosicaoSel((atual) => alternarNoConjunto(atual, grupo))}
                className={filtroChipClasse(posicaoSel.has(grupo))}
              >
                <span className={`inline-block rounded px-1 text-[10px] font-bold ${CATEGORIA_POSICAO_COR[grupo]}`}>
                  {CATEGORIA_POSICAO_SIGLA[grupo]}
                </span>
                <p className="mt-1 font-bold tabular-nums">{contagensPosicao.get(grupo) ?? 0}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Contrato · clique para filtrar
          </p>
          <div className="flex items-center gap-3">
            <DonutContrato
              contratoOptions={contratoOptions}
              contagens={contagensContrato}
              total={totalComContrato}
              selecionados={contratoSel}
              aoClicar={(tipo) => setContratoSel((atual) => alternarNoConjunto(atual, tipo))}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {contratoOptions.map((tipo) => {
                const count = contagensContrato.get(tipo) ?? 0;
                const ativo = contratoSel.has(tipo);
                const percentual = totalComContrato > 0 ? Math.round((count / totalComContrato) * 100) : 0;
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setContratoSel((atual) => alternarNoConjunto(atual, tipo))}
                    className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-xs transition-colors ${
                      ativo ? "bg-grena/10" : "hover:bg-neutral-50"
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-sm"
                      style={{ backgroundColor: CONTRATO_ATLETA_COR[tipo] }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-neutral-700">
                      {CONTRATO_ATLETA_LABEL[tipo]}
                    </span>
                    <span className="font-bold tabular-nums text-neutral-800">{count}</span>
                    <span className="w-9 shrink-0 text-right tabular-nums text-neutral-400">{percentual}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-3 flex flex-wrap items-center gap-3 p-4">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar atleta por nome..."
          className="field-input min-w-0 flex-1"
        />
        {excelHrefComFiltros ? (
          exportar?.extras && exportar.extras.length > 0 ? (
            <ExportDropdown
              opcoes={[{ label: "Exportar para Excel", href: excelHrefComFiltros }, ...exportar.extras]}
            />
          ) : (
            <a href={excelHrefComFiltros} className="btn-secondary">
              Exportar para Excel
            </a>
          )
        ) : null}
        <button
          type="button"
          onClick={limparFiltros}
          disabled={!algumFiltroAtivo}
          className="text-sm font-semibold text-grena hover:underline disabled:cursor-default disabled:text-neutral-300 disabled:no-underline"
        >
          Limpar filtros
        </button>
      </div>

      <p className="mt-3 text-sm text-neutral-500">
        <strong className="text-neutral-700">{filtrados.length}</strong> atleta{filtrados.length === 1 ? "" : "s"}
        {algumFiltroAtivo ? " encontrado" + (filtrados.length === 1 ? "" : "s") + " com os filtros atuais" : ""}
      </p>

      {filtrados.length === 0 ? (
        <div className="card mt-3 p-8 text-center text-neutral-400">
          Nenhum atleta encontrado com essa combinação de filtros.
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-3">
          {filtrados.map((atleta) => (
            <AtletaCard key={atleta.id} atleta={atleta} href={atleta.href} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Donut simples via `stroke-dasharray` (raio 15.915 => circunferência ≈ 100, então a porcentagem
 * de cada tipo vira o valor do dasharray direto, sem calcular circunferência de verdade — truque
 * clássico de gráfico de rosca em SVG puro). Cada fatia também é clicável (mesmo filtro da
 * legenda ao lado) — a legenda em botões de verdade continua sendo o jeito acessível por teclado de
 * fazer a mesma coisa. */
function DonutContrato({
  contratoOptions,
  contagens,
  total,
  selecionados,
  aoClicar,
}: {
  contratoOptions: AtletaBaseTipoContrato[];
  contagens: Map<AtletaBaseTipoContrato, number>;
  total: number;
  selecionados: Set<AtletaBaseTipoContrato>;
  aoClicar: (tipo: AtletaBaseTipoContrato) => void;
}) {
  if (total === 0) {
    return (
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-dashed border-neutral-200 text-center text-[10px] text-neutral-400">
        sem contrato
      </div>
    );
  }

  let acumulado = 0;
  return (
    <svg viewBox="0 0 36 36" className="h-20 w-20 shrink-0 -rotate-90">
      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#EEF0F2" strokeWidth="6" />
      {contratoOptions.map((tipo) => {
        const count = contagens.get(tipo) ?? 0;
        if (count === 0) return null;
        const pct = (count / total) * 100;
        const offsetInicial = acumulado;
        acumulado += pct;
        const dimmed = selecionados.size > 0 && !selecionados.has(tipo);
        return (
          <circle
            key={tipo}
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            stroke={CONTRATO_ATLETA_COR[tipo]}
            strokeWidth="6"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeDashoffset={-offsetInicial}
            opacity={dimmed ? 0.35 : 1}
            className="cursor-pointer transition-opacity"
            onClick={() => aoClicar(tipo)}
          >
            <title>{`${CONTRATO_ATLETA_LABEL[tipo]}: ${count}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}
