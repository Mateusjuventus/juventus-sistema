import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import type { DespesaAvulsaComCategoriaRow, JogoRow } from "@/lib/supabase/types";
import { deleteDespesaAvulsa } from "./actions";

function formatMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function confrontoResumo(jogo: JogoRow): string {
  return jogo.mandante ? `Juventus x ${jogo.adversario_nome}` : `${jogo.adversario_nome} x Juventus`;
}

/**
 * Lista de despesas avulsas (gastos que não pertencem a nenhum jogo específico) — parte da
 * Prestação de Contas, ver docs/superpowers/specs/2026-08-08-despesas-avulsas-design.md. Lista
 * única ordenada por data, mais recente primeiro, sem filtro de período nesta versão.
 */
export default async function DespesasAvulsasPage() {
  const supabase = createClient();

  const [{ data: despesasData }, { data: vinculosData }] = await Promise.all([
    supabase
      .from("despesas_avulsas")
      .select("*, categoria:categorias_gasto(nome)")
      .order("data", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("despesas_avulsas_jogos")
      .select("despesa_id, jogo:jogos(id, mandante, adversario_nome, data_jogo)"),
  ]);

  const despesas = (despesasData ?? []) as DespesaAvulsaComCategoriaRow[];

  const jogosPorDespesa = new Map<string, JogoRow[]>();
  for (const v of (vinculosData ?? []) as unknown as { despesa_id: string; jogo: JogoRow | null }[]) {
    if (!v.jogo) continue;
    const lista = jogosPorDespesa.get(v.despesa_id) ?? [];
    lista.push(v.jogo);
    jogosPorDespesa.set(v.despesa_id, lista);
  }

  const totalPrevisto = despesas.reduce((soma, d) => soma + d.valor_previsto, 0);
  const totalEfetuado = despesas.reduce((soma, d) => soma + (d.valor_efetuado ?? 0), 0);
  const totalDiferenca = totalPrevisto - totalEfetuado;
  const temEfetuado = despesas.some((d) => d.valor_efetuado !== null);

  return (
    <AppShell>
      <Link href="/financeiro" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Prestação de Contas
      </Link>

      <div className="mb-4 mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Despesas avulsas</h1>
        <div className="flex gap-2">
          {despesas.length > 0 ? (
            <a
              href="/financeiro/despesas-avulsas/pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Gerar PDF do Orçamento Previsto
            </a>
          ) : null}
          {temEfetuado ? (
            <a
              href="/financeiro/despesas-avulsas/despesas/pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Gerar PDF do Relatório de Despesas
            </a>
          ) : null}
          <Link href="/financeiro/despesas-avulsas/novo" className="btn-primary">
            + Nova despesa avulsa
          </Link>
        </div>
      </div>

      <p className="mb-4 text-sm text-neutral-500">
        Despesas que não pertencem a nenhum jogo específico (folha de pagamento, manutenção do CT,
        etc.) — entram nos totais gerais da Prestação de Contas, mas não aparecem no resumo
        financeiro de nenhum jogo, mesmo quando relacionadas a um.
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Jogos relacionados</th>
              <th className="px-4 py-3">Previsto</th>
              <th className="px-4 py-3">Efetuado</th>
              <th className="px-4 py-3">Diferença</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {despesas.map((d) => {
              const diferenca = d.valor_efetuado === null ? null : d.valor_previsto - d.valor_efetuado;
              const jogosRelacionados = jogosPorDespesa.get(d.id) ?? [];
              return (
                <tr key={d.id}>
                  <td className="px-4 py-3 text-neutral-600">{formatData(d.data)}</td>
                  <td className="px-4 py-3 font-medium text-neutral-800">{d.categoria?.nome ?? "—"}</td>
                  <td className="px-4 py-3">{d.descricao ?? "—"}</td>
                  <td className="px-4 py-3">
                    {jogosRelacionados.length === 0 ? (
                      <span className="text-neutral-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {jogosRelacionados.map((j) => (
                          <span
                            key={j.id}
                            className="rounded-full bg-dourado/10 px-2 py-0.5 text-xs font-medium text-dourado"
                          >
                            {confrontoResumo(j)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatMoeda(d.valor_previsto)}</td>
                  <td className="px-4 py-3">{formatMoeda(d.valor_efetuado)}</td>
                  <td
                    className={`px-4 py-3 ${
                      diferenca !== null && diferenca < 0 ? "font-semibold text-red-700" : ""
                    }`}
                  >
                    {diferenca === null ? "—" : formatMoeda(diferenca)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/financeiro/despesas-avulsas/${d.id}`} className="btn-secondary">
                        Editar
                      </Link>
                      <DeleteButton action={deleteDespesaAvulsa} id={d.id} entityLabel="despesa avulsa" />
                    </div>
                  </td>
                </tr>
              );
            })}
            {despesas.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-neutral-400">
                  Nenhuma despesa avulsa lançada ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
          {despesas.length > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold text-neutral-800">
                <td className="px-4 py-3" colSpan={4}>
                  Total
                </td>
                <td className="px-4 py-3">{formatMoeda(totalPrevisto)}</td>
                <td className="px-4 py-3">{formatMoeda(totalEfetuado)}</td>
                <td className={`px-4 py-3 ${totalDiferenca < 0 ? "text-red-700" : ""}`}>
                  {formatMoeda(totalDiferenca)}
                </td>
                <td />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </AppShell>
  );
}
