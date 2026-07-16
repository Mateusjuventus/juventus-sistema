import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { parseCategoria } from "@/lib/estoque/categoria";
import { totalItem } from "@/lib/estoque/estoque-ajustes";
import { labelNomeItem, labelUnidadesSection } from "@/lib/estoque/labels";
import { ESTOQUE_CATEGORIAS } from "@/lib/validation/schemas";
import type { EstoqueItemRow } from "@/lib/supabase/types";
import { deleteItem } from "./actions";

export default async function EstoqueCategoriaPage({ params }: { params: { categoria: string } }) {
  const categoria = parseCategoria(params.categoria);
  if (!categoria) notFound();

  const label = ESTOQUE_CATEGORIAS.find((c) => c.value === categoria)?.label ?? categoria;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("estoque_itens")
    .select("*")
    .eq("categoria", categoria)
    .order("nome", { ascending: true });
  const itens = (data ?? []) as EstoqueItemRow[];
  const totalPecas = itens.reduce((soma, item) => soma + totalItem(item), 0);

  return (
    <AppShell>
      <Link href="/estoque" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-grena-escuro">Estoque {label}</h1>
          <p className="text-sm text-neutral-500">
            {itens.length} referência{itens.length === 1 ? "" : "s"} · {totalPecas} peça
            {totalPecas === 1 ? "" : "s"} em estoque
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/estoque/${categoria}/relatorio/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Relatório PDF
          </a>
          <Link href={`/estoque/${categoria}/historico`} className="btn-secondary">
            Histórico
          </Link>
          <Link href={`/estoque/${categoria}/entrada/nova`} className="btn-secondary">
            + Nova Entrada
          </Link>
          <Link href={`/estoque/${categoria}/saida/nova`} className="btn-primary">
            + Nova Saída
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar o estoque. Verifique a conexão com o Supabase.
        </p>
      ) : null}

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-semibold">{labelNomeItem(categoria)}</th>
              {categoria === "medico" ? <th className="px-4 py-3 font-semibold">Mg</th> : null}
              <th className="px-4 py-3 font-semibold">{labelUnidadesSection(categoria)}</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {itens.length === 0 ? (
              <tr>
                <td colSpan={categoria === "medico" ? 5 : 4} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum item cadastrado ainda.
                </td>
              </tr>
            ) : (
              itens.map((item) => {
                const tamanhos = Object.entries(item.tamanhos ?? {});
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-800">{item.nome}</p>
                      {item.codigo ? <p className="text-xs text-neutral-400">{item.codigo}</p> : null}
                    </td>
                    {categoria === "medico" ? (
                      <td className="px-4 py-3 text-neutral-600">{item.mg || "—"}</td>
                    ) : null}
                    <td className="px-4 py-3">
                      {tamanhos.length === 0 ? (
                        <span className="text-neutral-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {tamanhos.map(([tamanho, quantidade]) => (
                            <span
                              key={tamanho}
                              className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-600"
                            >
                              {tamanho}: {quantidade}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-neutral-800">{totalItem(item)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/estoque/${categoria}/itens/${item.id}`} className="btn-secondary btn-sm">
                          Editar
                        </Link>
                        <DeleteButton action={deleteItem} id={item.id} entityLabel="item" />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Link href={`/estoque/${categoria}/itens/novo`} className="btn-secondary">
          + Novo item no catálogo
        </Link>
      </div>
    </AppShell>
  );
}
