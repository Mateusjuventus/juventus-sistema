import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type { JogoRow } from "@/lib/supabase/types";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Hub de Logística de Jogo: lista os jogos cadastrados e leva pra tela de logística
 * (rooming list, ônibus e credenciamento) de cada um. A logística é sempre por jogo —
 * ver docs/superpowers/specs/2026-07-09-convocacao-presskit-logistica-design.md.
 */
export default async function LogisticaHubPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("jogos")
    .select("*")
    .order("data_jogo", { ascending: false });

  const jogos = (data ?? []) as JogoRow[];
  const logoUrls = await Promise.all(jogos.map((j) => getSignedPhotoUrl(supabase, j.adversario_logo_path)));

  return (
    <AppShell>
      <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Logística de Jogo" />
      <p className="mt-2 text-center text-sm text-neutral-500">
        Escolha um jogo para montar a rooming list, a lista de ônibus e o credenciamento por zona.
      </p>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar os jogos. Verifique a conexão com o Supabase.
        </p>
      ) : null}

      {jogos.length === 0 && !error ? (
        <div className="card mt-4 p-8 text-center text-neutral-400">
          Nenhum jogo cadastrado ainda.{" "}
          <Link href="/jogos/novo" className="font-medium text-grena hover:underline">
            Cadastrar um jogo
          </Link>
          .
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jogos.map((j, i) => {
          const logo = logoUrls[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrls[i]!}
              alt={j.adversario_nome}
              className="h-12 w-12 rounded-full border border-neutral-200 bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-xs text-neutral-400">
              {j.adversario_nome.slice(0, 3).toUpperCase()}
            </div>
          );

          return (
            <Link
              key={j.id}
              href={`/jogos/${j.id}/logistica`}
              className="card flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-dourado"
            >
              <div className="flex items-center gap-3">
                <JuventusCrestMark className="h-8 w-8" />
                <span className="text-neutral-300">×</span>
                {logo}
              </div>
              <p className="font-semibold text-grena-escuro">
                {j.mandante ? "Juventus" : j.adversario_nome} x {j.mandante ? j.adversario_nome : "Juventus"}
              </p>
              <p className="text-sm text-neutral-500">
                {j.competicao} · {formatData(j.data_jogo)} · {j.mandante ? "Em casa" : "Fora"}
              </p>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
