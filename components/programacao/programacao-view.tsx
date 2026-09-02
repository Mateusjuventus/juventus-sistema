"use client";

import { useState } from "react";
import Link from "next/link";
import { AtividadeCard } from "./atividade-card";
import { NovaAtividadeModal } from "./nova-atividade-modal";
import { AtividadeDetalheModal } from "./atividade-detalhe-modal";
import { CopiarDiaModal } from "./copiar-dia-modal";
import { MicrocicloTextoEditor } from "./microciclo-texto-editor";
import { diasDaSemana, somarDias } from "@/lib/programacao/semana";
import type { AtividadeComDetalhes, JogoResumoAtividade } from "@/lib/programacao/queries";
import type { ProgramacaoCatalogoSubatividadeRow, ProgramacaoAtividadeTipo } from "@/lib/supabase/types";
import { categoriaBaseLabel, type CategoriaBase } from "@/lib/auth/categorias-base";
import {
  PROGRAMACAO_ATIVIDADE_TIPOS_ORDEM,
  corPontoAtividade,
  labelTipoAtividade,
  turnoLabel,
} from "@/lib/programacao/tipo-atividade";

const DIA_SEMANA_LABEL = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function diaSemanaLabel(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return DIA_SEMANA_LABEL[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
}

function diaNumero(dataIso: string): string {
  return dataIso.split("-")[2];
}

function formatPeriodo(inicioSemana: string): string {
  const fim = somarDias(inicioSemana, 6);
  const [, mesI, diaI] = inicioSemana.split("-");
  const [, mesF, diaF] = fim.split("-");
  return `${diaI}/${mesI} - ${diaF}/${mesF}`;
}

/**
 * Programação Semanal — compartilhado entre `/treinador` e `/base` (Início de cada um, ver
 * docs/superpowers/specs/2026-08-30-area-treinador-programacao-design.md). A diferença entre os
 * dois é só a lista de categorias disponíveis (travada em `categorias_treinador` vs. todas) e o
 * container em volta (cabeçalho do treinador vs. `AppShell`) — este componente não sabe qual dos
 * dois é, só recebe os dados já carregados e resolvidos.
 *
 * Navegação de semana/categoria é feita por `Link` com querystring (`?semana=&categoria=`), não por
 * estado de cliente — quem recarrega os dados é o Server Component da página (`basePath`), mesmo
 * padrão de filtro por URL já usado em `/base/jogos`. Só o filtro da legenda (esconder/mostrar por
 * tipo) é estado local, puramente visual, sem ida ao servidor.
 */
export function ProgramacaoView({
  basePath,
  categoriaAtiva,
  categoriasDisponiveis,
  inicioSemana,
  atividades,
  jogosParaSelecao,
  catalogo,
  microcicloTexto,
  permitirProgramacaoGeral,
}: {
  basePath: string;
  categoriaAtiva: CategoriaBase;
  categoriasDisponiveis: CategoriaBase[];
  inicioSemana: string;
  atividades: AtividadeComDetalhes[];
  jogosParaSelecao: JogoResumoAtividade[];
  catalogo: ProgramacaoCatalogoSubatividadeRow[];
  microcicloTexto: string | null;
  /** Botão "Gerar Programação Geral" (ver spec, Parte 3) — só em `/base` (visão administrativa das
   * 7 categorias), não em `/treinador` (que só enxerga a própria categoria). */
  permitirProgramacaoGeral?: boolean;
}) {
  const [modalNovaAtividadeAberto, setModalNovaAtividadeAberto] = useState(false);
  const [atividadeSelecionadaId, setAtividadeSelecionadaId] = useState<string | null>(null);
  const [tiposEscondidos, setTiposEscondidos] = useState<Set<ProgramacaoAtividadeTipo>>(new Set());
  const [dataCopiarDia, setDataCopiarDia] = useState<string | null>(null);

  function hrefComQuery(params: { semana?: string; categoria?: string }) {
    const query = new URLSearchParams({
      semana: params.semana ?? inicioSemana,
      categoria: params.categoria ?? categoriaAtiva,
    });
    return `${basePath}?${query.toString()}`;
  }

  function alternarTipo(tipo: ProgramacaoAtividadeTipo) {
    setTiposEscondidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(tipo)) novo.delete(tipo);
      else novo.add(tipo);
      return novo;
    });
  }

  const dias = diasDaSemana(inicioSemana);
  const atividadeSelecionada = atividades.find((a) => a.id === atividadeSelecionadaId) ?? null;

  return (
    <div>
      {categoriasDisponiveis.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {categoriasDisponiveis.map((cat) => (
            <Link
              key={cat}
              href={hrefComQuery({ categoria: cat })}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                cat === categoriaAtiva
                  ? "bg-grena text-white"
                  : "bg-white text-neutral-600 ring-1 ring-linha hover:bg-neutral-50"
              }`}
            >
              {categoriaBaseLabel(cat)}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mb-3">
        <MicrocicloTextoEditor key={categoriaAtiva} categoria={categoriaAtiva} valorInicial={microcicloTexto} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={hrefComQuery({ semana: somarDias(inicioSemana, -7) })}
            aria-label="Semana anterior"
            className="rounded-md border border-linha bg-white px-2.5 py-1.5 text-grena hover:bg-neutral-50"
          >
            ‹
          </Link>
          <span className="text-sm font-medium text-neutral-600">{formatPeriodo(inicioSemana)}</span>
          <Link
            href={hrefComQuery({ semana: somarDias(inicioSemana, 7) })}
            aria-label="Próxima semana"
            className="rounded-md border border-linha bg-white px-2.5 py-1.5 text-grena hover:bg-neutral-50"
          >
            ›
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/programacao/${categoriaAtiva}/exportar/pdf?semana=${inicioSemana}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Exportar PDF
          </a>
          <a
            href={`/programacao/${categoriaAtiva}/exportar/jpg?semana=${inicioSemana}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Exportar JPG
          </a>
          {permitirProgramacaoGeral ? (
            <a
              href={`/programacao/geral/exportar/pdf?semana=${inicioSemana}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Gerar Programação Geral
            </a>
          ) : null}
          <button type="button" onClick={() => setModalNovaAtividadeAberto(true)} className="btn-primary">
            + Nova Atividade
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-7 sm:gap-3">
          {dias.map((dataIso) => {
            const atividadesDoDia = atividades
              .filter((a) => a.data === dataIso)
              .filter((a) => !tiposEscondidos.has(a.tipo));
            let ultimoTurno: string | null = null;

            return (
              <div key={dataIso}>
                <div className="mb-2 text-center">
                  <p className="m-0 text-[11px] font-bold tracking-wide text-neutral-400">{diaSemanaLabel(dataIso)}</p>
                  <div className="mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-grena text-sm font-extrabold text-white">
                    {diaNumero(dataIso)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDataCopiarDia(dataIso)}
                    className="mt-1.5 w-full rounded-md border border-linha bg-white px-1.5 py-1 text-[10px] font-medium text-neutral-500 transition-colors hover:bg-neutral-50"
                  >
                    Copiar Dia
                  </button>
                </div>
                <div className="flex min-h-[60px] flex-col gap-1.5">
                  {atividadesDoDia.length === 0 ? (
                    <p className="py-2 text-center text-[11.5px] text-neutral-300">Dia livre</p>
                  ) : null}
                  {atividadesDoDia.map((atividade) => {
                    const mostrarTurno = atividade.turno !== ultimoTurno;
                    ultimoTurno = atividade.turno;
                    return (
                      <div key={atividade.id}>
                        {mostrarTurno ? (
                          <p className="m-0 mb-0.5 mt-1.5 text-[9.5px] font-bold uppercase tracking-wide text-neutral-400">
                            {turnoLabel(atividade.turno)}
                          </p>
                        ) : null}
                        <AtividadeCard atividade={atividade} onClick={() => setAtividadeSelecionadaId(atividade.id)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card mt-4 p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
          Legendas (clique pra esconder/mostrar as atividades)
        </p>
        <div className="flex flex-wrap gap-3.5">
          {PROGRAMACAO_ATIVIDADE_TIPOS_ORDEM.map((tipo) => {
            const escondido = tiposEscondidos.has(tipo);
            return (
              <button key={tipo} type="button" onClick={() => alternarTipo(tipo)} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${corPontoAtividade(tipo)} ${escondido ? "opacity-30" : ""}`} />
                <span className={`text-xs ${escondido ? "text-neutral-300 line-through" : "text-neutral-600"}`}>
                  {labelTipoAtividade(tipo)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {modalNovaAtividadeAberto ? (
        <NovaAtividadeModal
          categoria={categoriaAtiva}
          jogosParaSelecao={jogosParaSelecao}
          onClose={() => setModalNovaAtividadeAberto(false)}
        />
      ) : null}

      {dataCopiarDia ? (
        <CopiarDiaModal
          categoria={categoriaAtiva}
          dataOrigem={dataCopiarDia}
          onClose={() => setDataCopiarDia(null)}
        />
      ) : null}

      {atividadeSelecionada ? (
        <AtividadeDetalheModal
          atividade={atividadeSelecionada}
          catalogo={catalogo}
          onClose={() => setAtividadeSelecionadaId(null)}
        />
      ) : null}
    </div>
  );
}
