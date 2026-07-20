import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { totalItem } from "@/lib/estoque/estoque-ajustes";
import type { EstoqueItemBaseRow } from "@/lib/supabase/types";
import { deleteItemBase } from "./actions";

/**
 * Espelha `app/estoque/[categoria]/page.tsx` para o Futebol de Base — mas sem a bifurcação
 * Esportivo/Médico: aqui é uma lista só, numa rota fixa (`/base/estoque`, sem segmento
 * `[categoria]`), já que o Estoque do Base só existe para material esportivo (ver a spec).
 */
export default async function EstoqueBasePage() {
  const supabase = createClient();
  const { data, error } = await supabase.from("estoque_itens_base").select("*").order("nome", { ascending: true });
  const itens = (data ?? []) as EstoqueItemBaseRow[];
  const totalPecas = itens.reduce((soma, item) => soma + totalItem(item), 0);

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-grena-escuro">Estoque</h1>
          <p className="text-sm text-neutral-500">
            {itens.length} referência{itens.length === 1 ? "" : "s"} · {totalPecas} peça
            {totalPecas === 1 ? "" : "s"} em estoque
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/base/estoque/relatorio/pdf" target="_blank" rel="noopener noreferrer" className="btn-secondary">
            Relatório PDF
          </a>
          <Link href="/base/estoque/historico" className="btn-secondary">
            Histórico
          </Link>
          <Link href="/base/estoque/entrada/nova" className="btn-secondary">
            + Nova Entrada
          </Link>
          <Link href="/base/estoque/saida/nova" className="btn-primary">
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
              <th className="px-4 py-3 font-semibold">Nome do item</th>
              <th className="px-4 py-3 font-semibold">Tamanhos e quantidades</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {itens.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
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
                        <Link href={`/base/estoque/itens/${item.id}`} className="btn-secondary btn-sm">
                          Editar
                        </Link>
                        <DeleteButton action={deleteItemBase} id={item.id} entityLabel="item" />
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
        <Link href="/base/estoque/itens/novo" className="btn-secondary">
          + Novo item no catálogo
        </Link>
      </div>
    </AppShell>
  );
}
