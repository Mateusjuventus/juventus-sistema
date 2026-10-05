import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/delete-button";
import { DemandaStatusBadge, DemandaStatusSelect } from "@/components/demanda-status";
import { NovaDemandaForm } from "@/components/demandas/nova-demanda-form";
import { createClient } from "@/lib/supabase/server";
import type { DemandaRow } from "@/lib/supabase/types";
import { deleteDemanda, updateDemandaStatus } from "./actions";

function formatData(data: string | null): string | null {
  if (!data) return null;
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Tela cheia das demandas da pessoa logada — acessível a QUALQUER usuário logado, mesmo quem não
 * tem `demandas_acompanhado` marcado (só não ganha o link na sidebar nem o widget da tela inicial,
 * ver `components/app-sidebar.tsx`/`components/demandas/minhas-demandas-widget.tsx`). Mesmo padrão
 * de `/tarefas`: abertas primeiro, concluídas recolhidas num `<details>`.
 */
export default async function MinhasDemandasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = user
    ? await supabase
        .from("demandas")
        .select("*")
        .eq("responsavel_id", user.id)
        .order("prazo", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
    : { data: null };

  const demandas = (data ?? []) as DemandaRow[];
  const abertas = demandas.filter((d) => d.status !== "concluido");
  const concluidas = demandas.filter((d) => d.status === "concluido");
  const hojeStr = new Date().toISOString().slice(0, 10);

  return (
    <AppShell>
      <Link href="/" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Minhas Demandas" />

      <div className="mt-4">
        <NovaDemandaForm />
      </div>

      <div className="mt-4 space-y-3">
        {abertas.length === 0 ? (
          <div className="card p-8 text-center text-neutral-400">Nenhuma demanda em aberto.</div>
        ) : null}

        {abertas.map((d) => {
          const prazoFormatado = formatData(d.prazo);
          const atrasada = d.prazo !== null && d.prazo < hojeStr;
          return (
            <div key={d.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-[200px] flex-1">
                <p className="font-medium text-neutral-800">{d.titulo}</p>
                {d.descricao ? <p className="mt-0.5 text-sm text-neutral-500">{d.descricao}</p> : null}
              </div>
              {prazoFormatado ? (
                <span className={`text-sm ${atrasada ? "font-semibold text-red-700" : "text-neutral-500"}`}>
                  {atrasada ? "Atrasada · " : "Prazo: "}
                  {prazoFormatado}
                </span>
              ) : null}
              <DemandaStatusSelect id={d.id} status={d.status} action={updateDemandaStatus} />
              <DeleteButton action={deleteDemanda} id={d.id} entityLabel="demanda" />
            </div>
          );
        })}
      </div>

      {concluidas.length > 0 ? (
        <details className="mt-6 rounded-lg border border-neutral-200">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-neutral-600">
            Concluídas ({concluidas.length})
          </summary>
          <div className="space-y-3 border-t border-neutral-200 p-4">
            {concluidas.map((d) => (
              <div key={d.id} className="card flex flex-wrap items-center gap-3 p-4 opacity-75">
                <div className="min-w-[200px] flex-1">
                  <p className="font-medium text-neutral-600 line-through">{d.titulo}</p>
                  {d.descricao ? <p className="mt-0.5 text-sm text-neutral-400">{d.descricao}</p> : null}
                </div>
                <DemandaStatusBadge status={d.status} />
                <DeleteButton action={deleteDemanda} id={d.id} entityLabel="demanda" />
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </AppShell>
  );
}
