"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AtletaAvatarBloco } from "@/components/atleta-avatar";
import { AtletaCard, type AtletaCardDados } from "@/components/atletas/atleta-card";
import { ClassificacaoSelectTreinador } from "@/components/classificacao-select-treinador";
import { CATEGORIAS_BASE, categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { captacaoStatusLabel, corCaptacaoStatus } from "@/lib/futebol/captacao";
import { alternarNoConjunto, atletaPassaFiltro, type AtletaFiltravel, type FiltrosAtletas } from "@/lib/futebol/atletas-filtro";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import { ATLETA_POSICAO_OPTIONS } from "@/lib/validation/schemas";
import type { AtletaBaseRow, AtletaBaseStatus, CaptacaoBaseRow } from "@/lib/supabase/types";

// Rótulos "Apto"/"Não apto"/"Depto. Médico" — mesmos usados em `/base/atletas/[categoria]`
// (ver STATUS_LABEL lá). "Dispensado" fica de fora dos chips aqui de propósito: o elenco do
// Treinador já exclui esse status na própria query (`.neq("status", "dispensado")`, ver
// `app/treinador/atletas/page.tsx`), então um chip "Dispensado" nunca teria ninguém pra mostrar.
const STATUS_LABEL_ELENCO: Record<Exclude<AtletaBaseStatus, "dispensado">, string> = {
  liberado: "Apto",
  suspenso: "Não apto",
  departamento_medico: "Depto. Médico",
};
const STATUS_OPTIONS_ELENCO = (Object.keys(STATUS_LABEL_ELENCO) as Exclude<AtletaBaseStatus, "dispensado">[]).map(
  (value) => ({ value, label: STATUS_LABEL_ELENCO[value] }),
);

function chipClasse(ativo: boolean): string {
  return `rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
    ativo ? "border-grena bg-grena/10 text-grena-escuro" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
  }`;
}

function atletaParaFiltravel(atleta: AtletaComFoto): AtletaFiltravel {
  return {
    status: atleta.status,
    posicao: atleta.posicao,
    tipoContrato: atleta.tipo_contrato,
    nome: nomeExibido(atleta),
    dataNascimento: atleta.data_nascimento,
  };
}

export type CandidatoComFoto = CaptacaoBaseRow & { fotoUrl: string | null };
export type AtletaComFoto = AtletaBaseRow & { fotoUrl: string | null };

type Aba = "avaliacao" | "avaliados" | "elenco";

function formatDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export interface GrupoPorCategoria<T> {
  categoria: string;
  categoriaLabel: string;
  itens: T[];
}

/**
 * Agrupa uma lista por categoria do Futebol de Base, na ordem fixa de `CATEGORIAS_BASE` (Sub-20 →
 * Sub-11) — não na ordem em que o treinador cobre as categorias, que pode estar em qualquer
 * sequência no cadastro dele. Só devolve grupos com pelo menos 1 item (nenhum cabeçalho vazio) —
 * ver docs/superpowers/specs/2026-10-02-campos-sensiveis-e-atletas-por-categoria-design.md. Um
 * treinador de categoria só nunca chega a ter mais de 1 grupo aqui.
 */
export function agruparPorCategoria<T extends { categoria: string | null }>(itens: T[]): GrupoPorCategoria<T>[] {
  return CATEGORIAS_BASE.map((cat) => ({
    categoria: cat.value,
    categoriaLabel: cat.label,
    itens: itens.filter((item) => item.categoria === cat.value),
  })).filter((grupo) => grupo.itens.length > 0);
}

/** Moldura base de um card da grade — só o corpo (texto) muda por aba; o retrato no topo
 * (`AtletaAvatarBloco`) é sempre o mesmo pros três tipos de card. */
function CardBase({
  nome,
  fotoUrl,
  corBorda,
  children,
}: {
  nome: string;
  fotoUrl: string | null;
  corBorda: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg border-2 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${corBorda}`}
    >
      <AtletaAvatarBloco
        nome={nome}
        fotoUrl={fotoUrl}
        className="aspect-[4/3] w-full"
        corFallback={{ bg: "bg-grena", texto: "text-white" }}
        comFundoEstudio
      />
      <div className="p-3">{children}</div>
    </div>
  );
}

/**
 * Aba "Atletas" da Área do Treinador — candidatos "Em avaliação" (Captação), o histórico de
 * decisões e o elenco já do clube ("Meus atletas"), com classificação G1/G2/G3 e Relatório de
 * Dispensa (ver docs/superpowers/specs/2026-08-25-classificacao-dispensa-atleta-base-design.md).
 * Grade de cards com retrato (foto real ou avatar de iniciais colorido — ver mockup aprovado do
 * cabeçalho em `treinador-header.tsx`), abas por contador e busca por nome — extraído de
 * `app/treinador/atletas/page.tsx` (que fazia tudo em seções empilhadas, sem troca de aba) pra
 * bater com o mockup: uma lista de cada vez, com busca, igual às outras telas grandes do sistema.
 */
export function TreinadorAtletasView({
  pendentes,
  decididos,
  atletas,
  salvarClassificacaoTreinador,
}: {
  pendentes: CandidatoComFoto[];
  decididos: CandidatoComFoto[];
  atletas: AtletaComFoto[];
  salvarClassificacaoTreinador: (formData: FormData) => Promise<void>;
}) {
  const [aba, setAba] = useState<Aba>("avaliacao");
  const [busca, setBusca] = useState("");
  // Chips de Status/Posição — só filtram a aba "Elenco" (ver abaixo); "Avaliação"/"Avaliados" não
  // pediram isso e os candidatos de lá nem têm status/posição no mesmo formato do elenco.
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set());
  const [posicoesSel, setPosicoesSel] = useState<Set<string>>(new Set());

  const buscaNormalizada = busca.trim().toLowerCase();

  const pendentesFiltrados = useMemo(
    () =>
      buscaNormalizada
        ? pendentes.filter((c) => c.nome_completo.toLowerCase().includes(buscaNormalizada))
        : pendentes,
    [pendentes, buscaNormalizada],
  );
  const decididosFiltrados = useMemo(
    () =>
      buscaNormalizada
        ? decididos.filter((c) => c.nome_completo.toLowerCase().includes(buscaNormalizada))
        : decididos,
    [decididos, buscaNormalizada],
  );
  const filtrosElenco: FiltrosAtletas = useMemo(
    () => ({
      status: statusSel,
      posicoes: posicoesSel,
      contratos: new Set(),
      anos: new Set(),
      buscaNormalizada,
    }),
    [statusSel, posicoesSel, buscaNormalizada],
  );
  const atletasFiltrados = useMemo(
    () => atletas.filter((a) => atletaPassaFiltro(atletaParaFiltravel(a), filtrosElenco)),
    [atletas, filtrosElenco],
  );

  // Contagens dos chips — sempre contra o elenco inteiro (não o já filtrado pelos outros chips),
  // mesmo padrão de `AtletasResumoFiltros`: o número de cada chip não muda só porque outro chip foi
  // marcado, só a grade embaixo muda.
  const contagensStatus = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const a of atletas) mapa.set(a.status, (mapa.get(a.status) ?? 0) + 1);
    return mapa;
  }, [atletas]);
  const contagensPosicao = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const a of atletas) mapa.set(a.posicao, (mapa.get(a.posicao) ?? 0) + 1);
    return mapa;
  }, [atletas]);

  // Agrupado por categoria (Sub-20 → Sub-11) — pra quando o treinador cobre mais de uma, ver
  // docs/superpowers/specs/2026-10-02-campos-sensiveis-e-atletas-por-categoria-design.md. Um
  // treinador de categoria só (ou uma aba com item em só uma categoria) nunca chega a 2 grupos, e
  // o cabeçalho de categoria só aparece quando há mais de 1 — ver `mostrarCabecalho` nos 3 renders
  // abaixo.
  const pendentesPorCategoria = useMemo(() => agruparPorCategoria(pendentesFiltrados), [pendentesFiltrados]);
  const decididosPorCategoria = useMemo(() => agruparPorCategoria(decididosFiltrados), [decididosFiltrados]);
  const atletasPorCategoria = useMemo(() => agruparPorCategoria(atletasFiltrados), [atletasFiltrados]);

  const abas: { key: Aba; labelCurto: string; labelLongo: string; total: number }[] = [
    { key: "avaliacao", labelCurto: "Avaliação", labelLongo: "Aguardando avaliação", total: pendentes.length },
    { key: "avaliados", labelCurto: "Avaliados", labelLongo: "Já avaliados", total: decididos.length },
    { key: "elenco", labelCurto: "Elenco", labelLongo: "Meus atletas", total: atletas.length },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {abas.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setAba(item.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              aba === item.key ? "bg-grena text-white" : "bg-white text-neutral-600 ring-1 ring-linha hover:bg-neutral-50"
            }`}
          >
            <span className="sm:hidden">{item.labelCurto}</span>
            <span className="hidden sm:inline">{item.labelLongo}</span>
            <span className="ml-1 opacity-80">({item.total})</span>
          </button>
        ))}
      </div>

      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar candidato pelo nome..."
        className="field-input mt-3 max-w-sm"
      />

      {aba === "avaliacao" ? (
        pendentesFiltrados.length === 0 ? (
          <p className="mt-6 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
            {pendentes.length === 0
              ? "Nenhum candidato aguardando avaliação no momento."
              : "Nenhum candidato encontrado com esse nome."}
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {pendentesPorCategoria.map((grupo) => (
              <div key={grupo.categoria}>
                {pendentesPorCategoria.length > 1 ? (
                  <h3 className="mb-2 text-sm font-semibold text-neutral-600">
                    {grupo.categoriaLabel}{" "}
                    <span className="font-normal text-neutral-400">({grupo.itens.length})</span>
                  </h3>
                ) : null}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {grupo.itens.map((candidato) => (
                    <Link key={candidato.id} href={`/treinador/${candidato.id}`} className="block">
                      <CardBase nome={candidato.nome_completo} fotoUrl={candidato.fotoUrl} corBorda="border-linha">
                        <p className="truncate text-sm font-semibold text-neutral-800">{candidato.nome_completo}</p>
                        <p className="mt-0.5 truncate text-xs text-neutral-500">
                          {candidato.posicao ?? "Posição não informada"}
                          {candidato.categoria ? ` · ${categoriaBaseLabel(candidato.categoria)}` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-400">
                          Nasc. {formatDataBr(candidato.data_nascimento)}
                        </p>
                        <p className="mt-1.5 text-xs font-bold text-grena">Avaliar →</p>
                      </CardBase>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {aba === "avaliados" ? (
        decididosFiltrados.length === 0 ? (
          <p className="mt-6 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
            {decididos.length === 0 ? "Nenhum candidato avaliado ainda." : "Nenhum candidato encontrado com esse nome."}
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {decididosPorCategoria.map((grupo) => (
              <div key={grupo.categoria}>
                {decididosPorCategoria.length > 1 ? (
                  <h3 className="mb-2 text-sm font-semibold text-neutral-600">
                    {grupo.categoriaLabel}{" "}
                    <span className="font-normal text-neutral-400">({grupo.itens.length})</span>
                  </h3>
                ) : null}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {grupo.itens.map((candidato) => (
                    <CardBase
                      key={candidato.id}
                      nome={candidato.nome_completo}
                      fotoUrl={candidato.fotoUrl}
                      corBorda="border-linha"
                    >
                      <p className="truncate text-sm font-semibold text-neutral-800">{candidato.nome_completo}</p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {candidato.posicao ?? "Posição não informada"}
                        {candidato.categoria ? ` · ${categoriaBaseLabel(candidato.categoria)}` : ""}
                      </p>
                      <span
                        className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${corCaptacaoStatus(candidato.status)}`}
                      >
                        {captacaoStatusLabel(candidato.status)}
                      </span>
                      {candidato.nota_tecnica !== null ? (
                        <p className="mt-1 text-[11px] text-neutral-500">
                          Téc {candidato.nota_tecnica} · Fís {candidato.nota_fisica} · Tát {candidato.nota_tatica} ·
                          Comp {candidato.nota_comportamental}
                        </p>
                      ) : null}
                    </CardBase>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {aba === "elenco" ? (
        <>
          {/* Status e Posição — mesmo visual de chip usado em `AtletasResumoFiltros` (Atletas da
              Base/Profissional), só que reduzido a essas duas (sem Contrato/Ano/exportação: não
              foram pedidos aqui e esta tela já é deliberadamente mais simples, ver spec). */}
          <div className="card mt-3 flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-start sm:gap-6">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Status · clique para filtrar
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS_ELENCO.map((opcao) => (
                  <button
                    key={opcao.value}
                    type="button"
                    onClick={() => setStatusSel((atual) => alternarNoConjunto(atual, opcao.value))}
                    className={chipClasse(statusSel.has(opcao.value))}
                  >
                    <span className="font-bold tabular-nums">{contagensStatus.get(opcao.value) ?? 0}</span>{" "}
                    {opcao.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Posição · clique para filtrar (uma ou mais)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ATLETA_POSICAO_OPTIONS.map((posicao) => (
                  <button
                    key={posicao}
                    type="button"
                    onClick={() => setPosicoesSel((atual) => alternarNoConjunto(atual, posicao))}
                    className={chipClasse(posicoesSel.has(posicao))}
                  >
                    <span className="font-bold tabular-nums">{contagensPosicao.get(posicao) ?? 0}</span> {posicao}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {atletasFiltrados.length === 0 ? (
            <p className="mt-4 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
              {atletas.length === 0
                ? "Nenhum atleta cadastrado nas suas categorias ainda."
                : "Nenhum atleta encontrado com esses filtros."}
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              {atletasPorCategoria.map((grupo) => (
                <div key={grupo.categoria}>
                  {atletasPorCategoria.length > 1 ? (
                    <h3 className="mb-2 text-sm font-semibold text-neutral-600">
                      {grupo.categoriaLabel}{" "}
                      <span className="font-normal text-neutral-400">({grupo.itens.length})</span>
                    </h3>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {grupo.itens.map((atleta) => {
                      const dados: AtletaCardDados = {
                        id: atleta.id,
                        nome: atleta.nome_completo,
                        apelido: atleta.apelido,
                        cpf: atleta.cpf,
                        fotoUrl: atleta.fotoUrl,
                        dataNascimento: atleta.data_nascimento,
                        dataFimContrato: atleta.data_fim_contrato,
                        tipoContrato: atleta.tipo_contrato,
                        posicao: atleta.posicao,
                        numeroCamisa: atleta.numero_camisa,
                        dispensado: atleta.status === "dispensado",
                        classificacao: atleta.classificacao,
                        ativo: atleta.ativo,
                      };
                      return (
                        <AtletaCard
                          key={atleta.id}
                          atleta={dados}
                          as="div"
                          mostrarCpf={false}
                          mostrarContrato={false}
                          rodape={
                            <div className="space-y-1.5">
                              <p className="truncate text-center text-xs text-neutral-500">{atleta.posicao}</p>
                              <ClassificacaoSelectTreinador
                                atletaId={atleta.id}
                                defaultValue={atleta.classificacao}
                                action={salvarClassificacaoTreinador}
                                className="w-full"
                              />
                              <Link
                                href={`/treinador/atletas/${atleta.id}/dispensa`}
                                className="btn-secondary btn-sm block text-center"
                              >
                                {atleta.dispensa_data ? "Ver relatório de dispensa" : "Gerar relatório de dispensa"}
                              </Link>
                            </div>
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
