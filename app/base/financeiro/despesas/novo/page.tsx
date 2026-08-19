import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaGastoRow } from "@/lib/supabase/types";
import { DespesaFormBase } from "../despesa-form-base";
import { createDespesaBase } from "../actions";

export default async function NovaDespesaBasePage() {
  const supabase = createClient();
  const { data: categoriasData } = await supabase
    .from("categorias_gasto")
    .select("*")
    .order("nome", { ascending: true });

  const categorias = (categoriasData ?? []) as CategoriaGastoRow[];

  return (
    <AppShell departamento="futebol_base">
      <Link
        href="/base/financeiro?aba=geral"
        className="text-sm font-medium text-grena hover:underline"
      >
        ← Voltar para Geral da Base
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Nova despesa da Base</h1>
      <div className="mt-4">
        <DespesaFormBase action={createDespesaBase} categorias={categorias} submitLabel="Cadastrar" />
      </div>
    </AppShell>
  );
}
