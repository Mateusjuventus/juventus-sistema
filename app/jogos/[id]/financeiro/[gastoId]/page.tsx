import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaGastoRow, GastoJogoRow, JogoRow } from "@/lib/supabase/types";
import { GastoForm } from "../gasto-form";
import { updateGasto } from "../actions";

export default async function EditarGastoPage({
  params,
}: {
  params: { id: string; gastoId: string };
}) {
  const supabase = createClient();
  const [{ data: jogoData }, { data: gastoData }, { data: categoriasData }] = await Promise.all([
    supabase.from("jogos").select("*").eq("id", params.id).single(),
    supabase.from("gastos_jogo").select("*").eq("id", params.gastoId).single(),
    supabase.from("categorias_gasto").select("*").order("nome", { ascending: true }),
  ]);

  if (!jogoData || !gastoData) notFound();

  const jogo = jogoData as JogoRow;
  const gasto = gastoData as GastoJogoRow;
  const categorias = (categoriasData ?? []) as CategoriaGastoRow[];

  const defaultValues: Record<string, string> = {
    categoriaId: gasto.categoria_id,
    descricao: gasto.descricao ?? "",
    valorPrevisto: gasto.valor_previsto.toString(),
    valorEfetuado: gasto.valor_efetuado?.toString() ?? "",
  };

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="financeiro" />
      <Link
        href={`/jogos/${jogo.id}/financeiro`}
        className="text-sm font-medium text-grena hover:underline"
      >
        ← Voltar para Financeiro
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar gasto</h1>
      <div className="mt-4">
        <GastoForm
          action={updateGasto}
          jogoId={jogo.id}
          gastoId={gasto.id}
          categorias={categorias}
          defaultValues={defaultValues}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppShell>
  );
}
