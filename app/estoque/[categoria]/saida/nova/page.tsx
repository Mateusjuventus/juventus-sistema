import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { parseCategoria } from "@/lib/estoque/categoria";
import { ESTOQUE_CATEGORIAS } from "@/lib/validation/schemas";
import type { EstoqueItemRow } from "@/lib/supabase/types";
import { createSaida } from "../../actions";
import { SaidaForm } from "../saida-form";

export default async function NovaSaidaPage({ params }: { params: { categoria: string } }) {
  const categoria = parseCategoria(params.categoria);
  if (!categoria) notFound();
  const label = ESTOQUE_CATEGORIAS.find((c) => c.value === categoria)?.label ?? categoria;

  const supabase = createClient();
  const { data } = await supabase
    .from("estoque_itens")
    .select("*")
    .eq("categoria", categoria)
    .order("nome", { ascending: true });
  const itens = (data ?? []) as EstoqueItemRow[];

  return (
    <AppShell>
      <Link href={`/estoque/${categoria}`} className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Estoque {label}
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-grena-escuro">Nova Saída — Estoque {label}</h1>
        <a
          href={`/estoque/${categoria}/ficha-branca/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          Imprimir Ficha em Branco
        </a>
      </div>

      {itens.length === 0 ? (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Ainda não há nenhum item cadastrado neste estoque.{" "}
          <Link href={`/estoque/${categoria}/itens/novo`} className="font-semibold underline">
            Cadastre um item primeiro
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6">
          <SaidaForm action={createSaida} categoria={categoria} itens={itens} />
        </div>
      )}
    </AppShell>
  );
}
