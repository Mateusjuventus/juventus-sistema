"use client";

import { useMemo, useState } from "react";
import { AtletaCard, type AtletaCardDados } from "@/components/atletas/atleta-card";
import { ExportColunasModal } from "@/components/atletas/export-colunas-modal";
import { ExportDropdown, type ExportOpcao } from "@/components/atletas/export-dropdown";
import { CONTRATO_ATLETA_COR, CONTRATO_ATLETA_LABEL } from "@/lib/futebol/contrato-atleta";
import { fatiasPizza } from "@/lib/futebol/grafico-pizza";
import { atletaPassaFiltro, filtrosParaQueryString, nenhumFiltroAtivo } from "@/lib/futebol/atletas-filtro";
import { ATLETA_POSICAO_OPTIONS } from "@/lib/validation/schemas";
import type { AtletaBaseTipoContrato } from "@/lib/supabase/types";

/** "Apto" aqui é uma leitura simples do status pra dar uma noção rápida de saúde do elenco por
 * posição (bloco de Posições) — não é o filtro de Status em si (esse continua com os rótulos reais:
 * Liberado/Suspenso/Departamento Médico/Dispensado). Só "liberado" conta como apto; qualquer outro
 * status (incluindo dispensado, quando "Mostrar inativos" está ligado) conta como não apto. */
