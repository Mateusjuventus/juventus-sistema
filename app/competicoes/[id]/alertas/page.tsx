import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompeticaoTabs } from "@/components/competicao-tabs";
import { createClient } from "@/lib/supabase/server";
import { carregarCompeticao } from "@/lib/futebol/competicao-query";
import { avisosDaCompeticao } from "@/lib/futebol/competicao-avisos";
import { hojeBrasilia } from "@/lib/data-brasil";

/**
 * Alertas da competição (spec, item 8): consequência dos dados que já existem — súmulas → motor
 * de regras → suspensão/pendurado/condição de jogo, mais prazos perto de vencer. Não existe
 * cadastro manual de alerta. Os mesmos itens aparecem no Mural da Home e na tela de Avisos.
 */
export default async function CompeticaoAlertasPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const carregada = await carregarCompeticao(supabase, params.id);
  if (!carregada) notFound();

  const { competicao } = carregada;
  const alertas = avisosDaCompeticao(carregada, hojeBrasilia());

  return (
    <AppShell>
      <CompeticaoTabs competicao={competicao} active="alertas" />

      <h2 className="text-lg font-bold text-grena-escuro">Alertas ({alertas.length})</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Gerados automaticamente pelas súmulas e pelo motor de regras — estes mesmos alertas aparecem no
        Mural da tela de Início e em Avisos.
      </p>

      {alertas.length === 0 ? (
        <div className="card mt-4 p-8 text-center text-neutral-400">
          Nenhum alerta no momento. Tudo em dia!
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {alertas.map((a, i) => (
            <Link
              key={i}
              href={a.href ?? "#"}
              className="card flex flex-wrap items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-dourado"
            >
              <div className="flex min-w-[220px] flex-1 items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.cor }} />
                <div>
                  <p className="font-medium text-neutral-800">{a.titulo}</p>
                  {a.subtitulo ? <p className="mt-0.5 text-sm text-neutral-500">{a.subtitulo}</p> : null}
                </div>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                  a.urgencia === "urgente"
                    ? "bg-red-50 text-red-700"
                    : a.urgencia === "atencao"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {a.diasRestantes === 0 ? "Hoje" : a.diasRestantes === 1 ? "Amanhã" : `Em ${a.diasRestantes} dias`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
