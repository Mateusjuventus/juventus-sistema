import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JogoTabs } from "@/components/jogo-tabs";
import { createClient } from "@/lib/supabase/server";
import type { JogoRow } from "@/lib/supabase/types";

function formatDataHoraBr(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
}

export default async function JogoFpfPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("jogos").select("*").eq("id", params.id).single();
  if (!data) notFound();
  const jogo = data as JogoRow;

  return (
    <AppShell>
      <JogoTabs jogoId={jogo.id} active="fpf" />

      <div className="card p-4">
        <h2 className="text-lg font-bold text-grena-escuro">Dados oficiais da FPF</h2>

        {!jogo.fpf_id_jogo ? (
          <div className="mt-3 text-sm text-neutral-600">
            <p>Este jogo ainda não está vinculado a um jogo da FPF.</p>
            <a href="/jogos/fpf/pendentes" className="mt-2 inline-block font-medium text-grena hover:underline">
              Ir pra revisão de jogos pendentes da FPF
            </a>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2 text-sm text-neutral-700">
            <p>
              Jogo nº FPF: <span className="font-medium">{jogo.fpf_id_jogo}</span>
            </p>
            <p>
              Última sincronização:{" "}
              <span className="font-medium">
                {jogo.fpf_sincronizado_em ? formatDataHoraBr(jogo.fpf_sincronizado_em) : "nunca"}
              </span>
            </p>
            {jogo.fpf_link_sumula ? (
              <p>
                <a
                  href={jogo.fpf_link_sumula}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-grena hover:underline"
                >
                  Ver súmula oficial da FPF (PDF)
                </a>
              </p>
            ) : (
              <p className="text-neutral-400">Súmula oficial ainda não publicada pela FPF.</p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
