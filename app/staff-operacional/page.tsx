import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { formatCPF } from "@/lib/validation/cpf";
import type { StaffFuncaoCatalogoRow, StaffOperacionalComFuncaoRow } from "@/lib/supabase/types";
import { deleteStaff } from "./actions";

function formatMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function StaffOperacionalPage({
  searchParams,
}: {
  searchParams: { q?: string; funcaoId?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const funcaoId = searchParams.funcaoId?.trim() ?? "";
  const supabase = createClient();

  let query = supabase
    .from("staff_operacional")
    .select("*, funcao:staff_funcoes_catalogo(nome)")
    .order("nome_completo", { ascending: true });
  if (q) query = query.ilike("nome_completo", `%${q}%`);
  if (funcaoId) query = query.eq("funcao_id", funcaoId);

  const [{ data, error }, { data: funcoesData }] = await Promise.all([
    query,
    supabase.from("staff_funcoes_catalogo").select("*").order("nome", { ascending: true }),
  ]);
  const staff = (data ?? []) as StaffOperacionalComFuncaoRow[];
  const funcoes = (funcoesData ?? []) as StaffFuncaoCatalogoRow[];

  return (
    <AppShell>
      <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Staff Operacional" />
      <div className="mt-3 flex justify-end">
        <Link href="/staff-operacional/novo" className="btn-primary">
          + Novo staff
        </Link>
      </div>

      <div className="card mt-4 p-4">
        <SearchBar action="/staff-operacional" defaultValue={q} placeholder="Buscar por nome...">
          <div className="min-w-[180px]">
            <label htmlFor="funcaoId" className="field-label">
              Função/setor
            </label>
            <select id="funcaoId" name="funcaoId" defaultValue={funcaoId} className="field-input">
              <option value="">Todas</option>
              {funcoes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
        </SearchBar>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar os registros. Verifique a conexão com o Supabase.
        </p>
      ) : null}

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Função/Setor</th>
              <th className="px-4 py-3">CPF</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Chave PIX</th>
              <th className="px-4 py-3">Valor padrão</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {staff.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-neutral-800">{s.nome_completo}</td>
                <td className="px-4 py-3">{s.funcao?.nome ?? "—"}</td>
                <td className="px-4 py-3">{formatCPF(s.cpf)}</td>
                <td className="px-4 py-3">{s.telefone ?? "—"}</td>
                <td className="px-4 py-3">{s.chave_pix ?? "—"}</td>
                <td className="px-4 py-3">{formatMoeda(s.valor_padrao_pagamento)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/staff-operacional/${s.id}`} className="btn-secondary">
                      Editar
                    </Link>
                    <DeleteButton action={deleteStaff} id={s.id} entityLabel="registro" />
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && !error ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
