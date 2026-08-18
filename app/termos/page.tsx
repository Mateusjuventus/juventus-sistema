import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { hojeBrasilia } from "@/lib/data-brasil";
import {
  formatMoeda,
  itensParaTotal,
  SITUACAO_LABEL,
  situacaoDoTermo,
  totalDoTermo,
  type TermoSituacao,
} from "@/lib/futebol/termo-retirada";
import type { TermoRetiradaItemRow, TermoRetiradaRow } from "@/lib/supabase/types";

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

const SITUACAO_CLASSE: Record<TermoSituacao, string> = {
  devolvido: "bg-emerald-50 text-emerald-700",
  em_aberto: "bg-amber-50 text-amber-700",
  atrasado: "bg-red-50 text-red-700",
  definitiva: "bg-neutral-100 text-neutral-600",
};

/**
 * Lista dos Termos de Retirada. O filtro padrão é "em aberto" porque o valor do módulo está em
 * saber o que ainda está fora do clube — ver docs/superpowers/specs/2026-08-11-termos-retirada-design.md.
 */
export default async function TermosPage({ searchParams }: { searchParams: { situacao?: string } }) {
  const supabase = createClient();
  const hojeStr = hojeBrasilia();

  const [{ data: termosData }, { data: itensData }] = await Promise.all([
    supabase.from("termos_retirada").select("*").order("numero", { ascending: false }),
    supabase.from("termo_retirada_itens").select("*"),
  ]);

  const termos = (termosData ?? []) as TermoRetiradaRow[];
  const itens = (itensData ?? []) as TermoRetiradaItemRow[];

  const itensPorTermo = new Map<string, TermoRetiradaItemRow[]>();
  for (const item of itens) {
    const lista = itensPorTermo.get(item.termo_id) ?? [];
    lista.push(item);
    itensPorTermo.set(item.termo_id, lista);
  }

  const filtro = searchParams.situacao ?? "pendentes";
  const comSituacao = termos.map((t) => ({ termo: t, situacao: situacaoDoTermo(t, hojeStr) }));
  const visiveis = comSituacao.filter(({ situacao }) => {
    if (filtro === "todos") return true;
    if (filtro === "devolvidos") return situacao === "devolvido";
    if (filtro === "definitivas") return situacao === "definitiva";
    return situacao === "em_aberto" || situacao === "atrasado";
  });

  const atrasados = comSituacao.filter(({ situacao }) => situacao === "atrasado").length;
  const emAberto = comSituacao.filter(({ situacao }) => situacao === "em_aberto").length;

  const abas = [
    { chave: "pendentes", label: `Em aberto (${emAberto + atrasados})` },
    { chave: "devolvidos", label: "Devolvidos" },
    { chave: "definitivas", label: "Definitivas" },
    { chave: "todos", label: "Todos" },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Termos de Retirada"
        pendencia={atrasados > 0 ? `${atrasados} termo(s) com devolução atrasada` : null}
      />
      <p className="mt-1 text-center text-sm text-neutral-500">
        Termo de responsabilidade assinado no ato da retirada de material do clube.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {abas.map((aba) => (
            <Link
              key={aba.chave}
              href={`/termos?situacao=${aba.chave}`}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                filtro === aba.chave
                  ? "bg-grena text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {aba.label}
            </Link>
          ))}
        </div>
        <Link href="/termos/novo" className="btn-primary">
          + Novo termo
        </Link>
      </div>

      <div className="card tabela-rolavel mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linha bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Itens</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Devolução</th>
              <th className="px-4 py-3">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {visiveis.map(({ termo, situacao }) => {
              const itensDoTermo = itensPorTermo.get(termo.id) ?? [];
              const total = totalDoTermo(itensParaTotal(itensDoTermo));
              return (
                <tr key={termo.id} className="cursor-pointer hover:bg-neutral-50">
                  <td className="px-4 py-3 font-semibold text-grena-escuro">
                    <Link href={`/termos/${termo.id}`}>{String(termo.numero).padStart(4, "0")}</Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    <Link href={`/termos/${termo.id}`}>{formatData(termo.data)}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/termos/${termo.id}`} className="font-medium text-neutral-800">
                      {termo.responsavel_nome}
                    </Link>
                    {termo.funcao ? <span className="ml-1 text-xs text-neutral-400">· {termo.funcao}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {itensDoTermo.length === 1 ? "1 item" : `${itensDoTermo.length} itens`}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{total > 0 ? formatMoeda(total) : "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {termo.tipo === "definitiva"
                      ? "—"
                      : termo.devolvido_em
                        ? formatData(termo.devolvido_em)
                        : termo.previsao_devolucao
                          ? `prev. ${formatData(termo.previsao_devolucao)}`
                          : "sem previsão"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SITUACAO_CLASSE[situacao]}`}>
                      {SITUACAO_LABEL[situacao]}
                    </span>
                  </td>
                </tr>
              );
            })}
            {visiveis.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum termo nesta situação.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
