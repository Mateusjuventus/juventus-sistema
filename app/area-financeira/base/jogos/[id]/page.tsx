import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaFinanceiraHeader } from "@/components/area-financeira/area-financeira-header";
import { createClient } from "@/lib/supabase/server";
import { podeVerAreaFinanceira } from "@/lib/auth/role";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { GastoJogoComCategoriaRow, JogoRow } from "@/lib/supabase/types";

function formatMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** "pre_jogo" | "pos_jogo" | null — mesma ordem fixa de `app/base/jogos/[id]/financeiro/page.tsx`. */
const ORDEM_FASES: Array<string | null> = ["pre_jogo", "pos_jogo", null];

function labelFase(fase: string | null): string {
  if (fase === "pre_jogo") return "Pré-jogo";
  if (fase === "pos_jogo") return "Pós-jogo";
  return "Sem fase definida";
}

/** Mesma tabela de `app/base/jogos/[id]/financeiro/page.tsx`, sem a coluna "Ações" (Editar/
 * Excluir) — essa versão é só leitura (ver docs/superpowers/specs/2026-10-22-area-financeira-
 * design.md). */
function TabelaGastosFaseLeitura({
  fase,
  gastos,
}: {
  fase: string | null;
  gastos: GastoJogoComCategoriaRow[];
}) {
  const totalPrevisto = gastos.reduce((soma, g) => soma + g.valor_previsto, 0);
  const totalEfetuado = gastos.reduce((soma, g) => soma + (g.valor_efetuado ?? 0), 0);
  const totalDiferenca = totalPrevisto - totalEfetuado;

  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-grena-escuro">
        {labelFase(fase)}
      </h2>
      <div className="card tabela-rolavel">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Data de Pagamento</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Previsto</th>
              <th className="px-4 py-3">Efetuado</th>
              <th className="px-4 py-3">Diferença</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {gastos.map((g) => {
              const diferenca = g.valor_efetuado === null ? null : g.valor_previsto - g.valor_efetuado;
              return (
                <tr key={g.id}>
                  <td className="px-4 py-3 text-neutral-600">{formatData(g.data)}</td>
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
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold text-neutral-800">
              <td className="px-4 py-3" colSpan={3}>
                Subtotal {labelFase(fase)}
              </td>
              <td className="px-4 py-3">{formatMoeda(totalPrevisto)}</td>
              <td className="px-4 py-3">{formatMoeda(totalEfetuado)}</td>
              <td className={`px-4 py-3 ${totalDiferenca < 0 ? "text-red-700" : ""}`}>
                {formatMoeda(totalDiferenca)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/**
 * Financeiro de um jogo da Base, versão só-leitura da Área Financeira — espelha
 * `app/area-financeira/jogos/[id]/page.tsx` (Profissional). Consulta `jogos`/`gastos_jogo` direto
 * por id (desde a unificação de Jogos/Convocação de 30/10/2026, ver 0157_unificacao_jogos.sql, são
 * as mesmas tabelas do Profissional), sem passar pelo guard de categoria
 * (`verificarAcessoJogoBase`): esse papel não é escopado por categoria, vê os jogos dos dois
 * departamentos sempre (ver docs/superpowers/specs/2026-10-22-area-financeira-design.md).
 */
export default async function AreaFinanceiraJogoBasePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const autorizado = await podeVerAreaFinanceira(supabase);

  if (!autorizado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-pagina px-4 py-10 text-center">
        <p className="max-w-sm text-neutral-600">Você não tem acesso a esta área.</p>
      </div>
    );
  }

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
  const temEfetuado = gastos.some((g) => g.valor_efetuado !== null);

  return (
    <div className="min-h-screen bg-pagina">
      <AreaFinanceiraHeader />

      <main className="mx-auto max-w-[1184px] px-4 py-6 sm:py-8">
        <Link href="/area-financeira" className="text-sm font-medium text-grena hover:underline">
          ← Voltar
        </Link>

        <div className="mb-4 mt-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-grena-escuro">
              {jogo.mandante ? "Juventus" : jogo.adversario_nome} x{" "}
              {jogo.mandante ? jogo.adversario_nome : "Juventus"}
            </h1>
            <p className="text-sm text-neutral-500">
              {categoriaBaseLabel(jogo.categoria)} · {jogo.competicao} · {formatData(jogo.data_jogo)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {gastos.length > 0 ? (
              <a
                href={`/base/jogos/${jogo.id}/financeiro/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Gerar PDF do Orçamento Previsto (Pré Jogo)
              </a>
            ) : null}
            {temEfetuado ? (
              <a
                href={`/base/jogos/${jogo.id}/financeiro/despesas/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Gerar PDF do Relatório de Despesas (Pós Jogo)
              </a>
            ) : null}
          </div>
        </div>

        {gastos.length === 0 ? (
          <div className="card px-4 py-8 text-center text-neutral-400">Nenhum gasto lançado ainda.</div>
        ) : (
          ORDEM_FASES.filter((fase) => gastos.some((g) => (g.fase ?? null) === fase)).map((fase) => (
            <TabelaGastosFaseLeitura
              key={fase ?? "sem_fase"}
              fase={fase}
              gastos={gastos.filter((g) => (g.fase ?? null) === fase)}
            />
          ))
        )}

        {gastos.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center justify-end gap-6 rounded-md bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-800">
            <span className="uppercase tracking-wide text-grena-escuro">Total Geral</span>
            <span>Previsto: {formatMoeda(totalPrevisto)}</span>
            <span>Efetuado: {formatMoeda(totalEfetuado)}</span>
            <span className={totalDiferenca < 0 ? "text-red-700" : ""}>
              Diferença: {formatMoeda(totalDiferenca)}
            </span>
          </div>
        ) : null}
      </main>
    </div>
  );
}
