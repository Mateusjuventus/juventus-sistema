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
import { ATLETA_CLASSIFICACAO_OPTIONS, anelClassificacaoAtleta } from "@/lib/futebol/classificacao-atleta";
import {
  criarAtletaRapidoCampograma,
  moverAtletaCampograma,
  salvarClassificacaoStatusCampograma,
} from "@/app/base/atletas/campograma/actions";
import { ModalShell } from "@/components/programacao/modal";
import type { AtletaPosicao } from "@/lib/supabase/types";

/**
 * Campograma: o elenco de uma categoria, separado por posição (9 linhas, uma por posição específica
 * — ver docs/superpowers/specs/2026-08-26-campograma-foto-classificacao-design.md). Cada atleta é um
 * token com foto (anel na cor da classificação G1/G2/G3/Dispensa), selo de contrato P/F, ícone de
 * Departamento Médico, nome e data de nascimento. Arrastar um token de uma linha pra outra grava a
 * nova posição na hora (Server Action); atleta sem posição cadastrada aparece numa lista auxiliar
 * abaixo, sem arrastar (não tem uma posição de origem definida) mas ainda clicável.
 *
 * Duas interações novas (ver docs/superpowers/specs/2026-09-02-campograma-edicao-rapida-design.md):
 * clicar num token (sem arrastar — um gesto de arrastar de verdade nunca dispara `click` no HTML5
 * drag-and-drop nativo) abre o painel de edição rápida de Classificação/Status
 * (`PainelEdicaoAtleta`); o botão "+ Adicionar" em cada linha abre o painel de inclusão rápida
 * (`PainelNovoAtleta`).
 */

// A "tela" do gráfico (viewBox) é mais larga que o círculo em si — sobra margem nas duas laterais
// pra caber o texto dos rótulos dos eixos (que se estendem além da borda do círculo, ver
// RADAR_RAIO_ROTULO), sem que o SVG corte o texto (o comportamento padrão do navegador é recortar
// qualquer desenho que passe da viewBox). O SVG renderiza em largura responsiva (100%, até um
// máximo), então o gráfico encolhe proporcionalmente — rótulos incluídos — em telas estreitas, em
// vez de estourar a largura da tela.
const RADAR_ALTURA = 300;
const RADAR_MARGEM_ROTULO = 90;
const RADAR_LARGURA = RADAR_ALTURA + RADAR_MARGEM_ROTULO * 2;
const RADAR_CENTRO = { x: RADAR_LARGURA / 2, y: RADAR_ALTURA / 2 };
const RADAR_RAIO = 95;
const RADAR_RAIO_ROTULO = 122;
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

/** Ícone de cruz médica (estilo suíço/hospitalar: quadrado branco, cruz vermelha) — sinaliza atleta
 * no Departamento Médico no token do Campograma (ver spec, seção 2). Mesmo tamanho do selo de
 * contrato (h-5 w-5) pro par ficar equilibrado nos dois cantos superiores do token; cor da cruz
 * (`#dc2626`) é a mesma já usada pro selo "F" de contrato — reaproveita a paleta existente, e é a
 * cor universal de cruz médica de qualquer forma. */
function IconeCruzMedica() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-label="Departamento Médico" role="img">
      <rect x="0.5" y="0.5" width="19" height="19" rx="4" fill="white" stroke="#d4d4d4" strokeWidth="1" />
      <rect x="8.25" y="4" width="3.5" height="12" fill="#dc2626" />
      <rect x="4" y="8.25" width="12" height="3.5" fill="#dc2626" />
    </svg>
  );
}

