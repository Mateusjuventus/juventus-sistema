import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { JogoRow } from "@/lib/supabase/types";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function StatCard({ label, valor, destaque }: { label: string; valor: string | number; destaque?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${destaque ?? "text-grena-escuro"}`}>{valor}</p>
    </div>
  );
}

export default async function JogosDashboardPage() {
  const supabase = createClient();
  const { data, error } = await supabase.from("jogos").select("*").order("data_jogo", { ascending: false });
  const jogos = (data ?? []) as JogoRow[];

  const finalizados = jogos.filter((j) => j.gols_pro !== null && j.gols_contra !== null);
  const vitorias = finalizados.filter((j) => j.gols_pro! > j.gols_contra!).length;
  const empates = finalizados.filter((j) => j.gols_pro! === j.gols_contra!).length;
  const derrotas = finalizados.filter((j) => j.gols_pro! < j.gols_contra!).length;
  const golsPro = finalizados.reduce((soma, j) => soma + (j.gols_pro ?? 0), 0);
  const golsContra = finalizados.reduce((soma, j) => soma + (j.gols_contra ?? 0), 0);
  const saldoGols = golsPro - golsContra;
  const jogosCasa = jogos.filter((j) => j.mandante).length;
  const jogosFora = jogos.filter((j) => !j.mandante).length;

  return (
    <AppShell>
      <Link href="/jogos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Jogos
      </Link>
      <PageHeader title="Dashboard de Jogos" />

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar os jogos. Verifique a conexão com o Supabase.
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total de jogos" valor={jogos.length} />
        <StatCard label="Vitórias" valor={vitorias} destaque="text-green-700" />
        <StatCard label="Empates" valor={empates} destaque="text-neutral-600" />
        <StatCard label="Derrotas" valor={derrotas} destaque="text-red-700" />
        <StatCard
          label="Saldo de gols"
          valor={saldoGols > 0 ? `+${saldoGols}` : saldoGols}
          destaque={saldoGols > 0 ? "text-green-700" : saldoGols < 0 ? "text-red-700" : "text-neutral-600"}
        />
        <StatCard label="Gols pró" valor={golsPro} />
        <StatCard label="Gols contra" valor={golsContra} />
        <StatCard label="Jogos em casa" valor={jogosCasa} />
        <StatCard label="Jogos fora" valor={jogosFora} />
        <StatCard label="Jogos com resultado" valor={finalizados.length} />
      </div>

      <h2 className="mt-8 text-lg font-bold text-grena-escuro">Resultados</h2>
      {finalizados.length === 0 ? (
        <div className="card mt-3 p-8 text-center text-neutral-400">
          Nenhum jogo com placar preenchido ainda. Edite um jogo e preencha o resultado depois de acontecer.
        </div>
      ) : (
        <div className="card mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Confronto</th>
                <th className="px-4 py-3">Competição</th>
                <th className="px-4 py-3">Placar</th>
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {finalizados.map((j) => {
                const label =
                  j.gols_pro! > j.gols_contra! ? "Vitória" : j.gols_pro! < j.gols_contra! ? "Derrota" : "Empate";
                const classe =
                  label === "Vitória"
                    ? "bg-green-100 text-green-800"
                    : label === "Derrota"
                      ? "bg-red-100 text-red-800"
                      : "bg-neutral-200 text-neutral-700";
                const placarEsquerda = j.mandante ? j.gols_pro : j.gols_contra;
                const placarDireita = j.mandante ? j.gols_contra : j.gols_pro;
                return (
                  <tr key={j.id}>
                    <td className="px-4 py-3">{formatData(j.data_jogo)}</td>
                    <td className="px-4 py-3 font-medium text-neutral-800">
                      {j.mandante ? "Juventus" : j.adversario_nome} x{" "}
                      {j.mandante ? j.adversario_nome : "Juventus"}
                    </td>
                    <td className="px-4 py-3">{j.competicao}</td>
                    <td className="px-4 py-3 font-semibold">
                      {placarEsquerda} × {placarDireita}
                    </td>
                    <td className="px-4 py-3">{j.mandante ? "Em casa" : "Fora"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classe}`}>{label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
