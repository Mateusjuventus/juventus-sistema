"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ORDEM_POSICOES_CAMPOGRAMA,
  calcularPontoAngular,
  calcularPontosRadar,
  contarPorPosicaoCampograma,
  nomeCampograma,
  seloContratoAtleta,
  type AtletaCampograma,
  type GrupoCampograma,
} from "@/lib/futebol/campograma";
import { anelClassificacaoAtleta } from "@/lib/futebol/classificacao-atleta";
import { moverAtletaCampograma } from "@/app/base/atletas/campograma/actions";
import type { AtletaPosicao } from "@/lib/supabase/types";

/**
 * Campograma: o elenco de uma categoria, separado por posição (9 linhas, uma por posição específica
 * — ver docs/superpowers/specs/2026-08-26-campograma-foto-classificacao-design.md). Cada atleta é um
 * token com foto (anel na cor da classificação G1/G2/G3), selo de contrato P/F, nome e data de
 * nascimento. Arrastar um token de uma linha pra outra grava a nova posição na hora (Server Action);
 * atleta sem posição cadastrada aparece numa lista auxiliar abaixo, sem interação (não tem uma
 * posição de origem definida).
 */

const RADAR_CENTRO = { x: 150, y: 150 };
const RADAR_RAIO = 95;
const RADAR_RAIO_ROTULO = 122;
const RADAR_TAMANHO = 300;
const RADAR_ANEIS = [0.35, 0.65, 1];

