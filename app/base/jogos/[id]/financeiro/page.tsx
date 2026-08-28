import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { DeleteButton } from "@/components/delete-button";
import { BlocoAssinaturaDigital } from "@/components/bloco-assinatura-digital";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { papeisAssinaturaFinanceiro, podeAssinarPapel } from "@/lib/assinaturas/config";
import { buscarAssinaturas } from "@/lib/assinaturas/actions";
import type { ConfiguracaoFinanceiroBaseRow, GastoJogoBaseComCategoriaRow, JogoBaseRow } from "@/lib/supabase/types";
import { deleteGastoBase } from "./actions";

function formatMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Espelha `app/jogos/[id]/financeiro/page.tsx` para o Futebol de Base. */
export default async function FinanceiroJogoBasePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [
    { data: jogoData },
    { data: gastosData },
    { data: configData },
    {
      data: { user },
    },
    master,
    assinaturasOrcamento,
    assinaturasDespesas,
  ] = await Promise.all([
    supabase.from("jogos_base").select("*").eq("id", params.id).single(),
    supabase
      .from("gastos_jogo_base")
      .select("*, categoria:categorias_gasto(nome)")
      .eq("jogo_id", params.id)
      .order("created_at", { ascending: true }),
    supabase.from("configuracoes_financeiro_base").select("*").limit(1).maybeSingle(),
    supabase.auth.getUser(),
    isMaster(supabase),
    buscarAssinaturas("orcamento_jogo", params.id),
    buscarAssinaturas("despesas_jogo", params.id),
  ]);

  if (!jogoData) notFound();

  const jogo = jogoData as JogoBaseRow;
  const gastos = (gastosData ?? []) as GastoJogoBaseComCategoriaRow[];
  const configFinanceiro = configData as ConfiguracaoFinanceiroBaseRow | null;

  const totalPrevisto = gastos.reduce((soma, g) => soma + g.valor_previsto, 0);
  const totalEfetuado = gastos.reduce((soma, g) => soma + (g.valor_efetuado ?? 0), 0);
  const totalDiferenca = totalPrevisto - totalEfetuado;
  const temEfetuado = gastos.some((g) => g.valor_efetuado !== null);

  const papeisFinanceiro = papeisAssinaturaFinanceiro({
    assinatura1Cargo: configFinanceiro?.assinatura1_cargo ?? "",
    assinatura2Cargo: configFinanceiro?.assinatura2_cargo ?? "",
  });
  const papeisQuePossoAssinar = user
    ? (["assinatura1", "assinatura2"] as const).filter((papel) =>
        podeAssinarPapel(
          papel === "assinatura1" ? configFinanceiro?.assinatura1_usuario_id : configFinanceiro?.assinatura2_usuario_id,
          user.id,
          master,
        ),
      )
    : [];

  const base = `/base/jogos/${jogo.id}`;

  return (
    <AppShell departamento="futebol_base">
      <JogoTabsBase jogoId={jogo.id} active="financeiro" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Financeiro</h1>
        <div className="flex gap-2">
          {gastos.length > 0 ? (
            <a
              href={`${base}/financeiro/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Gerar PDF do Orçamento Previsto (Pré Jogo)
            </a>
          ) : null}
          {temEfetuado ? (
            <a
              href={`${base}/financeiro/despesas/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Gerar PDF do Relatório de Despesas (Pós Jogo)
            </a>
          ) : null}
          <Link href={`${base}/financeiro/novo`} className="btn-primary">
            + Novo gasto
          </Link>
        </div>
      </div>

      <p className="mb-4 text-sm text-neutral-500">
        Lance o valor previsto de cada gasto deste jogo. Depois, quando o gasto acontecer de fato,
        volte no mesmo lançamento e preencha o valor efetuado — o previsto continua salvo.
      </p>

      <div className="card tabela-rolavel">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Data de Pagamento</th>
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
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`${base}/financeiro/${g.id}`} className="btn-secondary">
                        Editar
                      </Link>
                      <DeleteButton action={deleteGastoBase} id={g.id} entityLabel="gasto" />
                    </div>
                  </td>
                </tr>
              );
            })}
            {gastos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum gasto lançado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
          {gastos.length > 0 ? (
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

      {gastos.length > 0 ? (
        <div className="mt-4">
          <p className="mb-1 text-sm font-semibold text-neutral-700">Orçamento Previsto (Pré Jogo)</p>
          <BlocoAssinaturaDigital
            tipoDocumento="orcamento_jogo"
            documentoId={jogo.id}
            caminhoRevalidar={`${base}/financeiro`}
            papeis={papeisFinanceiro}
            assinaturas={assinaturasOrcamento}
            papeisQuePossoAssinar={[...papeisQuePossoAssinar]}
          />
        </div>
      ) : null}

      {temEfetuado ? (
        <div className="mt-4">
          <p className="mb-1 text-sm font-semibold text-neutral-700">Relatório de Despesas (Pós Jogo)</p>
          <BlocoAssinaturaDigital
            tipoDocumento="despesas_jogo"
            documentoId={jogo.id}
            caminhoRevalidar={`${base}/financeiro`}
            papeis={papeisFinanceiro}
            assinaturas={assinaturasDespesas}
            papeisQuePossoAssinar={[...papeisQuePossoAssinar]}
          />
        </div>
      ) : null}
    </AppShell>
  );
}
