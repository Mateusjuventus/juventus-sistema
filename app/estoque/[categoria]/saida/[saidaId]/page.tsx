import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { parseCategoria } from "@/lib/estoque/categoria";
import { labelUnidade } from "@/lib/estoque/labels";
import { ESTOQUE_CATEGORIAS } from "@/lib/validation/schemas";
import type { EstoqueSaidaItemRow, EstoqueSaidaRow } from "@/lib/supabase/types";
import { deleteSaida } from "../../actions";

function formatData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function SaidaDetalhePage({
  params,
}: {
  params: { categoria: string; saidaId: string };
}) {
  const categoria = parseCategoria(params.categoria);
  if (!categoria) notFound();
  const label = ESTOQUE_CATEGORIAS.find((c) => c.value === categoria)?.label ?? categoria;

  const supabase = createClient();
  const [{ data: saidaData }, { data: itensData }, master] = await Promise.all([
    supabase.from("estoque_saidas").select("*").eq("id", params.saidaId).single(),
    supabase.from("estoque_saida_itens").select("*").eq("saida_id", params.saidaId).order("ordem", { ascending: true }),
    isMaster(supabase),
  ]);
  if (!saidaData) notFound();
  const saida = saidaData as EstoqueSaidaRow;
  const itens = (itensData ?? []) as EstoqueSaidaItemRow[];
  const totalQtd = itens.reduce((soma, i) => soma + Number(i.quantidade), 0);

  return (
    <AppShell>
      <Link href={`/estoque/${categoria}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Estoque {label}
      </Link>

      <div className="card mt-4 border-2 border-grena p-6">
        <h1 className="text-xl font-bold text-grena-escuro">
          ✓ Ficha Nº {String(saida.numero).padStart(4, "0")} registrada com sucesso
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {saida.nome_destinatario} — {totalQtd} item{totalQtd === 1 ? "" : "ns"} — {formatData(saida.data)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`/estoque/${categoria}/saida/${saida.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            🖨️ Imprimir Ficha
          </a>
          <Link href={`/estoque/${categoria}/saida/nova`} className="btn-secondary">
            + Nova Saída
          </Link>
          <Link href={`/estoque/${categoria}/historico`} className="btn-secondary">
            Ver Histórico
          </Link>
          {master ? <DeleteButton action={deleteSaida} id={saida.id} entityLabel="saída" /> : null}
        </div>
      </div>

      <div className="card tabela-rolavel mt-4">
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
