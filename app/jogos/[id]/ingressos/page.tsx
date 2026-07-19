import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import type { IngressoCargaRow, IngressoSolicitacaoRow, JogoRow } from "@/lib/supabase/types";
import { createCarga, createSolicitacao, deleteCarga, deleteSolicitacao } from "./actions";
import { CargaInlineForm } from "./carga-inline-form";
import { SolicitacaoInlineForm } from "./solicitacao-inline-form";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function IngressosJogoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: jogoData }, { data: cargasData }, { data: solicitacoesData }] = await Promise.all([
    supabase.from("jogos").select("*").eq("id", params.id).single(),
    supabase
      .from("ingressos_cargas")
      .select("*")
      .eq("jogo_id", params.id)
      .order("data", { ascending: true }),
    supabase
      .from("ingressos_solicitacoes")
      .select("*")
      .eq("jogo_id", params.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!jogoData) notFound();

  const jogo = jogoData as JogoRow;
  const cargas = (cargasData ?? []) as IngressoCargaRow[];
  const solicitacoes = (solicitacoesData ?? []) as IngressoSolicitacaoRow[];

  const totalRecebido = cargas.reduce((soma, c) => soma + c.quantidade, 0);
  const totalAtendido = solicitacoes.reduce((soma, s) => soma + s.quantidade_atendida, 0);
  const saldoDisponivel = totalRecebido - totalAtendido;

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="ingressos" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Carga de Ingressos</h1>
        {cargas.length > 0 || solicitacoes.length > 0 ? (
          <a
            href={`/jogos/${jogo.id}/ingressos/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Gerar PDF
          </a>
        ) : null}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card px-4 py-3">
          <p className="text-xs uppercase text-neutral-500">Total recebido</p>
          <p className="text-2xl font-bold text-grena-escuro">{totalRecebido}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-xs uppercase text-neutral-500">Total atendido</p>
          <p className="text-2xl font-bold text-grena-escuro">{totalAtendido}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-xs uppercase text-neutral-500">Saldo disponível</p>
          <p className={`text-2xl font-bold ${saldoDisponivel <= 0 ? "text-red-700" : "text-grena-escuro"}`}>
            {saldoDisponivel}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-base font-semibold text-neutral-800">Cargas recebidas</h2>
        <div className="mb-3">
          <CargaInlineForm jogoId={jogo.id} action={createCarga} />
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Quantidade</th>
                <th className="px-4 py-3">Observações</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {cargas.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">{formatData(c.data)}</td>
                  <td className="px-4 py-3 font-medium text-neutral-800">{c.quantidade}</td>
                  <td className="px-4 py-3">{c.observacoes ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/jogos/${jogo.id}/ingressos/cargas/${c.id}`} className="btn-secondary">
                        Editar
                      </Link>
                      <DeleteButton action={deleteCarga} id={c.id} entityLabel="carga" />
                    </div>
                  </td>
                </tr>
              ))}
              {cargas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                    Nenhuma carga lançada ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-neutral-800">Solicitações</h2>
        <div className="mb-3">
          <SolicitacaoInlineForm jogoId={jogo.id} action={createSolicitacao} />
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Solicitado</th>
                <th className="px-4 py-3">Atendido</th>
                <th className="px-4 py-3">Observações</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {solicitacoes.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-neutral-800">{s.nome_solicitante}</td>
                  <td className="px-4 py-3">{s.quantidade_solicitada}</td>
                  <td
                    className={`px-4 py-3 ${
                      s.quantidade_atendida < s.quantidade_solicitada ? "font-semibold text-amber-700" : ""
                    }`}
                  >
                    {s.quantidade_atendida}
                  </td>
                  <td className="px-4 py-3">{s.observacoes ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/jogos/${jogo.id}/ingressos/solicitacoes/${s.id}`}
                        className="btn-secondary"
                      >
                        Editar
                      </Link>
                      <DeleteButton action={deleteSolicitacao} id={s.id} entityLabel="solicitação" />
                    </div>
                  </td>
                </tr>
              ))}
              {solicitacoes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                    Nenhuma solicitação lançada ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
