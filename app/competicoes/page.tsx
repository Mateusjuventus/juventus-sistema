import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CompeticaoStatusBadge } from "@/components/competicao-tabs";
import { createClient } from "@/lib/supabase/server";
import type { CompeticaoRow, TemporadaRow } from "@/lib/supabase/types";
import { criarTemporada } from "./actions";

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Tela inicial do módulo de Competições: temporadas com suas competições dentro (uma temporada
 * tem várias competições; cada competição pertence a uma única temporada — ver spec
 * docs/superpowers/specs/2026-08-10-competicoes-design.md).
 */
export default async function CompeticoesPage() {
  const supabase = createClient();

  const [{ data: temporadasData }, { data: competicoesData }] = await Promise.all([
    supabase.from("temporadas").select("*").order("nome", { ascending: false }),
    supabase
      .from("competicoes")
      .select("*")
      .order("data_inicio", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  const temporadas = (temporadasData ?? []) as TemporadaRow[];
  const competicoes = (competicoesData ?? []) as CompeticaoRow[];

  const porTemporada = new Map<string, CompeticaoRow[]>();
  for (const c of competicoes) {
    const lista = porTemporada.get(c.temporada_id) ?? [];
    lista.push(c);
    porTemporada.set(c.temporada_id, lista);
  }

  return (
    <AppShell>
      <PageHeader title="Competições" />
      <p className="mt-1 text-center text-sm text-neutral-500">Organizadas por temporada.</p>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <form action={criarTemporada} className="flex items-end gap-2">
          <div>
            <label htmlFor="nome" className="field-label">
              Nova temporada
            </label>
            <input id="nome" name="nome" className="field-input w-40" placeholder="Ex.: 2027" required />
          </div>
          <button type="submit" className="btn-secondary">
            + Criar temporada
          </button>
        </form>
        <Link href="/competicoes/nova" className="btn-primary">
          + Nova competição
        </Link>
      </div>

      {temporadas.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-neutral-400">
          Nenhuma temporada ainda. Crie a primeira (ex.: {new Date().getFullYear()}) e depois cadastre as
          competições dela.
        </div>
      ) : null}

      <div className="mt-6 space-y-5">
        {temporadas.map((t) => {
          const daTemporada = porTemporada.get(t.id) ?? [];
          return (
            <section key={t.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-grena-escuro">Temporada {t.nome}</h2>
                <span className="text-sm text-neutral-500">
                  {daTemporada.length === 1 ? "1 competição" : `${daTemporada.length} competições`}
                </span>
              </div>

              {daTemporada.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-400">Nenhuma competição nesta temporada ainda.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {daTemporada.map((c) => (
                    <Link
                      key={c.id}
                      href={`/competicoes/${c.id}`}
                      className="card flex flex-wrap items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-dourado"
                    >
                      <div className="min-w-[220px] flex-1">
                        <p className="font-semibold text-grena-escuro">{c.nome}</p>
                        <p className="mt-0.5 text-sm text-neutral-500">
                          {c.categoria}
                          {c.federacao ? ` · ${c.federacao}` : ""}
                          {c.data_inicio || c.data_termino
                            ? ` · ${formatData(c.data_inicio)} — ${formatData(c.data_termino)}`
                            : ""}
                        </p>
                      </div>
                      <CompeticaoStatusBadge status={c.status} />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
