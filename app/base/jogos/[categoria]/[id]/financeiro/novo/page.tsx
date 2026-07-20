import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { createClient } from "@/lib/supabase/server";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { CategoriaGastoRow, JogoBaseRow } from "@/lib/supabase/types";
import { GastoFormBase } from "../gasto-form-base";
import { createGastoBase } from "../actions";

/** Espelha `app/jogos/[id]/financeiro/novo/page.tsx` para o Futebol de Base. */
export default async function NovoGastoBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  const categoria = params.categoria;
  const supabase = createClient();

  const [{ data: jogoData }, { data: categoriasData }] = await Promise.all([
    supabase.from("jogos_base").select("*").eq("id", params.id).single(),
    supabase.from("categorias_gasto").select("*").order("nome", { ascending: true }),
  ]);

  if (!jogoData) notFound();

  const jogo = jogoData as JogoBaseRow;
  const categorias = (categoriasData ?? []) as CategoriaGastoRow[];

  return (
    <AppShell departamento="futebol_base">
      <JogoTabsBase jogoId={jogo.id} categoria={categoria} active="financeiro" />
      <Link
        href={`/base/jogos/${categoria}/${jogo.id}/financeiro`}
        className="text-sm font-medium text-grena hover:underline"
      >
        ← Voltar para Financeiro
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Novo gasto</h1>
      <div className="mt-4">
        <GastoFormBase action={createGastoBase} jogoId={jogo.id} categorias={categorias} submitLabel="Cadastrar" />
      </div>
    </AppShell>
  );
}