function TokenAtleta({
  atleta,
  arrastavel,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  atleta: AtletaCampograma;
  arrastavel: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onClick?: () => void;
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
      onClick={onClick}
      className={`flex w-[76px] flex-col items-center gap-1 ${arrastavel ? "cursor-grab active:cursor-grabbing" : ""} ${
        onClick ? "cursor-pointer" : ""
      }`}
      title={atleta.nome}
    >
      <div
        className={`relative h-[72px] w-[66px] shrink-0 rounded-md border-[3px] bg-neutral-100 ${anelClassificacaoAtleta(atleta.classificacao)}`}
      >
        {/* Só esta camada interna corta conteúdo (`overflow-hidden`) — os dois selos abaixo ficam
            fora dela, como irmãos, então nunca são clipados pela foto (bug corrigido, ver spec). */}
        <div className="h-full w-full overflow-hidden rounded-[3px]">
          {atleta.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={atleta.fotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-neutral-400">
              {nome.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {selo ? (
          <span
            className={`absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${
              selo === "P" ? "bg-neutral-900" : "bg-red-600"
            }`}
          >
            {selo}
          </span>
        ) : null}
        {atleta.status === "departamento_medico" ? (
          <span className="absolute -left-1.5 -top-1.5">
            <IconeCruzMedica />
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
      <div className="w-full" style={{ maxWidth: RADAR_LARGURA }}>
        <svg
          viewBox={`0 0 ${RADAR_LARGURA} ${RADAR_ALTURA}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Gráfico de posições do elenco"
        >
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
      </div>

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
        <span className="h-3 w-3 rounded-sm border-2 border-purple-700" /> Dispensa (pendente)
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

export function CampogramaElenco({ grupos, categoria }: { grupos: GrupoCampograma; categoria: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [sobrePosicao, setSobrePosicao] = useState<AtletaPosicao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atletaEmEdicao, setAtletaEmEdicao] = useState<AtletaCampograma | null>(null);
  const [posicaoNovoAtleta, setPosicaoNovoAtleta] = useState<AtletaPosicao | null>(null);

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
                <div className="flex items-center gap-3">
                  <p className="text-xs text-neutral-300">{emFoco ? "Solte aqui" : "Ninguém cadastrado"}</p>
                  <button
                    type="button"
                    onClick={() => setPosicaoNovoAtleta(posicao)}
                    className="text-xs font-semibold text-grena hover:underline"
                  >
                    + Adicionar
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
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
                      onClick={() => setAtletaEmEdicao(atleta)}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setPosicaoNovoAtleta(posicao)}
                    className="text-xs font-semibold text-grena hover:underline"
                  >
                    + Adicionar
                  </button>
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
              <TokenAtleta
                key={atleta.id}
                atleta={atleta}
                arrastavel={false}
                onClick={() => setAtletaEmEdicao(atleta)}
              />
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

      {atletaEmEdicao ? (
        <PainelEdicaoAtleta
          atleta={atletaEmEdicao}
          categoria={categoria}
          onClose={() => setAtletaEmEdicao(null)}
        />
      ) : null}

      {posicaoNovoAtleta ? (
        <PainelNovoAtleta
          posicao={posicaoNovoAtleta}
          categoria={categoria}
          onClose={() => setPosicaoNovoAtleta(null)}
        />
      ) : null}
    </div>
  );
}

function PainelEdicaoAtleta({
  atleta,
  categoria,
  onClose,
}: {
  atleta: AtletaCampograma;
  categoria: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [classificacao, setClassificacao] = useState<string>(atleta.classificacao ?? "");
  const [status, setStatus] = useState<string>(atleta.status ?? "liberado");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function salvar() {
    setErro(null);
    setSalvando(true);
    startTransition(async () => {
      const resultado = await salvarClassificacaoStatusCampograma(atleta.id, classificacao || null, status);
      setSalvando(false);
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <ModalShell
      titulo={`Editar — ${atleta.nome}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={salvar} disabled={salvando} className="btn-primary">
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {erro ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p> : null}
        <div>
          <label className="field-label">Classificação</label>
          <select
            value={classificacao}
            onChange={(e) => setClassificacao(e.target.value)}
            className="field-input"
          >
            <option value="">Não classificado</option>
            {ATLETA_CLASSIFICACAO_OPTIONS.map((opcao) => (
              <option key={opcao.value} value={opcao.value}>
                {opcao.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Status</label>
          <select value={status ?? "liberado"} onChange={(e) => setStatus(e.target.value)} className="field-input">
            <option value="liberado">Liberado</option>
            <option value="suspenso">Suspenso</option>
            <option value="departamento_medico">Departamento Médico</option>
          </select>
        </div>
        {classificacao === "dispensa" ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Dispensa pendente — a saída só é efetivada ao gerar o Relatório de Dispensa.{" "}
            <a href={`/base/atletas/${categoria}/${atleta.id}/dispensa`} className="font-semibold underline">
              Gerar relatório de dispensa
            </a>
          </p>
        ) : null}
      </div>
    </ModalShell>
  );
}

function PainelNovoAtleta({
  posicao,
  categoria,
  onClose,
}: {
  posicao: AtletaPosicao;
  categoria: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [posicaoEscolhida, setPosicaoEscolhida] = useState<string>(posicao);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function salvar() {
    setErro(null);
    setSalvando(true);
    startTransition(async () => {
      const resultado = await criarAtletaRapidoCampograma(nomeCompleto, posicaoEscolhida, categoria);
      setSalvando(false);
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <ModalShell
      titulo="Novo atleta rápido"
      subtitulo="Nome e posição — o resto do cadastro pode ser completado depois."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || !nomeCompleto.trim()}
            className="btn-primary"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {erro ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p> : null}
        <div>
          <label className="field-label">Nome completo</label>
          <input
            type="text"
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            className="field-input"
            placeholder="Nome completo do atleta"
            autoFocus
          />
        </div>
        <div>
          <label className="field-label">Posição</label>
          <select
            value={posicaoEscolhida}
            onChange={(e) => setPosicaoEscolhida(e.target.value)}
            className="field-input"
          >
            {ORDEM_POSICOES_CAMPOGRAMA.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
    </ModalShell>
  );
}
