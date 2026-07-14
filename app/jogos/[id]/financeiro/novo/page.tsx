import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaGastoRow, JogoRow } from "@/lib/supabase/types";
import { GastoForm } from "../gasto-form";
import { createGasto } from "../actions";

export default async function NovoGastoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: jogoData }, { data: categoriasData }] = await Promise.all([
    supabase.from("jogos").select("*").eq("id", params.id).single(),
    supabase.from("categorias_gasto").select("*").order("nome", { ascending: true }),
  ]);

  if (!jogoData) notFound();

  const jogo = jogoData as JogoRow;
  const categorias = (categoriasData ?? []) as CategoriaGastoRow[];

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="financeiro" />
      <Link
        href={`/jogos/${jogo.id}/financeiro`}
        className="text-sm font-medium text-grena hover:underline"
      >
        ← Voltar para Financeiro
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo gasto</h1>
      <div className="mt-4">
        <GastoForm action={createGasto} jogoId={jogo.id} categorias={categorias} submitLabel="Cadastrar" />
      </div>
    </AppShell>
  );
}