function formatarDataBrCampograma(iso: string | null): string | null {
  if (!iso) return null;
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Alinhamento horizontal do rótulo de cada eixo do radar, conforme o lado do gráfico em que ele
 * cai — evita que o texto invada o desenho (rótulos à direita alinham pela esquerda do texto, à
 * esquerda alinham pela direita, os de cima/baixo ficam centralizados). */
function anchorRotulo(x: number, centroX: number): "start" | "middle" | "end" {
  if (x > centroX + 4) return "start";
  if (x < centroX - 4) return "end";
  return "middle";
}

function TokenAtleta({
  atleta,
  arrastavel,
  onDragStart,
  onDragEnd,
}: {
  atleta: AtletaCampograma;
  arrastavel: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const selo = seloContratoAtleta(atleta.tipoContrato);
  const nascimento = formatarDataBrCampograma(atleta.dataNascimento);
  const nome = nomeCampograma(atleta);

  return (
    <div
      draggable={arrastavel}
      onDragStart={(e) => {
        if (!arrastavel) return;
        e.dataTransfer.setData("text/plain", atleta.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      className={`flex w-[76px] flex-col items-center gap-1 ${arrastavel ? "cursor-grab active:cursor-grabbing" : ""}`}
      title={atleta.nome}
    >
      <div
        className={`relative h-[72px] w-[66px] shrink-0 overflow-hidden rounded-md border-[3px] bg-neutral-100 ${anelClassificacaoAtleta(atleta.classificacao)}`}
      >
        {atleta.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={atleta.fotoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-bold text-neutral-400">
            {nome.charAt(0).toUpperCase()}
          </div>
        )}
        {selo ? (
          <span
            className={`absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${
              selo === "P" ? "bg-neutral-900" : "bg-red-600"
            }`}
          >
            {selo}
          </span>
        ) : null}
      </div>
      <p className="w-full truncate text-center text-[11px] font-semibold text-neutral-800">{nome}</p>
      {nascimento ? <p className="text-center text-[10px] text-neutral-400">{nascimento}</p> : null}
    </div>
  );
}

function GraficoPosicoes({ grupos }: { grupos: GrupoCampograma }) {
  const contagens = contarPorPosicaoCampograma(grupos);
  const total = contagens.reduce((soma, c) => soma + c.quantidade, 0);
  const pontosDados = calcularPontosRadar(contagens, RADAR_CENTRO, RADAR_RAIO);
  const poligonoDados = pontosDados.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
      <svg width={RADAR_TAMANHO} height={RADAR_TAMANHO} viewBox={`0 0 ${RADAR_TAMANHO} ${RADAR_TAMANHO}`}>
        {RADAR_ANEIS.map((fator) => {
          const pontosAnel = contagens
            .map((_, i) => calcularPontoAngular(i, contagens.length, RADAR_CENTRO, RADAR_RAIO * fator))
            .map((p) => `${p.x},${p.y}`)
            .join(" ");
          return <polygon key={fator} points={pontosAnel} fill="none" stroke="#e5e5e5" strokeWidth={1} />;
        })}

        {contagens.map((c, i) => {
          const ponta = calcularPontoAngular(i, contagens.length, RADAR_CENTRO, RADAR_RAIO);
          const rotulo = calcularPontoAngular(i, contagens.length, RADAR_CENTRO, RADAR_RAIO_ROTULO);
          return (
            <g key={c.posicao}>
              <line
                x1={RADAR_CENTRO.x}
                y1={RADAR_CENTRO.y}
                x2={ponta.x}
                y2={ponta.y}
                stroke="#d4d4d4"
                strokeWidth={1}
              />
              <text
                x={rotulo.x}
                y={rotulo.y}
                textAnchor={anchorRotulo(rotulo.x, RADAR_CENTRO.x)}
                dominantBaseline="middle"
                fontSize={10}
                fontWeight={600}
                fill="#525252"
              >
                {c.posicao} ({c.quantidade})
              </text>
            </g>
          );
        })}

        <polygon points={poligonoDados} fill="#5C0A35" fillOpacity={0.25} stroke="#5C0A35" strokeWidth={1.5} />
      </svg>

      <div className="text-center">
        <p className="text-4xl font-bold text-grena-escuro">{total}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {total === 1 ? "atleta no elenco" : "atletas no elenco"}
        </p>
      </div>
    </div>
  );
}

function Legenda() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-neutral-500">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm border-2 border-green-500" /> G1
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm border-2 border-yellow-400" /> G2
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm border-2 border-orange-500" /> G3
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm border-2 border-neutral-300" /> Não classificado
      </span>
      <span className="flex items-center gap-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-[9px] font-bold text-white">
          P
        </span>
        Definitivo/Empréstimo
      </span>
      <span className="flex items-center gap-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white">
          F
        </span>
        Amador/Iniciação
      </span>
    </div>
  );
}

export function CampogramaElenco({ grupos }: { grupos: GrupoCampograma }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [sobrePosicao, setSobrePosicao] = useState<AtletaPosicao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const semPosicao = grupos.sem_posicao;

  function soltarEm(posicao: AtletaPosicao) {
    setSobrePosicao(null);
    if (!arrastandoId) return;
    const atletaId = arrastandoId;
    setArrastandoId(null);
    setErro(null);
    startTransition(async () => {
      const resultado = await moverAtletaCampograma(atletaId, posicao);
      if (resultado.error) setErro(resultado.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-center text-xs text-neutral-400">
        Arraste um atleta pra outra linha pra mudar a posição dele.
      </p>

      {erro ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">{erro}</p>
      ) : null}

      <div className="card divide-y divide-neutral-100 p-0">
        {ORDEM_POSICOES_CAMPOGRAMA.map((posicao) => {
          const atletasDaLinha = grupos[posicao];
          const emFoco = sobrePosicao === posicao;
          return (
            <div
              key={posicao}
              onDragOver={(e) => {
                if (!arrastandoId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (sobrePosicao !== posicao) setSobrePosicao(posicao);
              }}
              onDragLeave={() => setSobrePosicao((atual) => (atual === posicao ? null : atual))}
              onDrop={(e) => {
                e.preventDefault();
                soltarEm(posicao);
              }}
              className={`flex flex-col gap-2 p-3 transition-colors sm:flex-row sm:items-center sm:gap-4 ${
                emFoco ? "bg-grena/5" : ""
              }`}
            >
              <p className="w-32 shrink-0 text-xs font-bold uppercase tracking-wide text-neutral-500">
                {posicao} ({atletasDaLinha.length})
              </p>
              {atletasDaLinha.length === 0 ? (
                <p className="text-xs text-neutral-300">
                  {emFoco ? "Solte aqui" : "Ninguém cadastrado"}
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {atletasDaLinha.map((atleta) => (
                    <TokenAtleta
                      key={atleta.id}
                      atleta={atleta}
                      arrastavel
                      onDragStart={() => setArrastandoId(atleta.id)}
                      onDragEnd={() => {
                        setArrastandoId(null);
                        setSobrePosicao(null);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {semPosicao.length > 0 ? (
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Sem posição classificada ({semPosicao.length})
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Preencha a posição no cadastro pra esses atletas aparecerem no elenco acima.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {semPosicao.map((atleta) => (
              <TokenAtleta key={atleta.id} atleta={atleta} arrastavel={false} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="card p-4">
        <Legenda />
      </div>

      <div className="card p-4">
        <GraficoPosicoes grupos={grupos} />
      </div>
    </div>
  );
}
