import Link from "next/link";
import type { CompeticaoBaseComTemporadaRow } from "@/lib/supabase/types";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { CompeticaoStatusBadge, type CompeticaoTabKey } from "@/components/competicao-tabs";

/**
 * Cabeçalho + abas das telas de uma competição do Futebol de Base (`/base/competicoes/[id]/*`) —
 * espelha `components/competicao-tabs.tsx` (Profissional), trocando a base das rotas pra
 * `/base/competicoes` e mostrando o rótulo da categoria (Sub-12 etc.) em vez de "Profissional".
 * `CompeticaoStatusBadge`/`CompeticaoTabKey` vêm direto do original — dependem só de
 * `CompeticaoStatus`, uma união de string que serve pros dois módulos.
 */
export function CompeticaoTabsBase({
  competicao,
  active,
}: {
  competicao: CompeticaoBaseComTemporadaRow;
  active: CompeticaoTabKey;
}) {
  const base = `/base/competicoes/${competicao.id}`;

  const tabs: { key: CompeticaoTabKey; label: string; href: string }[] = [
    { key: "visao", label: "Visão geral", href: base },
    { key: "fases", label: "Fases e Grupos", href: `${base}/fases` },
    { key: "classificacao", label: "Classificação", href: `${base}/classificacao` },
    { key: "resultados", label: "Súmulas dos Grupos", href: `${base}/resultados` },
    { key: "adversarios", label: "Adversários", href: `${base}/adversarios` },
    { key: "jogos", label: "Jogos", href: `${base}/jogos` },
    { key: "inscritos", label: "Atletas Inscritos", href: `${base}/inscritos` },
    { key: "cartoes", label: "Cartões", href: `${base}/cartoes` },
    { key: "suspensoes", label: "Suspensões", href: `${base}/suspensoes` },
    { key: "condicao", label: "Condição de Jogo", href: `${base}/condicao` },
    { key: "alertas", label: "Alertas", href: `${base}/alertas` },
    { key: "prazos", label: "Prazos e Documentos", href: `${base}/prazos` },
  ];

  return (
    <div>
      <Link href="/base/competicoes" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Competições
      </Link>

      <div className="mt-2 text-center">
        <h1 className="text-3xl font-bold text-grena-escuro">{competicao.nome}</h1>
        <p className="mt-1 flex items-center justify-center gap-2 text-sm text-neutral-500">
          <span>
            Temporada <span className="font-semibold text-neutral-700">{competicao.temporada?.nome ?? "—"}</span>
            {" · "}
            {categoriaBaseLabel(competicao.categoria)}
            {competicao.federacao ? ` · ${competicao.federacao}` : ""}
          </span>
          <CompeticaoStatusBadge status={competicao.status} />
        </p>
      </div>

      <div className="tab-bar mb-4 mt-4">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`tab-item border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:py-2 ${
              active === tab.key
                ? "border-grena text-grena"
                : "border-transparent text-neutral-500 hover:text-grena"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