function ehStatusApto(status: string): boolean {
  return status === "liberado";
}

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
  /** "Exportar para Excel"/"Exportar PDF" moram aqui (e não no cabeçalho da página) porque, desde
   * que o filtro virou inteiramente client-side, só quem guarda o estado do filtro (este componente)
   * consegue montar o link já com `?status=...&posicao=...&contrato=...&q=...` embutido
   * (`filtrosParaQueryString`) — a exportação sai com exatamente o que está na tela, e não a lista
   * inteira sem filtro nenhum. `pdfHref` é opcional só por retrocompatibilidade de teste; as duas
   * páginas reais sempre passam os dois. `extras` são outras opções de exportação que NÃO dependem
   * do filtro atual (ex.: "Exportar relação" da Base, que tem seu próprio formulário de categoria/
   * status/colunas) — viram itens fixos no mesmo dropdown. */
  exportar?: { excelHref: string; pdfHref?: string; extras?: ExportOpcao[] };
}) {
  const [busca, setBusca] = useState("");
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set());
  const [posicaoSel, setPosicaoSel] = useState<Set<string>>(new Set());
  const [contratoSel, setContratoSel] = useState<Set<AtletaBaseTipoContrato>>(new Set());
  // Só tem efeito quando `statusOcultoPorPadrao` existe (Base) — ver checkbox "Mostrar inativos"
  // mais abaixo. Ligado, desliga o "esconder por padrão" sem precisar marcar o chip de Status.
  const [mostrarInativos, setMostrarInativos] = useState(false);
  // Abre o modal de escolha de colunas (ver `ExportColunasModal`) ao clicar em "Exportar para
  // Excel" — a exportação em si só acontece quando a pessoa confirma no modal.
  const [exportModalAberto, setExportModalAberto] = useState(false);

  const statusOcultoEfetivo = mostrarInativos ? undefined : statusOcultoPorPadrao;

  const contagensStatus = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const a of atletas) mapa.set(a.status, (mapa.get(a.status) ?? 0) + 1);
    return mapa;
  }, [atletas]);

  // Detalhe por posição real (uma das 9 de `ATLETA_POSICAO_OPTIONS`), incluindo a leitura simples
  // de apto/não apto pedida pelo Mateus — sempre sobre o "elenco de vitrine" (mesma regra de
  // `statusOcultoPorPadrao`/`totalPadrao`: dispensado não entra aqui, ligado ou não o "Mostrar
  // inativos", porque esse número é sobre quem está de fato disponível, não sobre a listagem atual).
  const contagensPosicao = useMemo(() => {
    const mapa = new Map<string, { total: number; apto: number; naoApto: number }>();
    for (const a of atletas) {
      if (statusOcultoPorPadrao && a.status === statusOcultoPorPadrao) continue;
      const atual = mapa.get(a.posicao) ?? { total: 0, apto: 0, naoApto: 0 };
      atual.total += 1;
      if (ehStatusApto(a.status)) atual.apto += 1;
      else atual.naoApto += 1;
      mapa.set(a.posicao, atual);
    }
    return mapa;
  }, [atletas, statusOcultoPorPadrao]);

  const contagensContrato = useMemo(() => {
    const mapa = new Map<AtletaBaseTipoContrato, number>();
    for (const a of atletas) {
      if (a.tipoContrato) mapa.set(a.tipoContrato, (mapa.get(a.tipoContrato) ?? 0) + 1);
    }
    return mapa;
  }, [atletas]);

  const totalComContrato = useMemo(() => atletas.filter((a) => a.tipoContrato).length, [atletas]);

  // Conta como se nenhum status estivesse marcado — mesma regra de `statusOcultoEfetivo` (o
  // "Dispensado" da Base não entra no total "de vitrine", a não ser que a pessoa marque o chip dele
  // ou ligue "Mostrar inativos").
  const totalPadrao = useMemo(
    () => atletas.filter((a) => !(statusOcultoEfetivo && a.status === statusOcultoEfetivo)).length,
    [atletas, statusOcultoEfetivo],
  );

  const buscaNormalizada = busca.trim().toLowerCase();
  const filtros = useMemo(
    () => ({ status: statusSel, posicoes: posicaoSel, contratos: contratoSel, buscaNormalizada }),
    [statusSel, posicaoSel, contratoSel, buscaNormalizada],
  );

  const filtrados = useMemo(
    () => atletas.filter((a) => atletaPassaFiltro(a, filtros, statusOcultoEfetivo)),
    [atletas, filtros, statusOcultoEfetivo],
  );

  const algumFiltroAtivo = !nenhumFiltroAtivo(filtros) || mostrarInativos;

  const excelHrefComFiltros = useMemo(() => {
    if (!exportar) return undefined;
    const query = filtrosParaQueryString(filtros, { mostrarInativos });
    return query ? `${exportar.excelHref}?${query}` : exportar.excelHref;
  }, [exportar, filtros, mostrarInativos]);

  const pdfHrefComFiltros = useMemo(() => {
    if (!exportar?.pdfHref) return undefined;
    const query = filtrosParaQueryString(filtros, { mostrarInativos });
    return query ? `${exportar.pdfHref}?${query}` : exportar.pdfHref;
  }, [exportar, filtros, mostrarInativos]);

  function limparFiltros() {
    setStatusSel(new Set());
    setPosicaoSel(new Set());
    setContratoSel(new Set());
    setBusca("");
    setMostrarInativos(false);
  }

  return (
    <div>
      <div className="card grid gap-4 p-4 lg:grid-cols-2">
        {/* Status e Posições dividem a mesma coluna, um embaixo do outro — Posições ficou pequeno
            demais (cada chip com sigla colorida + número grande) pra ganhar uma coluna própria de
            verdade; empilhado abaixo do Status sobra bem mais espaço horizontal pro bloco de
            Contrato ao lado (pedido do Mateus em 2026-09-10, depois de ver os 9 chips ocupando
            uma coluna inteira). */}
        <div className="flex flex-col gap-3">
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
            {statusOcultoPorPadrao ? (
              <label className="mt-2 flex w-fit items-center gap-1.5 text-xs font-medium text-neutral-500">
                <input
                  type="checkbox"
                  checked={mostrarInativos}
                  onChange={(e) => setMostrarInativos(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-neutral-300 text-grena focus:ring-grena"
                />
                Mostrar inativos ({contagensStatus.get(statusOcultoPorPadrao) ?? 0} dispensados)
              </label>
            ) : null}
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Posições · clique para filtrar (uma ou mais)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ATLETA_POSICAO_OPTIONS.map((posicao) => {
                const detalhe = contagensPosicao.get(posicao);
                const apto = detalhe?.apto ?? 0;
                const naoApto = detalhe?.naoApto ?? 0;
                return (
                  <button
                    key={posicao}
                    type="button"
                    onClick={() => setPosicaoSel((atual) => alternarNoConjunto(atual, posicao))}
                    className={filtroChipClasse(posicaoSel.has(posicao))}
                  >
                    <p className="text-[11px] font-bold text-neutral-800">{posicao}</p>
                    {detalhe ? (
                      <p className="mt-0.5 whitespace-nowrap text-[10px] font-medium">
                        <span className="text-emerald-600">
                          {apto} apto{apto === 1 ? "" : "s"}
                        </span>
                        <span className="text-neutral-400"> · </span>
                        <span className="text-red-500">
                          {naoApto} não apto{naoApto === 1 ? "" : "s"}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[10px] text-neutral-400">sem cadastro</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Contrato · clique para filtrar
          </p>
          <div className="flex items-center gap-3">
            <PizzaContrato
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
          <ExportDropdown
            opcoes={[
              { label: "Exportar para Excel", onClick: () => setExportModalAberto(true) },
              ...(pdfHrefComFiltros ? [{ label: "Exportar PDF", href: pdfHrefComFiltros }] : []),
              ...(exportar?.extras ?? []),
            ]}
          />
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

      {exportModalAberto && excelHrefComFiltros ? (
        <ExportColunasModal hrefBase={excelHrefComFiltros} onClose={() => setExportModalAberto(false)} />
      ) : null}
    </div>
  );
}

/** Pizza cheia de verdade (sem buraco no meio) via `fatiasPizza` — igual ao artefato original que o
 * Mateus mandou como referência, no lugar do donut anterior (`stroke-dasharray` num círculo vazado).
 * Cada fatia é um `<path>` clicável (mesmo filtro da legenda ao lado) com uma fina borda na cor de
 * fundo da página separando as fatias, pra não parecerem uma peça só quando duas cores são
 * parecidas — a legenda em botões de verdade continua sendo o jeito acessível por teclado de fazer a
 * mesma coisa. */
function PizzaContrato({
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

  const fatias = fatiasPizza(contratoOptions.map((tipo) => ({ chave: tipo, valor: contagens.get(tipo) ?? 0 })));

  return (
    <svg viewBox="0 0 36 36" className="h-20 w-20 shrink-0">
      {fatias.map((fatia) => {
        const dimmed = selecionados.size > 0 && !selecionados.has(fatia.chave);
        return (
          <path
            key={fatia.chave}
            d={fatia.path}
            fill={CONTRATO_ATLETA_COR[fatia.chave]}
            stroke="#EEF0F2"
            strokeWidth="0.5"
            opacity={dimmed ? 0.35 : 1}
            className="cursor-pointer transition-opacity"
            onClick={() => aoClicar(fatia.chave)}
          >
            <title>{`${CONTRATO_ATLETA_LABEL[fatia.chave]}: ${contagens.get(fatia.chave) ?? 0} (${fatia.percentual}%)`}</title>
          </path>
        );
      })}
    </svg>
  );
}
