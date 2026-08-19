import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaGastoRow, DespesaAvulsaBaseRow } from "@/lib/supabase/types";
import { DespesaFormBase } from "../despesa-form-base";
import { updateDespesaBase } from "../actions";

export default async function EditarDespesaBasePage({
  params,
}: {
  params: { despesaId: string };
}) {
  const supabase = createClient();
  const [{ data: despesaData }, { data: categoriasData }] = await Promise.all([
    supabase.from("despesas_avulsas_base").select("*").eq("id", params.despesaId).single(),
    supabase.from("categorias_gasto").select("*").order("nome", { ascending: true }),
  ]);

  if (!despesaData) notFound();

  const despesa = despesaData as DespesaAvulsaBaseRow;
  const categorias = (categoriasData ?? []) as CategoriaGastoRow[];

  const defaultValues: Record<string, string> = {
    categoriaId: despesa.categoria_id,
    categoria: despesa.categoria ?? "",
    descricao: despesa.descricao ?? "",
    valorPrevisto: despesa.valor_previsto.toString(),
    valorEfetuado: despesa.valor_efetuado?.toString() ?? "",
    data: despesa.data ?? "",
  };

  return (
    <AppShell departamento="futebol_base">
      <Link
        href="/base/financeiro?aba=geral"
        className="text-sm font-medium text-grena hover:underline"
      >
        ← Voltar para Geral da Base
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar despesa da Base</h1>
      <div className="mt-4">
        <DespesaFormBase
          action={updateDespesaBase}
          despesaId={despesa.id}
          categorias={categorias}
          defaultValues={defaultValues}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
