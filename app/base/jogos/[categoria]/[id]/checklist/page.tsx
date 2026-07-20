import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabsBase } from "@/components/jogo-tabs-base";
import { ChecklistItemRow } from "@/components/checklist-item-row";
import { createClient } from "@/lib/supabase/server";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { JogoBaseRow } from "@/lib/supabase/types";
import { buscarOuCriarChecklistBase, alternarChecklistItemBase, definirChecklistPrazoBase } from "./actions";

/** Espelha `app/jogos/[id]/checklist/page.tsx` para o Futebol de Base. */
export default async function ChecklistJogoBasePage({
  params,
}: {
  params: { categoria: string; id: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();

  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos_base").select("*").eq("id", params.id).single();
  if (!jogoData) notFound();
  const jogo = jogoData as JogoBaseRow;

  const itens = await buscarOuCriarChecklistBase(jogo);
  const concluidos = itens.filter((i) => i.concluido).length;
  const total = itens.length;
  const percentual = total === 0 ? 0 : Math.round((concluidos / total) * 100);

  return (
    <AppShell departamento="futebol_base">
      <JogoTabsBase jogoId={jogo.id} categoria={jogo.categoria} active="checklist" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-grena-escuro">Checklist</h1>
        <span className="text-sm text-neutral-500">
          Lista de {jogo.mandante ? "jogo em casa" : "jogo fora"}
        </span>
      </div>

      <div className="card mb-4 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-neutral-700">Progresso da preparação</span>
          <span className="font-semibold text-grena-escuro">
            {concluidos} de {total} ({percentual}%)
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-grena transition-all"
            style={{ width: `${percentual}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {itens.map((item) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            jogoId={jogo.id}
            alternarAction={alternarChecklistItemBase}
            prazoAction={definirChecklistPrazoBase}
          />
        ))}
        {itens.length === 0 ? (
          <div className="card p-8 text-center text-neutral-400">
            Não foi possível carregar o checklist deste jogo.
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
