import Link from "next/link";
import type { CompeticaoComTemporadaRow, CompeticaoStatus } from "@/lib/supabase/types";

/**
 * Cabeçalho + abas das telas de uma competição (`/competicoes/[id]/*`) — mesmo padrão visual de
 * `components/jogo-tabs.tsx`. As abas espelham a estrutura da spec
 * (docs/superpowers/specs/2026-08-10-competicoes-design.md): Cartões/Suspensões/Condição de Jogo
 * são telas de CONSULTA (dados derivados das súmulas), não de cadastro.
 */

export type CompeticaoTabKey =
  | "visao"
  | "fases"
  | "classificacao"
  | "resultados"
  | "jogos"
  | "inscritos"
  | "cartoes"
  | "suspensoes"
  | "condicao"
  | "alertas"
  | "prazos";

export const COMPETICAO_STATUS_LABEL: Record<CompeticaoStatus, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  encerrada: "Encerrada",
};

export function CompeticaoStatusBadge({ status }: { status: CompeticaoStatus }) {
  const classe =
    status === "em_andamento"
      ? "bg-emerald-50 text-emerald-700"
      : status === "encerrada"
        ? "bg-neutral-100 text-neutral-500"
        : "bg-amber-50 text-amber-700";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${classe}`}>
      {COMPETICAO_STATUS_LABEL[status]}
    </span>
  );
}

export function CompeticaoTabs({
  competicao,
  active,
}: {
  competicao: CompeticaoComTemporadaRow;
  active: CompeticaoTabKey;
}) {
  const base = `/competicoes/${competicao.id}`;

  const tabs: { key: CompeticaoTabKey; label: string; href: string }[] = [
    { key: "visao", label: "Visão geral", href: base },
    { key: "fases", label: "Fases e Grupos", href: `${base}/fases` },
    { key: "classificacao", label: "Classificação", href: `${base}/classificacao` },
    { key: "resultados", label: "Súmulas dos Grupos", href: `${base}/resultados` },
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
      <Link href="/competicoes" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Competições
      </Link>

      <div className="mt-2 text-center">
        <h1 className="text-3xl font-bold text-grena-escuro">{competicao.nome}</h1>
        <p className="mt-1 flex items-center justify-center gap-2 text-sm text-neutral-500">
          <span>
            Temporada <span className="font-semibold text-neutral-700">{competicao.temporada?.nome ?? "—"}</span>
            {" · "}
            {competicao.categoria}
            {competicao.federacao ? ` · ${competicao.federacao}` : ""}
          </span>
          <CompeticaoStatusBadge status={competicao.status} />
        </p>
      </div>

      <div className="mb-4 mt-4 flex flex-wrap gap-1 border-b border-neutral-200">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
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
