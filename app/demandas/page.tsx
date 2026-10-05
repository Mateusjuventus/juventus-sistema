import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DemandasListagem } from "@/components/demandas/demandas-listagem";
import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { resolverPessoaAcompanhada } from "@/lib/demandas/pessoa-acompanhada";
import { calcularRendimento } from "@/lib/demandas/rendimento";
import { hojeBrasilia } from "@/lib/data-brasil";
import type { DemandaRow, PerfilRow } from "@/lib/supabase/types";

/**
 * Painel do master — acompanha de uma vez todo mundo marcado em "Usuários" → "Painel de Demandas"
 * (supervisores, a Assistente Social etc.), um card ao lado do outro: foto, função e as 5 métricas
 * de rendimento (ver docs/superpowers/specs/2026-10-05-assistencia-social-e-demandas-design.md,
 * Parte 2, "Painel do Mateus" — pedido original: "pra mim fique como se fosse um painel para
 * acompanhar todos de uma vez"). Só master acessa.
 *
 * `?de=base` faz a sidebar abrir no departamento da Base em vez do Profissional (padrão) — sem
 * isso, clicar em "Demandas" a partir da Base sempre levava pro menu do Profissional, mesmo quem
 * clicou estando na Base (pedido do Mateus: "as demandas estão no acesso somente do profi? ...
 * toda vez que clico ela vem pro profissional"). O link da sidebar (`components/app-sidebar.tsx`)
 * é quem decide se manda esse `?de=base`, de acordo com onde a pessoa estava.
 */
export default async function DemandasPage({ searchParams }: { searchParams: { de?: string } }) {
  const supabase = createClient();
  const master = await isMaster(supabase);
  const departamento = searchParams.de === "base" ? "futebol_base" : "futebol_profissional";
  const homeDoDepartamento = departamento === "futebol_base" ? "/base" : "/profissional";
  if (!master) redirect(homeDoDepartamento);

  const { data: perfisData } = await supabase.from("perfis").select("*").eq("demandas_acompanhado", true);
  const perfis = (perfisData ?? []) as PerfilRow[];
  const hojeStr = hojeBrasilia();

  const resultados = await Promise.all(
    perfis.map(async (perfil) => {
      const [{ nome, funcao, fotoUrl }, { data: demandasData }] = await Promise.all([
        resolverPessoaAcompanhada(supabase, perfil),
        supabase.from("demandas").select("*").eq("responsavel_id", perfil.id),
      ]);
      const demandas = (demandasData ?? []) as DemandaRow[];
      const rendimento = calcularRendimento(demandas, hojeStr);
      const pendencias = demandas
        .filter((d) => d.status !== "concluido")
        .sort((a, b) => (a.prazo ?? "9999-99-99").localeCompare(b.prazo ?? "9999-99-99"));

      return { id: perfil.id, nome, funcao, fotoUrl, rendimento, pendencias, demandas };
    }),
  );
  const cards = resultados.map(({ demandas: _demandas, ...card }) => card);

  const totalPendencias = cards.reduce((acc, c) => acc + c.rendimento.pendentes, 0);
  const totalAtrasadas = cards.reduce((acc, c) => acc + c.rendimento.atrasadas, 0);
  // "% Geral" pedido pelo Mateus em 05/10 ("coloca a %geral também ali nos gerais") — mesma conta
  // de `percentualHoje` (ver `calcularRendimento`), só que sobre TODAS as demandas de TODAS as
  // pessoas acompanhadas juntas, não pessoa por pessoa.
  const todasDemandas = resultados.flatMap((r) => r.demandas);
  const percentualGeral = calcularRendimento(todasDemandas, hojeStr).percentualHoje;

  return (
    <AppShell departamento={departamento} breadcrumb="Demandas">
      {cards.length === 0 ? (
        <div className="card mx-auto mt-6 max-w-md p-8 text-center text-neutral-500">
          Ninguém está marcado pra acompanhar ainda. Em &quot;Usuários&quot;, marque &quot;Acompanhar
          no painel de Demandas&quot; pra cada pessoa.
        </div>
      ) : (
        <>
          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-grena-escuro">{cards.length}</p>
              <p className="mt-1 text-xs font-medium text-neutral-500">Pessoas acompanhadas</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-grena-escuro">
                {percentualGeral === null ? "—" : `${percentualGeral}%`}
              </p>
              <p className="mt-1 text-xs font-medium text-neutral-500">% Geral hoje</p>
            </div>
            <div className="card p-4 text-center">
              <p className={`text-2xl font-bold ${totalPendencias > 0 ? "text-orange-700" : "text-grena-escuro"}`}>
                {totalPendencias}
              </p>
              <p className="mt-1 text-xs font-medium text-neutral-500">Pendências no total</p>
            </div>
            <div className="card p-4 text-center">
              <p className={`text-2xl font-bold ${totalAtrasadas > 0 ? "text-red-700" : "text-emerald-700"}`}>
                {totalAtrasadas}
              </p>
              <p className="mt-1 text-xs font-medium text-neutral-500">Atrasadas</p>
            </div>
          </div>

          <DemandasListagem cards={cards} hojeStr={hojeStr} />
        </>
      )}
    </AppShell>
  );
}
