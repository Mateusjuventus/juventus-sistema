import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import type {
  EstoqueEntradaItemBaseRow,
  EstoqueEntradaBaseRow,
  EstoqueSaidaItemBaseRow,
  EstoqueSaidaBaseRow,
} from "@/lib/supabase/types";
import { deleteEntradaBase, deleteSaidaBase } from "../actions";

function formatData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function somarPorFicha(itens: { quantidade: number }[]): number {
  return itens.reduce((soma, i) => soma + Number(i.quantidade), 0);
}

/** Espelha `app/estoque/[categoria]/historico/page.tsx` para o Futebol de Base. */
export default async function HistoricoEstoqueBasePage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim();

  const supabase = createClient();

  let saidasQuery = supabase.from("estoque_saidas_base").select("*").order("numero", { ascending: false });
  if (q) saidasQuery = saidasQuery.ilike("nome_destinatario", `%${q}%`);

  let entradasQuery = supabase.from("estoque_entradas_base").select("*").order("numero", { ascending: false });
  if (q) entradasQuery = entradasQuery.ilike("fornecedor", `%${q}%`);

  const [{ data: saidasData }, { data: entradasData }, master] = await Promise.all([
    saidasQuery,
    entradasQuery,
    isMaster(supabase),
  ]);
  const saidas = (saidasData ?? []) as EstoqueSaidaBaseRow[];
  const entradas = (entradasData ?? []) as EstoqueEntradaBaseRow[];

  const [{ data: saidaItensData }, { data: entradaItensData }] = await Promise.all([
    saidas.length > 0
      ? supabase
          .from("estoque_saida_itens_base")
          .select("*")
          .in(
            "saida_id",
            saidas.map((s) => s.id),
          )
      : Promise.resolve({ data: [] as EstoqueSaidaItemBaseRow[] }),
    entradas.length > 0
      ? supabase
          .from("estoque_entrada_itens_base")
          .select("*")
          .in(
            "entrada_id",
            entradas.map((e) => e.id),
          )
      : Promise.resolve({ data: [] as EstoqueEntradaItemBaseRow[] }),
  ]);

  const saidaItens = (saidaItensData ?? []) as EstoqueSaidaItemBaseRow[];
  const entradaItens = (entradaItensData ?? []) as EstoqueEntradaItemBaseRow[];

  const totalPorSaida = new Map(
    saidas.map((s) => [s.id, somarPorFicha(saidaItens.filter((i) => i.saida_id === s.id))]),
  );
  const totalPorEntrada = new Map(
    entradas.map((e) => [e.id, somarPorFicha(entradaItens.filter((i) => i.entrada_id === e.id))]),
  );

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/estoque" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Estoque
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Histórico — Estoque</h1>

      <form action="/base/estoque/historico" className="card mt-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px]">
          <label htmlFor="q" className="field-label">
            Buscar por destinatário / fornecedor
          </label>
          <input id="q" name="q" defaultValue={q} className="field-input" placeholder="Nome..." />
        </div>
        <button type="submit" className="btn-secondary">
          Filtrar
        </button>
      </form>

      <h2 className="mt-6 text-lg font-semibold text-neutral-700">Saídas</h2>
      <div className="card mt-2 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Ficha Nº</th>
              <th className="px-4 py-3 font-semibold">Data</th>
              <th className="px-4 py-3 font-semibold">Destinatário</th>
              <th className="px-4 py-3 font-semibold">Departamento</th>
              <th className="px-4 py-3 text-right font-semibold">Itens</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {saidas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Nenhuma saída encontrada.
                </td>
              </tr>
            ) : (
              saidas.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-neutral-800">{String(s.numero).padStart(4, "0")}</td>
                  <td className="px-4 py-3">{formatData(s.data)}</td>
                  <td className="px-4 py-3">{s.nome_destinatario}</td>
                  <td className="px-4 py-3">{s.departamento || "—"}</td>
                  <td className="px-4 py-3 text-right">{totalPorSaida.get(s.id) ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/base/estoque/saida/${s.id}`} className="btn-secondary btn-sm">
                        Ver
                      </Link>
                      <a
                        href={`/base/estoque/saida/${s.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary btn-sm"
                      >
                        Reimprimir
                      </a>
                      {master ? <DeleteButton action={deleteSaidaBase} id={s.id} entityLabel="saída" /> : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-6 text-lg font-semibold text-neutral-700">Entradas</h2>
      <div className="card mt-2 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Entrada Nº</th>
              <th className="px-4 py-3 font-semibold">Data</th>
              <th className="px-4 py-3 font-semibold">Fornecedor</th>
              <th className="px-4 py-3 font-semibold">Nota Fiscal</th>
              <th className="px-4 py-3 text-right font-semibold">Itens</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {entradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Nenhuma entrada encontrada.
                </td>
              </tr>
            ) : (
              entradas.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium text-neutral-800">{String(e.numero).padStart(4, "0")}</td>
                  <td className="px-4 py-3">{formatData(e.data)}</td>
                  <td className="px-4 py-3">{e.fornecedor || "—"}</td>
                  <td className="px-4 py-3">{e.nota_fiscal || "—"}</td>
                  <td className="px-4 py-3 text-right">{totalPorEntrada.get(e.id) ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/base/estoque/entrada/${e.id}`} className="btn-secondary btn-sm">
                        Ver
                      </Link>
                      <a
                        href={`/base/estoque/entrada/${e.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary btn-sm"
                      >
                        Reimprimir
                      </a>
                      {master ? <DeleteButton action={deleteEntradaBase} id={e.id} entityLabel="entrada" /> : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
