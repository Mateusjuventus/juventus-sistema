import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { MapaBrasilUf } from "@/components/mapa-brasil-uf";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import {
  CAPTACAO_STATUS_OPTIONS,
  contarInscricoesPendentes,
  contarPorCategoriaEStatus,
  contarPorStatus,
  contarPorUf,
  taxaAprovacao,
} from "@/lib/futebol/captacao";
import type { CaptacaoBaseRow } from "@/lib/supabase/types";

/**
 * Dashboard da Captação/Avaliação: o funil de candidatos (aguardando aprovação/em avaliação/
 * aprovados/dispensados/não compareceu), a taxa de aprovação e o mapa de onde eles vêm. Banco
 * TOTALMENTE separado do cadastro de Atletas (ver docs/superpowers/specs/
 * 2026-08-19-captacao-atletas-separacao-design.md) — não mostra mais nada de `atletas_base` aqui.
 */
export default async function CaptacaoDashboardPage() {
  const supabase = createClient();

  const { data: captacaoData } = await supabase.from("captacao_base").select("status, uf, categoria");

  const candidatos = (captacaoData ?? []) as Pick<CaptacaoBaseRow, "status" | "uf" | "categoria">[];
  const contagemStatus = contarPorStatus(candidatos);
  const aguardandoAprovacao = contarInscricoesPendentes(candidatos);
  const contagemUf = contarPorUf(candidatos);
  const contagemCategoria = contarPorCategoriaEStatus(candidatos);
  const taxa = taxaAprovacao(contagemStatus);
  const totalCandidatos = candidatos.length;

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/captacao" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Captação/Avaliação
      </Link>
      <PageHeader title="Dashboard da Captação" />

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-grena-escuro">{totalCandidatos}</p>
          <p className="mt-1 text-xs font-medium text-neutral-500">Candidatos no total</p>
        </div>
        <Link href="/base/captacao/aprovacoes" className="card p-4 text-center transition-shadow hover:shadow-md">
          <p className="text-2xl font-bold text-blue-700">{aguardandoAprovacao}</p>
          <p className="mt-1 text-xs font-medium text-neutral-500">Aguardando aprovação</p>
        </Link>
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
          Candidatos por categoria
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3">Categoria</th>
                {CAPTACAO_STATUS_OPTIONS.map((opcao) => (
                  <th key={opcao.value} className="px-4 py-3 text-center">
                    {opcao.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {CATEGORIAS_BASE.map((cat) => {
                const porStatus = contagemCategoria[cat.value];
                const totalCategoria = CAPTACAO_STATUS_OPTIONS.reduce(
                  (soma, opcao) => soma + porStatus[opcao.value],
                  0,
                );
                return (
                  <tr key={cat.value} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-800">{cat.label}</td>
                    {CAPTACAO_STATUS_OPTIONS.map((opcao) => (
                      <td key={opcao.value} className="px-4 py-3 text-center text-neutral-600">
                        {porStatus[opcao.value]}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center font-semibold text-grena-escuro">{totalCategoria}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-4 p-5">
        <h2 className="text-center text-sm font-bold uppercase tracking-wide text-grena-escuro">
          Candidatos por estado
        </h2>
        <div className="mt-3">
          <MapaBrasilUf contagem={contagemUf} />
        </div>
      </div>
    </AppShell>
  );
}
