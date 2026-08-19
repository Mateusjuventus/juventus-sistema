import Link from "next/link";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { calcularGeralBase, valorDespesaBase } from "@/lib/futebol/financeiro-base";
import { DonutComposicao, type FatiaComposicao } from "@/components/charts/donut-composicao";
import { BarrasCategoria } from "@/components/charts/barras-categoria";
import type {
  AtletaBaseRow,
  ComissaoTecnicaBaseRow,
  DespesaAvulsaBaseComCategoriaRow,
} from "@/lib/supabase/types";
import { deleteDespesaBase } from "./despesas/actions";

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function StatCard({ label, valor, ajuda }: { label: string; valor: string; ajuda?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-grena-escuro">{valor}</p>
      {ajuda ? <p className="mt-1 text-xs text-neutral-400">{ajuda}</p> : null}
    </div>
  );
}

/**
 * Conteúdo da aba "Geral da Base" de `/base/financeiro` (`?aba=geral`) — soma salário da Comissão
 * Técnica + ajuda de custo dos Atletas (valores cadastrados agora, não um histórico) + despesas
 * avulsas da Base. Totalmente separado da Prestação de Contas de jogos (aba "Jogos"), por decisão
 * explícita. Ver docs/superpowers/specs/2026-08-19-financeiro-base-design.md — o cálculo em si
 * (inclusive a divisão do salário de quem atua em mais de uma categoria) vive em
 * `lib/futebol/financeiro-base.ts`, reaproveitado pelo relatório em PDF desta mesma aba.
 */
export async function GeralBaseView() {
  const supabase = createClient();

  const [{ data: comissaoData }, { data: atletasData }, { data: despesasData }] = await Promise.all([
    supabase.from("comissao_tecnica_base").select("*").order("nome_completo", { ascending: true }),
    supabase.from("atletas_base").select("*").order("nome_completo", { ascending: true }),
    supabase
      .from("despesas_avulsas_base")
      .select("*, categoria_gasto:categorias_gasto(nome)")
      .order("data", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  const comissao = (comissaoData ?? []) as ComissaoTecnicaBaseRow[];
  const atletas = (atletasData ?? []) as AtletaBaseRow[];
  const despesas = (despesasData ?? []) as DespesaAvulsaBaseComCategoriaRow[];
  const atletasComAjuda = atletas.filter((a) => (a.valor_ajuda_custo ?? 0) > 0);

  const { custoComissao, custoAtletas, custoMensalFixo, despesasTotal, totalGeral, linhasCategoria } =
    calcularGeralBase(comissao, atletasComAjuda, despesas);

  // As mesmas 3 cores da marca (grená / dourado / cinza neutro já usado no resto do app) — nada
  // inventado só pro gráfico. `grenaEscuro` fica de fora de propósito: é reservado só pra texto
  // pequeno, não pra preenchimento de área (ver CLAUDE.md).
  const composicao: FatiaComposicao[] = [
    { label: "Comissão Técnica", valor: custoComissao, cor: "#5C0A35" },
    { label: "Atletas (ajuda de custo)", valor: custoAtletas, cor: "#B98F1E" },
    { label: "Despesas avulsas", valor: despesasTotal, cor: "#a3a3a3" },
  ];

  return (
    <>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <a
          href="/base/financeiro/pdf-geral"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          Gerar Relatório PDF
        </a>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Custo mensal fixo"
          valor={formatMoeda(custoMensalFixo)}
          ajuda="Salários da Comissão Técnica + ajuda de custo dos atletas cadastrados agora"
        />
        <StatCard
          label="Despesas avulsas"
          valor={formatMoeda(despesasTotal)}
          ajuda="Soma de tudo lançado na lista abaixo"
        />
        <StatCard label="Total geral da Base" valor={formatMoeda(totalGeral)} />
      </div>

      <h2 className="mt-8 text-lg font-bold text-grena-escuro">Composição do gasto</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Passe o mouse numa fatia ou na legenda pra ver o valor exato.
      </p>
      <div className="card mt-3 p-5">
        <DonutComposicao fatias={composicao} total={totalGeral} />
      </div>

      <h2 className="mt-8 text-lg font-bold text-grena-escuro">Por categoria</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Quem atua em mais de uma categoria tem o salário dividido igual entre elas aqui. Passe o
        mouse numa barra pra ver o % do total geral.
      </p>
      <div className="card mt-3 p-4">
        <BarrasCategoria linhas={linhasCategoria} />
      </div>

      <h2 className="mt-8 text-lg font-bold text-grena-escuro">Comissão Técnica</h2>
      <div className="card tabela-rolavel mt-3">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Função</th>
              <th className="px-4 py-3">Categoria(s)</th>
              <th className="px-4 py-3">Salário mensal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {comissao.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-neutral-800">{c.nome_completo}</td>
                <td className="px-4 py-3">{c.funcao}</td>
                <td className="px-4 py-3">{c.categorias.map(categoriaBaseLabel).join(" · ")}</td>
                <td className="px-4 py-3">{c.valor_salario ? formatMoeda(c.valor_salario) : "—"}</td>
              </tr>
            ))}
            {comissao.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum integrante da Comissão Técnica cadastrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
          {comissao.length > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold text-neutral-800">
                <td className="px-4 py-3" colSpan={3}>
                  Total
                </td>
                <td className="px-4 py-3">{formatMoeda(custoComissao)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <h2 className="mt-8 text-lg font-bold text-grena-escuro">Atletas</h2>
      <p className="mt-1 text-sm text-neutral-500">Só aparecem aqui os atletas com ajuda de custo cadastrada.</p>
      <div className="card tabela-rolavel mt-3">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Ajuda de custo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {atletasComAjuda.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium text-neutral-800">{a.nome_completo}</td>
                <td className="px-4 py-3">{categoriaBaseLabel(a.categoria)}</td>
                <td className="px-4 py-3">{formatMoeda(a.valor_ajuda_custo ?? 0)}</td>
              </tr>
            ))}
            {atletasComAjuda.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum atleta com ajuda de custo cadastrada.
                </td>
              </tr>
            ) : null}
          </tbody>
          {atletasComAjuda.length > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold text-neutral-800">
                <td className="px-4 py-3" colSpan={2}>
                  Total
                </td>
                <td className="px-4 py-3">{formatMoeda(custoAtletas)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-grena-escuro">Despesas avulsas da Base</h2>
        <Link href="/base/financeiro/despesas/novo" className="btn-primary">
          + Nova despesa
        </Link>
      </div>
      <div className="card tabela-rolavel">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {despesas.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 text-neutral-600">{formatData(d.data)}</td>
                <td className="px-4 py-3 font-medium text-neutral-800">
                  {d.categoria ? categoriaBaseLabel(d.categoria) : "Geral"}
                </td>
                <td className="px-4 py-3">{d.categoria_gasto?.nome ?? "—"}</td>
                <td className="px-4 py-3">{d.descricao ?? "—"}</td>
                <td className="px-4 py-3">
                  {formatMoeda(valorDespesaBase(d))}
                  {d.valor_efetuado === null ? (
                    <span className="ml-1 text-xs text-neutral-400">(previsto)</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/base/financeiro/despesas/${d.id}`} className="btn-secondary">
                      Editar
                    </Link>
                    <DeleteButton action={deleteDespesaBase} id={d.id} entityLabel="despesa" />
                  </div>
                </td>
              </tr>
            ))}
            {despesas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
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
                <td className="px-4 py-3">{formatMoeda(despesasTotal)}</td>
                <td />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </>
  );
}
