import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import type { GastoJogoComCategoriaRow, JogoRow } from "@/lib/supabase/types";
import { deleteGasto } from "./actions";

function formatMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function FinanceiroJogoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: jogoData }, { data: gastosData }] = await Promise.all([
    supabase.from("jogos").select("*").eq("id", params.id).single(),
    supabase
      .from("gastos_jogo")
      .select("*, categoria:categorias_gasto(nome)")
      .eq("jogo_id", params.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!jogoData) notFound();

  const jogo = jogoData as JogoRow;
  const gastos = (gastosData ?? []) as GastoJogoComCategoriaRow[];

  const totalPrevisto = gastos.reduce((soma, g) => soma + g.valor_previsto, 0);
  const totalEfetuado = gastos.reduce((soma, g) => soma + (g.valor_efetuado ?? 0), 0);
  const totalDiferenca = totalPrevisto - totalEfetuado;

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="financeiro" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Financeiro</h1>
        <div className="flex gap-2">
          {gastos.length > 0 ? (
            <a
              href={`/jogos/${jogo.id}/financeiro/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Gerar PDF do Orçamento Previsto
            </a>
          ) : null}
          <Link href={`/jogos/${jogo.id}/financeiro/novo`} className="btn-primary">
            + Novo gasto
          </Link>
        </div>
      </div>

      <p className="mb-4 text-sm text-neutral-500">
        Lance o valor previsto de cada gasto deste jogo. Depois, quando o gasto acontecer de fato,
        volte no mesmo lançamento e preencha o valor efetuado — o previsto continua salvo.
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Previsto</th>
              <th className="px-4 py-3">Efetuado</th>
              <th className="px-4 py-3">Diferença</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {gastos.map((g) => {
              const diferenca = g.valor_efetuado === null ? null : g.valor_previsto - g.valor_efetuado;
              return (
                <tr key={g.id}>
                  <td className="px-4 py-3 font-medium text-neutral-800">{g.categoria?.nome ?? "—"}</td>
                  <td className="px-4 py-3">{g.descricao ?? "—"}</td>
                  <td className="px-4 py-3">{formatMoeda(g.valor_previsto)}</td>
                  <td className="px-4 py-3">{formatMoeda(g.valor_efetuado)}</td>
                  <td
                    className={`px-4 py-3 ${
                      diferenca !== null && diferenca < 0 ? "font-semibold text-red-700" : ""
                    }`}
                  >
                    {diferenca === null ? "—" : formatMoeda(diferenca)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/jogos/${jogo.id}/financeiro/${g.id}`} className="btn-secondary">
                        Editar
                      </Link>
                      <DeleteButton action={deleteGasto} id={g.id} entityLabel="gasto" />
                    </div>
                  </td>
                </tr>
              );
            })}
            {gastos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum gasto lançado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
          {gastos.length > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold text-neutral-800">
                <td className="px-4 py-3" colSpan={2}>
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
