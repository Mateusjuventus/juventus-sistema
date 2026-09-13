import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { createClient } from "@/lib/supabase/server";
import { verificarAcessoJogoBase } from "@/lib/auth/jogos-base-guard";
import type { CategoriaGastoRow, GastoJogoBaseRow } from "@/lib/supabase/types";
import { GastoFormBase } from "../gasto-form-base";
import { updateGastoBase } from "../actions";

/** Espelha `app/jogos/[id]/financeiro/[gastoId]/page.tsx` para o Futebol de Base. */
export default async function EditarGastoBasePage({
  params,
}: {
  params: { id: string; gastoId: string };
}) {
  const supabase = createClient();

  const [jogo, { data: gastoData }, { data: categoriasData }] = await Promise.all([
    verificarAcessoJogoBase(supabase, params.id),
    supabase.from("gastos_jogo_base").select("*").eq("id", params.gastoId).single(),
    supabase.from("categorias_gasto").select("*").order("nome", { ascending: true }),
  ]);

  if (!jogo || !gastoData) notFound();

  const gasto = gastoData as GastoJogoBaseRow;
  const categorias = (categoriasData ?? []) as CategoriaGastoRow[];

  const defaultValues: Record<string, string> = {
    categoriaId: gasto.categoria_id,
    descricao: gasto.descricao ?? "",
    valorPrevisto: gasto.valor_previsto.toString(),
    valorEfetuado: gasto.valor_efetuado?.toString() ?? "",
    data: gasto.data ?? "",
  };

  return (
    <AppShell departamento="futebol_base">
      <JogoTabsBase jogoId={jogo.id} active="financeiro" />
      <Link
        href={`/base/jogos/${jogo.id}/financeiro`}
        className="text-sm font-medium text-grena hover:underline"
      >
        ← Voltar para Financeiro
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-grena-escuro">Editar gasto</h1>
      <div className="mt-4">
        <GastoFormBase
          action={updateGastoBase}
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
