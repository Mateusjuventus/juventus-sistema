import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { descricaoVeiculo, formatPlaca, PESSOA_TIPO_LABEL } from "@/lib/futebol/veiculo";
import type { VeiculoRow } from "@/lib/supabase/types";
import { alternarVeiculoAtivo, excluirVeiculo } from "./actions";
import { VeiculoAtivoButton } from "./veiculo-ativo-button";

/**
 * Cadastro de Veículos / Placas. A lista é a base da Relação de Placas — daí o botão de gerar o
 * documento ficar no topo, junto do "novo veículo".
 */
export default async function VeiculosPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim() ?? "";
  const supabase = createClient();

  let query = supabase.from("veiculos").select("*").order("nome", { ascending: true });
  if (q) query = query.or(`nome.ilike.%${q}%,placa.ilike.%${q.replace(/[^a-zA-Z0-9]/g, "")}%`);

  const { data, error } = await query;
  const veiculos = (data ?? []) as VeiculoRow[];
  const ativos = veiculos.filter((v) => v.ativo);
  const inativos = veiculos.filter((v) => !v.ativo);

  return (
    <AppShell>
      <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Veículos / Placas" />
      <p className="mt-1 text-center text-sm text-neutral-500">
        Quem vai de carro próprio. Serve para gerar a Relação de Placas que o clube manda antes de
        jogo fora, para liberação de acesso.
      </p>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Link href="/veiculos/documento" className="btn-secondary">
          Gerar relação de placas
        </Link>
        <Link href="/veiculos/novo" className="btn-primary">
          + Novo veículo
        </Link>
      </div>

      <div className="card mt-4 p-4">
        <SearchBar action="/veiculos" defaultValue={q} placeholder="Buscar por nome ou placa..." />
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar os veículos. Verifique se a migração 0071 já foi aplicada no Supabase.
        </p>
      ) : null}

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Condutor</th>
              <th className="px-4 py-3">Vínculo</th>
              <th className="px-4 py-3">Placa</th>
              <th className="px-4 py-3">Veículo</th>
              <th className="px-4 py-3">RG / CPF</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {ativos.map((v) => (
              <LinhaVeiculo key={v.id} veiculo={v} />
            ))}
            {ativos.length === 0 && !error ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum veículo cadastrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {inativos.length > 0 ? (
        <details className="mt-6 rounded-lg border border-neutral-200">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-neutral-600">
            Inativos ({inativos.length})
          </summary>
          <div className="overflow-x-auto border-t border-neutral-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <tbody className="divide-y divide-neutral-100">
                {inativos.map((v) => (
                  <LinhaVeiculo key={v.id} veiculo={v} opaco />
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </AppShell>
  );
}

function LinhaVeiculo({ veiculo, opaco }: { veiculo: VeiculoRow; opaco?: boolean }) {
  return (
    <tr className={opaco ? "opacity-70" : undefined}>
      <td className="px-4 py-3 font-medium text-neutral-800">{veiculo.nome}</td>
      <td className="px-4 py-3 text-neutral-600">
        {veiculo.pessoa_tipo ? (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
            {PESSOA_TIPO_LABEL[veiculo.pessoa_tipo]}
          </span>
        ) : (
          <span className="text-neutral-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 font-mono font-semibold tracking-wide text-grena-escuro">
        {formatPlaca(veiculo.placa)}
      </td>
      <td className="px-4 py-3 text-neutral-600">{descricaoVeiculo(veiculo)}</td>
      <td className="px-4 py-3 text-neutral-600">{veiculo.documento ?? "—"}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={`/veiculos/${veiculo.id}`} className="btn-secondary">
            Editar
          </Link>
          <VeiculoAtivoButton action={alternarVeiculoAtivo} id={veiculo.id} ativo={veiculo.ativo} />
          <DeleteButton action={excluirVeiculo} id={veiculo.id} entityLabel="veículo" />
        </div>
      </td>
    </tr>
  );
}
