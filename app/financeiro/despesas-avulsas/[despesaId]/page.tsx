import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaGastoRow, DespesaAvulsaRow, JogoRow } from "@/lib/supabase/types";
import { DespesaForm } from "../despesa-form";
import { updateDespesaAvulsa } from "../actions";

export default async function EditarDespesaAvulsaPage({
  params,
}: {
  params: { despesaId: string };
}) {
  const supabase = createClient();
  const [{ data: despesaData }, { data: categoriasData }, { data: jogosData }, { data: vinculosData }] =
    await Promise.all([
      supabase.from("despesas_avulsas").select("*").eq("id", params.despesaId).single(),
      supabase.from("categorias_gasto").select("*").order("nome", { ascending: true }),
      supabase.from("jogos").select("*").order("data_jogo", { ascending: false }),
      supabase.from("despesas_avulsas_jogos").select("jogo_id").eq("despesa_id", params.despesaId),
    ]);

  if (!despesaData) notFound();

  const despesa = despesaData as DespesaAvulsaRow;
  const categorias = (categoriasData ?? []) as CategoriaGastoRow[];
  const jogos = (jogosData ?? []) as JogoRow[];
  const jogosSelecionados = ((vinculosData ?? []) as { jogo_id: string }[]).map((v) => v.jogo_id);

  const defaultValues: Record<string, string> = {
    categoriaId: despesa.categoria_id,
    descricao: despesa.descricao ?? "",
    valorPrevisto: despesa.valor_previsto.toString(),
    valorEfetuado: despesa.valor_efetuado?.toString() ?? "",
    data: despesa.data ?? "",
  };

  return (
    <AppShell>
      <Link
        href="/financeiro/despesas-avulsas"
        className="text-sm font-medium text-grena hover:underline"
      >
        ← Voltar para Despesas avulsas
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar despesa avulsa</h1>
      <div className="mt-4">
        <DespesaForm
          action={updateDespesaAvulsa}
          despesaId={despesa.id}
          categorias={categorias}
          jogos={jogos}
          jogosSelecionados={jogosSelecionados}
          defaultValues={defaultValues}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
