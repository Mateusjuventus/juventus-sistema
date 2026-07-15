import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { ChecklistItemRow } from "@/components/checklist-item-row";
import { createClient } from "@/lib/supabase/server";
import type { JogoRow } from "@/lib/supabase/types";
import { buscarOuCriarChecklist, alternarChecklistItem, definirChecklistPrazo } from "./actions";

/**
 * Checklist de preparação do jogo — itens fixos (mudam se o jogo é em casa ou fora), com prazo
 * opcional por item. Os itens são criados sozinhos (a partir de um modelo fixo) na primeira vez
 * que essa aba é aberta. Ver docs em lib/checklist-templates.ts.
 */
export default async function ChecklistJogoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos").select("*").eq("id", params.id).single();
  if (!jogoData) notFound();
  const jogo = jogoData as JogoRow;

  const itens = await buscarOuCriarChecklist(jogo);
  const concluidos = itens.filter((i) => i.concluido).length;
  const total = itens.length;
  const percentual = total === 0 ? 0 : Math.round((concluidos / total) * 100);

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="checklist" />

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
            alternarAction={alternarChecklistItem}
            prazoAction={definirChecklistPrazo}
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
