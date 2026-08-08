import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaGastoRow, JogoRow } from "@/lib/supabase/types";
import { DespesaForm } from "../despesa-form";
import { createDespesaAvulsa } from "../actions";

export default async function NovaDespesaAvulsaPage() {
  const supabase = createClient();
  const [{ data: categoriasData }, { data: jogosData }] = await Promise.all([
    supabase.from("categorias_gasto").select("*").order("nome", { ascending: true }),
    supabase.from("jogos").select("*").order("data_jogo", { ascending: false }),
  ]);

  const categorias = (categoriasData ?? []) as CategoriaGastoRow[];
  const jogos = (jogosData ?? []) as JogoRow[];

  return (
    <AppShell>
      <Link
        href="/financeiro/despesas-avulsas"
        className="text-sm font-medium text-grena hover:underline"
      >
        ← Voltar para Despesas avulsas
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Nova despesa avulsa</h1>
      <div className="mt-4">
        <DespesaForm action={createDespesaAvulsa} categorias={categorias} jogos={jogos} submitLabel="Cadastrar" />
      </div>
    </AppShell>
  );
}
