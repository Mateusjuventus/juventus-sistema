import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TarefaStatusBadge } from "@/components/tarefa-status";
import { createClient } from "@/lib/supabase/server";
import { TAREFA_CATEGORIAS } from "@/lib/validation/schemas";
import type { ChecklistJogoItemComJogoRow, TarefaRow } from "@/lib/supabase/types";

const DIAS_PRAZO_CURTO = 10;

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function addDias(base: Date, dias: number): Date {
  const copia = new Date(base);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

/**
 * Tela de Avisos: junta num só lugar o que precisa de atenção — solicitações em aberto, tarefas
 * com prazo perto (10 dias) ou vencido, e itens de checklist de jogos na mesma situação. Não tem
 * nada pra marcar como "urgente" manualmente por enquanto: um item vira aviso sozinho quando o
 * prazo chega perto (regra automática, mais simples de manter).
 */
export default async function AvisosPage() {
  const supabase = createClient();

  const hoje = new Date();
  const hojeStr = hoje.toISOString().slice(0, 10);
  const limiteStr = addDias(hoje, DIAS_PRAZO_CURTO).toISOString().slice(0, 10);

  const [{ data: tarefasData }, { data: checklistData }] = await Promise.all([
    supabase.from("tarefas").select("*").neq("status", "concluido").order("prazo", { ascending: true, nullsFirst: false }),
    supabase
      .from("checklist_jogo_itens")
      .select("*, jogo:jogos(id, adversario_nome, data_jogo, mandante)")
      .eq("concluido", false)
      .not("prazo", "is", null)
      .lte("prazo", limiteStr)
      .order("prazo", { ascending: true }),
  ]);

  const todasTarefas = (tarefasData ?? []) as TarefaRow[];
  const avisosTarefas = todasTarefas.filter(
    (t) => t.categoria === "solicitacoes" || (t.prazo !== null && t.prazo <= limiteStr),
  );
  const checklistItens = (checklistData ?? []) as ChecklistJogoItemComJogoRow[];

  const totalAvisos = avisosTarefas.length + checklistItens.length;

  return (
    <AppShell>
      <PageHeader title="Avisos" />
      <p className="mt-1 text-center text-sm text-neutral-500">
        Solicitações em aberto, tarefas com prazo em até {DIAS_PRAZO_CURTO} dias (ou já vencidas) e
        itens de checklist de jogos na mesma situação.
      </p>

      {totalAvisos === 0 ? (
        <div className="card mt-6 p-8 text-center text-neutral-400">
          Nenhum aviso no momento. Tudo em dia!
        </div>
      ) : null}

      {avisosTarefas.length > 0 ? (
        <>
          <h2 className="mt-8 text-lg font-bold text-grena-escuro">
            Solicitações e tarefas ({avisosTarefas.length})
          </h2>
          <div className="mt-3 space-y-3">
            {avisosTarefas.map((t) => {
              const categoriaLabel = TAREFA_CATEGORIAS.find((c) => c.value === t.categoria)?.label ?? t.categoria;
              const prazoFormatado = t.prazo ? formatData(t.prazo) : null;
              const atrasada = t.prazo !== null && t.prazo < hojeStr;
              return (
                <Link
                  key={t.id}
                  href={`/tarefas/${t.id}`}
                  className="card flex flex-wrap items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-dourado"
                >
                  <div className="min-w-[200px] flex-1">
                    <p className="font-medium text-neutral-800">{t.titulo}</p>
                    <p className="mt-0.5 text-sm text-neutral-500">{categoriaLabel}</p>
                  </div>
                  {prazoFormatado ? (
                    <span className={`text-sm ${atrasada ? "font-semibold text-red-700" : "text-neutral-500"}`}>
                      {atrasada ? "Atrasada · " : "Prazo: "}
                      {prazoFormatado}
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-400">Sem prazo</span>
                  )}
                  <TarefaStatusBadge status={t.status} />
                </Link>
              );
            })}
          </div>
        </>
      ) : null}

      {checklistItens.length > 0 ? (
        <>
          <h2 className="mt-8 text-lg font-bold text-grena-escuro">
            Checklist de jogos ({checklistItens.length})
          </h2>
          <div className="mt-3 space-y-3">
            {checklistItens.map((item) => {
              const prazoFormatado = item.prazo ? formatData(item.prazo) : null;
              const atrasado = item.prazo !== null && item.prazo < hojeStr;
              return (
                <Link
                  key={item.id}
                  href={item.jogo ? `/jogos/${item.jogo.id}/checklist` : "/jogos"}
                  className="card flex flex-wrap items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-dourado"
                >
                  <div className="min-w-[200px] flex-1">
                    <p className="font-medium text-neutral-800">{item.item}</p>
                    <p className="mt-0.5 text-sm text-neutral-500">
                      {item.jogo
                        ? `${item.jogo.mandante ? "Juventus x " + item.jogo.adversario_nome : item.jogo.adversario_nome + " x Juventus"} · ${formatData(item.jogo.data_jogo)}`
                        : "Jogo não encontrado"}
                    </p>
                  </div>
                  {prazoFormatado ? (
                    <span className={`text-sm ${atrasado ? "font-semibold text-red-700" : "text-neutral-500"}`}>
                      {atrasado ? "Atrasado · " : "Prazo: "}
                      {prazoFormatado}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
