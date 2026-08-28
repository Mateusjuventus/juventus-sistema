import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SolicitacoesLista } from "@/components/solicitacoes-lista";
import { createClient } from "@/lib/supabase/server";
import { SOLICITACAO_TIPOS, SOLICITACAO_STATUS } from "@/lib/validation/schemas";
import type { SolicitacaoRow, SolicitacaoTipo, SolicitacaoStatus } from "@/lib/supabase/types";
import { deleteSolicitacao, duplicarSolicitacao, updateSolicitacaoStatus } from "./actions";

/** Espelha `app/base/solicitacoes/page.tsx`. Ordenação padrão (sem parâmetro na URL): número mais
 * alto primeiro (a solicitação mais recente, já que numera em ordem de criação). */
const COLUNA_ORDENACAO: Record<string, string> = { numero: "numero", data: "data_solicitacao" };

/** Escapa `%`, `_` e `,` antes de montar um `.or(...)` do PostgREST — sem isso, uma busca com
 * vírgula quebraria a lista de condições, e `%`/`_` seriam interpretados como curingas do LIKE em
 * vez de texto literal. */
function escapeIlike(texto: string): string {
  return texto.replace(/[%_,]/g, (c) => `\\${c}`);
}

export default async function SolicitacoesPage({
  searchParams,
}: {
  searchParams: { tipo?: string; status?: string; ordenarPor?: string; direcao?: string; busca?: string };
}) {
  const tipoFiltro = SOLICITACAO_TIPOS.some((t) => t.value === searchParams.tipo) ? searchParams.tipo! : "";
  const statusFiltro = SOLICITACAO_STATUS.some((s) => s.value === searchParams.status) ? searchParams.status! : "";
  const ordenarPor = searchParams.ordenarPor === "data" ? "data" : "numero";
  const direcao = searchParams.direcao === "asc" ? "asc" : "desc";
  const busca = (searchParams.busca ?? "").trim();

  const supabase = createClient();
  let query = supabase
    .from("solicitacoes")
    .select("*")
    .order(COLUNA_ORDENACAO[ordenarPor], { ascending: direcao === "asc" });
  if (tipoFiltro) query = query.eq("tipo", tipoFiltro as SolicitacaoTipo);
  if (statusFiltro) query = query.eq("status", statusFiltro as SolicitacaoStatus);
  if (busca) {
    const termo = escapeIlike(busca);
    const condicoes = [`solicitante.ilike.%${termo}%`, `descricao_necessidade.ilike.%${termo}%`, `setor.ilike.%${termo}%`];
    // Número da solicitação também entra na busca (ex.: digitar "31" acha "Nº 031") quando o termo
    // for só dígitos, sem os zeros à esquerda que o `.eq` numérico não aceitaria.
    const numeroBusca = /^\d+$/.test(busca) ? Number(busca) : null;
    if (numeroBusca !== null) condicoes.push(`numero.eq.${numeroBusca}`);
    query = query.or(condicoes.join(","));
  }

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
        <Link href="/solicitacoes/configuracoes" className="btn-secondary">
          Configurações
        </Link>
        <Link href="/solicitacoes/novo" className="btn-primary">
          + Nova solicitação
        </Link>
      </div>

      <form action="/solicitacoes" className="card mt-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="busca" className="field-label">
            Buscar
          </label>
          <input
            id="busca"
            name="busca"
            type="text"
            defaultValue={busca}
            placeholder="Número, solicitante, setor ou descrição..."
            className="field-input"
          />
        </div>
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
        <div className="min-w-[160px]">
          <label htmlFor="ordenarPor" className="field-label">
            Ordenar por
          </label>
          <select id="ordenarPor" name="ordenarPor" defaultValue={ordenarPor} className="field-input">
            <option value="data">Data</option>
            <option value="numero">Número</option>
          </select>
        </div>
        <div className="min-w-[160px]">
          <label htmlFor="direcao" className="field-label">
            Direção
          </label>
          <select id="direcao" name="direcao" defaultValue={direcao} className="field-input">
            <option value="desc">Decrescente</option>
            <option value="asc">Crescente</option>
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Aplicar
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

      {/* Solicitações separadas por status (Pendente/Aprovada/Recusada/Concluída), na ordem natural
          do fluxo — em vez de uma lista única, fica mais fácil ver rapidamente o que ainda está
          pendente sem precisar filtrar. Dentro de cada grupo, mantém a ordenação escolhida acima
          (Número ou Data, crescente ou decrescente) vinda da consulta. Grupos sem nenhuma
          solicitação não aparecem. Concluída ainda subagrupa por tipo, com colapso (ver
          `components/solicitacoes-lista.tsx`). */}
      <div className="mt-4">
        <SolicitacoesLista
          itens={solicitacoes}
          hrefBase="/solicitacoes"
          updateStatusAction={updateSolicitacaoStatus}
          duplicarAction={duplicarSolicitacao}
          deletarAction={deleteSolicitacao}
        />
      </div>
    </AppShell>
  );
}
