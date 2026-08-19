import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { MapaBrasilUf } from "@/components/mapa-brasil-uf";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import { CAPTACAO_STATUS_OPTIONS, contarPorStatus, contarPorUf, taxaAprovacao } from "@/lib/futebol/captacao";
import type { AtletaStatus, CaptacaoBaseRow } from "@/lib/supabase/types";

/**
 * Dashboard da Captação/Avaliação: o funil de candidatos (em avaliação/aprovados/dispensados/não
 * compareceu), o mapa de onde eles vêm, e um retrato rápido do elenco oficial já formado (liberados/
 * suspensos/departamento médico) — os dois lados que o Mateus pediu juntos ("dashboards de
 * aprovados, liberados"). Separado da lista principal (`/base/captacao`) pra não pesar o dia a dia.
 */
export default async function CaptacaoDashboardPage() {
  const supabase = createClient();

  const [{ data: captacaoData }, { data: atletasData }] = await Promise.all([
    supabase.from("captacao_base").select("status, uf, categoria"),
    supabase.from("atletas_base").select("categoria, status"),
  ]);

  const candidatos = (captacaoData ?? []) as Pick<CaptacaoBaseRow, "status" | "uf" | "categoria">[];
  const contagemStatus = contarPorStatus(candidatos);
  const contagemUf = contarPorUf(candidatos);
  const taxa = taxaAprovacao(contagemStatus);
  const totalCandidatos = candidatos.length;

  const atletas = (atletasData ?? []) as { categoria: string; status: AtletaStatus }[];
  const totalLiberados = atletas.filter((a) => a.status === "liberado").length;
  const totalSuspensos = atletas.filter((a) => a.status === "suspenso").length;
  const totalMedico = atletas.filter((a) => a.status === "departamento_medico").length;

  const porCategoria = CATEGORIAS_BASE.map((cat) => ({
    categoria: cat.label,
    total: atletas.filter((a) => a.categoria === cat.value).length,
    liberados: atletas.filter((a) => a.categoria === cat.value && a.status === "liberado").length,
  }));

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/captacao" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Captação/Avaliação
      </Link>
      <PageHeader title="Dashboard da Captação" />

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-grena-escuro">{totalCandidatos}</p>
          <p className="mt-1 text-xs font-medium text-neutral-500">Candidatos no total</p>
        </div>
        {CAPTACAO_STATUS_OPTIONS.map((opcao) => (
          <div key={opcao.value} className="card p-4 text-center">
            <p className="text-2xl font-bold text-grena-escuro">{contagemStatus[opcao.value]}</p>
            <p className="mt-1 text-xs font-medium text-neutral-500">{opcao.label}</p>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-4 text-center">
        <p className="text-sm text-neutral-500">
          Taxa de aprovação (entre quem já foi decidido):{" "}
          <span className="text-base font-bold text-grena-escuro">
            {taxa === null ? "sem candidatos decididos ainda" : `${taxa}%`}
          </span>
        </p>
      </div>

      <div className="card mt-4 p-5">
        <h2 className="text-center text-sm font-bold uppercase tracking-wide text-grena-escuro">
          Candidatos por estado
        </h2>
        <div className="mt-3">
          <MapaBrasilUf contagem={contagemUf} />
        </div>
      </div>

      <div className="card mt-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-grena-escuro">
          Elenco oficial liberado, por categoria
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          {totalLiberados} liberados · {totalSuspensos} suspensos · {totalMedico} no departamento médico
          (todo o Futebol de Base)
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-neutral-500">
              <tr>
                <th className="py-2 pr-3">Categoria</th>
                <th className="py-2 pr-3">Liberados</th>
                <th className="py-2">Total de atletas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {porCategoria.map((c) => (
                <tr key={c.categoria}>
                  <td className="py-2 pr-3 font-medium text-neutral-800">{c.categoria}</td>
                  <td className="py-2 pr-3 text-emerald-700">{c.liberados}</td>
                  <td className="py-2 text-neutral-600">{c.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
