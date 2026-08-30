"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AtletaAvatarBloco } from "@/components/atleta-avatar";
import { ClassificacaoSelectTreinador } from "@/components/classificacao-select-treinador";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { captacaoStatusLabel, corCaptacaoStatus } from "@/lib/futebol/captacao";
import { anelClassificacaoAtleta } from "@/lib/futebol/classificacao-atleta";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import type { AtletaBaseRow, CaptacaoBaseRow } from "@/lib/supabase/types";

export type CandidatoComFoto = CaptacaoBaseRow & { fotoUrl: string | null };
export type AtletaComFoto = AtletaBaseRow & { fotoUrl: string | null };

type Aba = "avaliacao" | "avaliados" | "elenco";

function formatDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
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
      <AtletaAvatarBloco nome={nome} fotoUrl={fotoUrl} className="aspect-[4/3] w-full" />
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
  const atletasFiltrados = useMemo(
    () =>
      buscaNormalizada
        ? atletas.filter((a) => nomeExibido(a).toLowerCase().includes(buscaNormalizada))
        : atletas,
    [atletas, buscaNormalizada],
  );

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
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {pendentesFiltrados.map((candidato) => (
              <Link key={candidato.id} href={`/treinador/${candidato.id}`} className="block">
                <CardBase nome={candidato.nome_completo} fotoUrl={candidato.fotoUrl} corBorda="border-linha">
                  <p className="truncate text-sm font-semibold text-neutral-800">{candidato.nome_completo}</p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {candidato.posicao ?? "Posição não informada"}
                    {candidato.categoria ? ` · ${categoriaBaseLabel(candidato.categoria)}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">Nasc. {formatDataBr(candidato.data_nascimento)}</p>
                  <p className="mt-1.5 text-xs font-bold text-grena">Avaliar →</p>
                </CardBase>
              </Link>
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
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {decididosFiltrados.map((candidato) => (
              <CardBase key={candidato.id} nome={candidato.nome_completo} fotoUrl={candidato.fotoUrl} corBorda="border-linha">
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
                    Téc {candidato.nota_tecnica} · Fís {candidato.nota_fisica} · Tát {candidato.nota_tatica} · Comp{" "}
                    {candidato.nota_comportamental}
                  </p>
                ) : null}
              </CardBase>
            ))}
          </div>
        )
      ) : null}

      {aba === "elenco" ? (
        atletasFiltrados.length === 0 ? (
          <p className="mt-6 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
            {atletas.length === 0 ? "Nenhum atleta cadastrado nas suas categorias ainda." : "Nenhum atleta encontrado com esse nome."}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {atletasFiltrados.map((atleta) => (
              <CardBase
                key={atleta.id}
                nome={nomeExibido(atleta)}
                fotoUrl={atleta.fotoUrl}
                corBorda={anelClassificacaoAtleta(atleta.classificacao)}
              >
                <p className="truncate text-sm font-semibold text-neutral-800">{nomeExibido(atleta)}</p>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {categoriaBaseLabel(atleta.categoria)} · {atleta.posicao}
                </p>
                <div className="mt-2">
                  <ClassificacaoSelectTreinador
                    atletaId={atleta.id}
                    defaultValue={atleta.classificacao}
                    action={salvarClassificacaoTreinador}
                    className="w-full"
                  />
                </div>
                <Link
                  href={`/treinador/atletas/${atleta.id}/dispensa`}
                  className="btn-secondary btn-sm mt-2 block text-center"
                >
                  {atleta.dispensa_data ? "Ver relatório de dispensa" : "Gerar relatório de dispensa"}
                </Link>
              </CardBase>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
