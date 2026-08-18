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

  const [{ data: despesasData }, { data: jogosData }] = await Promise.all([
    supabase
      .from("despesas_avulsas")
      .select("*, categoria:categorias_gasto(nome)")
      .order("data", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("jogos").select("*").order("data_jogo", { ascending: false }),
  ]);

  const despesas = (despesasData ?? []) as DespesaAvulsaComCategoriaRow[];
  const jogos = (jogosData ?? []) as JogoRow[];

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
        <Link href="/financeiro/despesas-avulsas/novo" className="btn-primary">
          + Nova despesa avulsa
        </Link>
      </div>

      <p className="mb-4 text-sm text-neutral-500">
        Despesas que não pertencem a nenhum jogo específico (folha de pagamento, manutenção do CT,
        etc.) — entram nos totais gerais da Prestação de Contas, mas não aparecem no resumo
        financeiro de nenhum jogo, mesmo quando relacionadas a um.
      </p>

      {despesas.length > 0 ? (
        <form className="card mb-4 flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="jogoId" className="field-label">
              Jogo (opcional)
            </label>
            <select id="jogoId" name="jogoId" className="field-input" defaultValue="">
              <option value="">Nenhum — traz todas as despesas</option>
              {jogos.map((j) => (
                <option key={j.id} value={j.id}>
                  {confrontoResumo(j)} — {formatData(j.data_jogo)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-400">
              Escolhendo um jogo, o PDF traz só as despesas vinculadas a ele.
            </p>
          </div>
          <div className="min-w-[220px] flex-1">
            <label htmlFor="titulo" className="field-label">
              Título (usado só quando não escolher um jogo)
            </label>
            <input
              id="titulo"
              name="titulo"
              className="field-input"
              placeholder="Ex: Departamento Administrativo"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" formAction="/financeiro/despesas-avulsas/pdf" formTarget="_blank" className="btn-secondary">
              Gerar PDF do Orçamento Previsto
            </button>
            {temEfetuado ? (
              <button
                type="submit"
                formAction="/financeiro/despesas-avulsas/despesas/pdf"
                formTarget="_blank"
                className="btn-secondary"
              >
                Gerar PDF do Relatório de Despesas
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      <div className="card tabela-rolavel">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Previsto</th>
              <th className="px-4 py-3">Efetuado</th>
              <th className="px-4 py-3">Diferença</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {despesas.map((d) => {
              const diferenca = d.valor_efetuado === null ? null : d.valor_previsto - d.valor_efetuado;
              return (
                <tr key={d.id}>
                  <td className="px-4 py-3 text-neutral-600">{formatData(d.data)}</td>
                  <td className="px-4 py-3 font-medium text-neutral-800">{d.categoria?.nome ?? "—"}</td>
                  <td className="px-4 py-3">{d.descricao ?? "—"}</td>
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
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  Nenhuma despesa avulsa lançada ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
          {despesas.length > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold text-neutral-800">
                <td className="px-4 py-3" colSpan={3}>
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
