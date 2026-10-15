import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { DeleteButton } from "@/components/delete-button";
import { BlocoAssinaturaDigital } from "@/components/bloco-assinatura-digital";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { verificarAcessoJogoBase } from "@/lib/auth/jogos-base-guard";
import { papeisAssinaturaFinanceiro, podeAssinarPapel } from "@/lib/assinaturas/config";
import { buscarAssinaturas, possuiAssinaturaCadastrada, resolverImagensAssinaturas } from "@/lib/assinaturas/actions";
import type { ConfiguracaoFinanceiroBaseRow, GastoJogoBaseComCategoriaRow } from "@/lib/supabase/types";
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

/** "pre_jogo" | "pos_jogo" | null — ordem fixa de exibição; "Sem fase definida" só aparece se
 * houver gasto legado sem fase. Ver docs/superpowers/specs/2026-10-14-gastos-jogo-fase-design.md. */
const ORDEM_FASES: Array<string | null> = ["pre_jogo", "pos_jogo", null];

function labelFase(fase: string | null): string {
  if (fase === "pre_jogo") return "Pré-jogo";
  if (fase === "pos_jogo") return "Pós-jogo";
  return "Sem fase definida";
}

function TabelaGastosFase({
  fase,
  gastos,
  base,
}: {
  fase: string | null;
  gastos: GastoJogoBaseComCategoriaRow[];
  base: string;
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
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/** Espelha `app/jogos/[id]/financeiro/page.tsx` para o Futebol de Base. */
export default async function FinanceiroJogoBasePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [
    jogo,
    { data: gastosData },
    { data: configData },
    {
      data: { user },
    },
    master,
    assinaturasOrcamento,
    assinaturasDespesas,
  ] = await Promise.all([
    verificarAcessoJogoBase(supabase, params.id),
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

  if (!jogo) notFound();

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
  const [assinaturasOrcamentoComImagem, assinaturasDespesasComImagem, minhaAssinaturaCadastrada] = await Promise.all([
    resolverImagensAssinaturas(supabase, assinaturasOrcamento),
    resolverImagensAssinaturas(supabase, assinaturasDespesas),
    user ? possuiAssinaturaCadastrada(supabase, user.id) : Promise.resolve(false),
  ]);

  const base = `/base/jogos/${jogo.id}`;

  return (
    <AppShell departamento="futebol_base" breadcrumb="Financeiro">
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

      {gastos.length === 0 ? (
        <div className="card px-4 py-8 text-center text-neutral-400">Nenhum gasto lançado ainda.</div>
      ) : (
        ORDEM_FASES.filter((fase) => gastos.some((g) => (g.fase ?? null) === fase)).map((fase) => (
          <TabelaGastosFase
            key={fase ?? "sem_fase"}
            fase={fase}
            gastos={gastos.filter((g) => (g.fase ?? null) === fase)}
            base={base}
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

      {gastos.length > 0 ? (
        <div className="mt-4">
          <p className="mb-1 text-sm font-semibold text-neutral-700">Orçamento Previsto (Pré Jogo)</p>
          <BlocoAssinaturaDigital
            tipoDocumento="orcamento_jogo"
            documentoId={jogo.id}
            caminhoRevalidar={`${base}/financeiro`}
            papeis={papeisFinanceiro}
            assinaturas={assinaturasOrcamentoComImagem}
            papeisQuePossoAssinar={[...papeisQuePossoAssinar]}
            minhaAssinaturaCadastrada={minhaAssinaturaCadastrada}
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
            assinaturas={assinaturasDespesasComImagem}
            papeisQuePossoAssinar={[...papeisQuePossoAssinar]}
            minhaAssinaturaCadastrada={minhaAssinaturaCadastrada}
          />
        </div>
      ) : null}
    </AppShell>
  );
}
