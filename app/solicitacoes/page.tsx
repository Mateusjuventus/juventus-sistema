import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/delete-button";
import { SolicitacaoStatusSelect } from "@/components/solicitacao-status";
import { createClient } from "@/lib/supabase/server";
import { SOLICITACAO_TIPOS, SOLICITACAO_STATUS } from "@/lib/validation/schemas";
import type { SolicitacaoRow, SolicitacaoTipo, SolicitacaoStatus } from "@/lib/supabase/types";
import { deleteSolicitacao, updateSolicitacaoStatus } from "./actions";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function SolicitacoesPage({
  searchParams,
}: {
  searchParams: { tipo?: string; status?: string };
}) {
  const tipoFiltro = SOLICITACAO_TIPOS.some((t) => t.value === searchParams.tipo) ? searchParams.tipo! : "";
  const statusFiltro = SOLICITACAO_STATUS.some((s) => s.value === searchParams.status) ? searchParams.status! : "";

  const supabase = createClient();
  let query = supabase.from("solicitacoes").select("*").order("data_solicitacao", { ascending: false });
  if (tipoFiltro) query = query.eq("tipo", tipoFiltro as SolicitacaoTipo);
  if (statusFiltro) query = query.eq("status", statusFiltro as SolicitacaoStatus);

  const { data, error } = await query;
  const solicitacoes = (data ?? []) as SolicitacaoRow[];

  return (
    <AppShell>
      <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Solicitações" />

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <a
          href={`/solicitacoes/export?tipo=${encodeURIComponent(tipoFiltro)}&status=${encodeURIComponent(statusFiltro)}`}
          className="btn-secondary"
        >
          Exportar para Excel
        </a>
        <Link href="/solicitacoes/novo" className="btn-primary">
          + Nova solicitação
        </Link>
      </div>

      <form action="/solicitacoes" className="card mt-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[180px]">
          <label htmlFor="tipo" className="field-label">
            Tipo
          </label>
          <select id="tipo" name="tipo" defaultValue={tipoFiltro} className="field-input">
            <option value="">Todos</option>
            {SOLICITACAO_TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label htmlFor="status" className="field-label">
            Status
          </label>
          <select id="status" name="status" defaultValue={statusFiltro} className="field-input">
            <option value="">Todos</option>
            {SOLICITACAO_STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Filtrar
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar as solicitações. Verifique a conexão com o Supabase.
        </p>
      ) : null}

      {solicitacoes.length === 0 && !error ? (
        <div className="card mt-4 p-8 text-center text-neutral-400">Nenhuma solicitação encontrada.</div>
      ) : null}

      <div className="mt-4 space-y-3">
        {solicitacoes.map((s) => {
          const tipoLabel = SOLICITACAO_TIPOS.find((t) => t.value === s.tipo)?.label ?? s.tipo;
          const prazoFormatado = s.prazo_sugerido ? formatData(s.prazo_sugerido) : null;
          const subtitulo =
            s.tipo === "passagem_aerea" && s.origem && s.destino
              ? `${s.origem} → ${s.destino} (${s.passageiro ?? "—"})`
              : s.descricao_necessidade;
          return (
            <div key={s.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-[220px] flex-1">
                <p className="font-medium text-neutral-800">
                  {tipoLabel} · {s.solicitante}
                </p>
                {subtitulo ? (
                  <p className="mt-0.5 line-clamp-1 text-sm text-neutral-500">{subtitulo}</p>
                ) : null}
              </div>
              <div className="flex flex-col items-end text-sm text-neutral-500">
                <span>Data: {formatData(s.data_solicitacao)}</span>
                {prazoFormatado ? <span>Prazo sugerido: {prazoFormatado}</span> : null}
                {s.valor !== null ? <span>{formatMoeda(s.valor)}</span> : null}
              </div>
              <SolicitacaoStatusSelect id={s.id} status={s.status} action={updateSolicitacaoStatus} />
              <div className="flex gap-2">
                <Link href={`/solicitacoes/${s.id}`} className="btn-secondary">
                  Ver / Editar
                </Link>
                <a
                  href={`/solicitacoes/${s.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  PDF
                </a>
                <DeleteButton action={deleteSolicitacao} id={s.id} entityLabel="solicitação" />
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
