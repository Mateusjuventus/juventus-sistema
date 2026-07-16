import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { parseCategoria } from "@/lib/estoque/categoria";
import { labelUnidade } from "@/lib/estoque/labels";
import { ESTOQUE_CATEGORIAS } from "@/lib/validation/schemas";
import type { EstoqueEntradaItemRow, EstoqueEntradaRow } from "@/lib/supabase/types";
import { deleteEntrada } from "../../actions";

function formatData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function EntradaDetalhePage({
  params,
}: {
  params: { categoria: string; entradaId: string };
}) {
  const categoria = parseCategoria(params.categoria);
  if (!categoria) notFound();
  const label = ESTOQUE_CATEGORIAS.find((c) => c.value === categoria)?.label ?? categoria;

  const supabase = createClient();
  const [{ data: entradaData }, { data: itensData }, master] = await Promise.all([
    supabase.from("estoque_entradas").select("*").eq("id", params.entradaId).single(),
    supabase
      .from("estoque_entrada_itens")
      .select("*")
      .eq("entrada_id", params.entradaId)
      .order("ordem", { ascending: true }),
    isMaster(supabase),
  ]);
  if (!entradaData) notFound();
  const entrada = entradaData as EstoqueEntradaRow;
  const itens = (itensData ?? []) as EstoqueEntradaItemRow[];
  const totalQtd = itens.reduce((soma, i) => soma + Number(i.quantidade), 0);

  return (
    <AppShell>
      <Link href={`/estoque/${categoria}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Estoque {label}
      </Link>

      <div className="card mt-4 border-2 border-grena p-6">
        <h1 className="text-xl font-bold text-grena-escuro">
          ✓ Entrada Nº {String(entrada.numero).padStart(4, "0")} registrada com sucesso
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {entrada.fornecedor ? `${entrada.fornecedor} — ` : ""}
          {totalQtd} item{totalQtd === 1 ? "" : "ns"} — {formatData(entrada.data)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`/estoque/${categoria}/entrada/${entrada.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            🖨️ Imprimir Comprovante
          </a>
          <Link href={`/estoque/${categoria}/entrada/nova`} className="btn-secondary">
            + Nova Entrada
          </Link>
          <Link href={`/estoque/${categoria}/historico`} className="btn-secondary">
            Ver Histórico
          </Link>
          {master ? <DeleteButton action={deleteEntrada} id={entrada.id} entityLabel="entrada" /> : null}
        </div>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Descrição</th>
              <th className="px-4 py-3 font-semibold">{labelUnidade(categoria)}</th>
              <th className="px-4 py-3 font-semibold">Código</th>
              <th className="px-4 py-3 text-right font-semibold">Qtd.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {itens.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.nome}</td>
                <td className="px-4 py-3">{item.tamanho || "—"}</td>
                <td className="px-4 py-3">{item.codigo || "—"}</td>
                <td className="px-4 py-3 text-right">{item.quantidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
