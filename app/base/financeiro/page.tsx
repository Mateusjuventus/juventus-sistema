import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { GastoJogoBaseComCategoriaRow, JogoBaseRow } from "@/lib/supabase/types";
import { GeralBaseView } from "./geral-base-view";

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function StatCard({ label, valor, destaque }: { label: string; valor: string; destaque?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${destaque ?? "text-grena-escuro"}`}>{valor}</p>
    </div>
  );
}

/**
 * Aba "Jogos" — Prestação de Contas do Futebol de Base (espelha `app/financeiro/page.tsx`),
 * somando previsto x efetuado de todos os jogos_base/gastos_jogo_base. Totalmente independente do
 * Profissional e, por decisão explícita, também independente do Gasto Geral da Base (aba "Geral da
 * Base", ver `./geral-base-view.tsx`) — gasto de jogo é tratado como coisa diferente de custo de
 * manter a categoria rodando.
 */
async function JogosView() {
  const supabase = createClient();

  const [{ data: jogosData }, { data: gastosData }] = await Promise.all([
    supabase.from("jogos_base").select("*").order("data_jogo", { ascending: false }),
    supabase.from("gastos_jogo_base").select("*, categoria:categorias_gasto(nome)"),
  ]);

  const jogos = (jogosData ?? []) as JogoBaseRow[];
  const gastos = (gastosData ?? []) as GastoJogoBaseComCategoriaRow[];

  const totalPrevisto = gastos.reduce((soma, g) => soma + g.valor_previsto, 0);
  const totalEfetuado = gastos.reduce((soma, g) => soma + (g.valor_efetuado ?? 0), 0);
  const totalDiferenca = totalPrevisto - totalEfetuado;

  const porCategoria = new Map<string, { previsto: number; efetuado: number }>();
  for (const g of gastos) {
    const nome = g.categoria?.nome ?? "Outros";
    const atual = porCategoria.get(nome) ?? { previsto: 0, efetuado: 0 };
    atual.previsto += g.valor_previsto;
    atual.efetuado += g.valor_efetuado ?? 0;
    porCategoria.set(nome, atual);
  }
  const categorias = Array.from(porCategoria.entries())
    .map(([nome, valores]) => ({ nome, ...valores, diferenca: valores.previsto - valores.efetuado }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const gastosPorJogo = new Map<string, GastoJogoBaseComCategoriaRow[]>();
  for (const g of gastos) {
    const lista = gastosPorJogo.get(g.jogo_id) ?? [];
    lista.push(g);
    gastosPorJogo.set(g.jogo_id, lista);
  }
  const jogosComGastos = jogos
    .filter((j) => gastosPorJogo.has(j.id))
    .map((j) => {
      const gastosDoJogo = gastosPorJogo.get(j.id) ?? [];
      const previsto = gastosDoJogo.reduce((soma, g) => soma + g.valor_previsto, 0);
      const efetuado = gastosDoJogo.reduce((soma, g) => soma + (g.valor_efetuado ?? 0), 0);
      return { jogo: j, previsto, efetuado, diferenca: previsto - efetuado };
    });

  return (
    <>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {gastos.length > 0 ? (
          <>
            <a href="/base/financeiro/export" className="btn-secondary">
              Exportar para Excel
            </a>
            <a
              href="/base/financeiro/pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Gerar Relatório PDF
            </a>
          </>
        ) : null}
        <Link href="/base/financeiro/configuracoes" className="btn-secondary">
          Editar assinaturas
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total previsto" valor={formatMoeda(totalPrevisto)} />
        <StatCard label="Total efetuado" valor={formatMoeda(totalEfetuado)} />
        <StatCard
          label="Diferença"
          valor={formatMoeda(totalDiferenca)}
          destaque={totalDiferenca < 0 ? "text-red-700" : "text-green-700"}
        />
      </div>

      <h2 className="mt-8 text-lg font-bold text-grena-escuro">Por categoria</h2>
      {categorias.length === 0 ? (
        <div className="card mt-3 p-8 text-center text-neutral-400">
          Nenhum gasto lançado ainda em nenhum jogo.
        </div>
      ) : (
        <div className="card tabela-rolavel mt-3">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Previsto</th>
                <th className="px-4 py-3">Efetuado</th>
                <th className="px-4 py-3">Diferença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {categorias.map((c) => (
                <tr key={c.nome}>
                  <td className="px-4 py-3 font-medium text-neutral-800">{c.nome}</td>
                  <td className="px-4 py-3">{formatMoeda(c.previsto)}</td>
                  <td className="px-4 py-3">{formatMoeda(c.efetuado)}</td>
                  <td className={`px-4 py-3 ${c.diferenca < 0 ? "font-semibold text-red-700" : ""}`}>
                    {formatMoeda(c.diferenca)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-8 text-lg font-bold text-grena-escuro">Por jogo</h2>
      <p className="mt-1 text-sm text-neutral-500">Só aparecem aqui os jogos que já têm algum gasto lançado.</p>
      {jogosComGastos.length === 0 ? (
        <div className="card mt-3 p-8 text-center text-neutral-400">Nenhum jogo com gastos lançados ainda.</div>
      ) : (
        <div className="mt-3 space-y-3">
          {jogosComGastos.map(({ jogo, previsto, efetuado, diferenca }) => (
            <Link
              key={jogo.id}
              href={`/base/jogos/${jogo.categoria}/${jogo.id}/financeiro`}
              className="card flex flex-wrap items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-dourado"
            >
              <div>
                <p className="font-medium text-neutral-800">
                  {jogo.mandante ? "Juventus" : jogo.adversario_nome} x{" "}
                  {jogo.mandante ? jogo.adversario_nome : "Juventus"}
                </p>
                <p className="text-sm text-neutral-500">
                  {jogo.competicao} · {formatData(jogo.data_jogo)}
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-400">Previsto</p>
                  <p className="font-semibold text-neutral-700">{formatMoeda(previsto)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-400">Efetuado</p>
                  <p className="font-semibold text-neutral-700">{formatMoeda(efetuado)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-400">Diferença</p>
                  <p className={`font-semibold ${diferenca < 0 ? "text-red-700" : "text-green-700"}`}>
                    {formatMoeda(diferenca)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * `/base/financeiro` — duas abas, sem trocar de rota (`?aba=`): "Jogos" (Prestação de Contas,
 * inalterada) e "Geral da Base" (novo, Gasto Geral da Base — salário da Comissão Técnica + ajuda
 * de custo dos Atletas + despesas avulsas). Ver
 * docs/superpowers/specs/2026-08-19-financeiro-base-design.md.
 */
export default function FinanceiroBasePage({
  searchParams,
}: {
  searchParams: { aba?: string };
}) {
  const aba = searchParams.aba === "geral" ? "geral" : "jogos";

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Financeiro" />

      <div className="tab-bar mb-1 mt-4">
        <Link
          href="/base/financeiro"
          className={`tab-item border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:py-2 ${
            aba === "jogos" ? "border-grena text-grena" : "border-transparent text-neutral-500 hover:text-grena"
          }`}
        >
          Jogos
        </Link>
        <Link
          href="/base/financeiro?aba=geral"
          className={`tab-item border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:py-2 ${
            aba === "geral" ? "border-grena text-grena" : "border-transparent text-neutral-500 hover:text-grena"
          }`}
        >
          Geral da Base
        </Link>
      </div>

      {aba === "geral" ? <GeralBaseView /> : <JogosView />}
    </AppShell>
  );
}
