import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { AtletaAvatarCirculo } from "@/components/atleta-avatar";
import { DemandaStatusBadge } from "@/components/demanda-status";
import { corPrazoDemanda, type CorPrazoDemanda } from "@/lib/demandas/cor-prazo";
import { resolverPessoaAcompanhada } from "@/lib/demandas/pessoa-acompanhada";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { hojeBrasilia, formatDataHoraBrasilia } from "@/lib/data-brasil";
import type { DemandaRow, PerfilRow } from "@/lib/supabase/types";

const COR_DOT: Record<CorPrazoDemanda, string> = {
  verde: "bg-emerald-500",
  laranja: "bg-orange-500",
  vermelho: "bg-red-500",
};

function formatData(data: string | null): string | null {
  if (!data) return null;
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Detalhe de uma pessoa acompanhada, aberto a partir do card dela em `/demandas` — pedido do
 * Mateus em 05/10: "quero tipo poder acompanhar as demandas sabe que já foram concluidas, quero
 * poder ver as pendentes e depois que vc filtre por dia". Mostra TODAS as demandas da pessoa
 * (sem o limite de 4 do card), divididas em Pendentes/Concluídas, com um filtro de dia opcional
 * que vale pros dois grupos (Pendentes filtra pelo PRAZO; Concluídas filtra pela DATA EM QUE FOI
 * CONCLUÍDA — ver comentário de `concluidasUltimos30Dias` em `lib/demandas/rendimento.ts` sobre
 * usar `updated_at` como essa data, mesma aproximação aqui). Somente leitura: trocar o status ou
 * excluir uma demanda de outra pessoa não está disponível aqui — `updateDemandaStatus`/
 * `deleteDemanda` só agem na própria demanda do usuário logado (`eq("responsavel_id", user.id)`
 * em app/minhas-demandas/actions.ts), então nem ofereceríamos um controle que silenciosamente não
 * funciona pro master. Só master acessa, mesma régua de `/demandas`.
 */
export default async function PessoaAcompanhadaDetalhePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { dia?: string };
}) {
  const supabase = createClient();
  const master = await isMaster(supabase);
  if (!master) redirect("/profissional");

  const { data: perfilData } = await supabase
    .from("perfis")
    .select("*")
    .eq("id", params.id)
    .eq("demandas_acompanhado", true)
    .maybeSingle();
  const perfil = perfilData as PerfilRow | null;
  if (!perfil) notFound();

  const [{ nome, funcao, fotoUrl }, { data: demandasData }] = await Promise.all([
    resolverPessoaAcompanhada(supabase, perfil),
    supabase.from("demandas").select("*").eq("responsavel_id", perfil.id),
  ]);
  const demandas = (demandasData ?? []) as DemandaRow[];
  const hojeStr = hojeBrasilia();

  const diaFiltro = searchParams.dia && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.dia) ? searchParams.dia : null;

  const pendentes = demandas
    .filter((d) => d.status !== "concluido")
    .filter((d) => !diaFiltro || d.prazo === diaFiltro)
    .sort((a, b) => (a.prazo ?? "9999-99-99").localeCompare(b.prazo ?? "9999-99-99"));

  const concluidas = demandas
    .filter((d) => d.status === "concluido")
    .filter((d) => !diaFiltro || d.updated_at.slice(0, 10) === diaFiltro)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <AppShell>
      <Link href="/demandas" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title={nome} />

      <div className="mt-4 flex items-center gap-3">
        <AtletaAvatarCirculo nome={nome} fotoUrl={fotoUrl} className="h-14 w-14" />
        <div>
          <p className="font-semibold text-neutral-800">{nome}</p>
          <p className="text-sm text-neutral-500">{funcao}</p>
        </div>
      </div>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="dia" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Filtrar por dia
          </label>
          <input type="date" id="dia" name="dia" defaultValue={diaFiltro ?? ""} className="field-input w-auto" />
        </div>
        <button type="submit" className="btn-secondary btn-sm">
          Filtrar
        </button>
        {diaFiltro ? (
          <Link href={`/demandas/${perfil.id}`} className="text-sm font-medium text-grena hover:underline">
            Limpar filtro
          </Link>
        ) : null}
      </form>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-grena">
          Pendentes {diaFiltro ? `— ${formatData(diaFiltro)}` : `(${pendentes.length})`}
        </h2>
        {pendentes.length === 0 ? (
          <div className="card mt-2 p-6 text-center text-neutral-400">
            {diaFiltro ? "Nenhuma demanda com prazo nesse dia." : "Nenhuma demanda pendente. 🎉"}
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            {pendentes.map((d) => {
              const prazoFormatado = formatData(d.prazo);
              const cor = corPrazoDemanda(d.prazo, d.status, hojeStr);
              return (
                <div key={d.id} className="card flex flex-wrap items-center gap-3 p-4">
                  {cor ? <span className={`h-2 w-2 shrink-0 rounded-full ${COR_DOT[cor]}`} aria-hidden /> : null}
                  <div className="min-w-[200px] flex-1">
                    <p className="font-medium text-neutral-800">{d.titulo}</p>
                    {d.descricao ? <p className="mt-0.5 text-sm text-neutral-500">{d.descricao}</p> : null}
                  </div>
                  {prazoFormatado ? (
                    <span className={`text-sm ${cor === "vermelho" ? "font-semibold text-red-700" : "text-neutral-500"}`}>
                      {cor === "vermelho" ? "Atrasada · " : "Prazo: "}
                      {prazoFormatado}
                    </span>
                  ) : null}
                  <DemandaStatusBadge status={d.status} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-grena">
          Concluídas {diaFiltro ? `— ${formatData(diaFiltro)}` : `(${concluidas.length})`}
        </h2>
        {concluidas.length === 0 ? (
          <div className="card mt-2 p-6 text-center text-neutral-400">
            {diaFiltro ? "Nenhuma demanda concluída nesse dia." : "Nenhuma demanda concluída ainda."}
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            {concluidas.map((d) => (
              <div key={d.id} className="card flex flex-wrap items-center gap-3 p-4 opacity-80">
                <div className="min-w-[200px] flex-1">
                  <p className="font-medium text-neutral-600 line-through">{d.titulo}</p>
                  {d.descricao ? <p className="mt-0.5 text-sm text-neutral-400">{d.descricao}</p> : null}
                </div>
                <span className="text-sm text-neutral-400">Concluída em {formatDataHoraBrasilia(d.updated_at)}</span>
                <DemandaStatusBadge status={d.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
