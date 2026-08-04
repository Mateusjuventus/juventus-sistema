import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { buscarJogosPendentes } from "@/lib/fpf/sincronizar";
import type { JogoRow } from "@/lib/supabase/types";
import { criarJogoDaFpf, ignorarJogoFpf, vincularJogoExistente } from "./actions";

export default async function JogosPendentesFpfPage() {
  const supabase = createClient();
  const { config, pendentes } = await buscarJogosPendentes(supabase);

  const { data: jogosSemVinculoData } = await supabase
    .from("jogos")
    .select("id, adversario_nome, data_jogo, competicao")
    .is("fpf_id_jogo", null)
    .order("data_jogo", { ascending: false });
  const jogosSemVinculo = (jogosSemVinculoData ?? []) as Pick<
    JogoRow,
    "id" | "adversario_nome" | "data_jogo" | "competicao"
  >[];

  return (
    <AppShell>
      <Link href="/jogos" className="text-sm font-medium text-grena hover:underline">
        ← Voltar para Jogos
      </Link>
      <PageHeader title="Jogos da FPF pendentes" />

      {!config ? (
        <div className="card mt-4 p-4 text-sm text-neutral-600">
          A integração com a FPF ainda não foi configurada.{" "}
          <Link href="/jogos/fpf/configurar" className="font-medium text-grena hover:underline">
            Configurar agora
          </Link>
          .
        </div>
      ) : pendentes.length === 0 ? (
        <div className="card mt-4 p-8 text-center text-neutral-400">
          Nenhum jogo pendente — todos os jogos da FPF já estão vinculados.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {pendentes.map((jogo) => (
            <div key={jogo.fpfIdJogo} className="card flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-grena-escuro">
                    {jogo.mandante ? "Juventus SAF" : jogo.adversarioNome} ×{" "}
                    {jogo.mandante ? jogo.adversarioNome : "Juventus SAF"}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {jogo.dataJogo.split("-").reverse().join("/")} · {jogo.horario} · {jogo.localEstadio}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {jogo.competicao} · {jogo.rodadaFase}
                    {jogo.golsPro !== null && jogo.golsContra !== null
                      ? ` · Placar: ${jogo.golsPro} × ${jogo.golsContra}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={criarJogoDaFpf}>
                    <input type="hidden" name="fpfIdJogo" value={jogo.fpfIdJogo} />
                    <input type="hidden" name="competicao" value={jogo.competicao} />
                    <input type="hidden" name="rodadaFase" value={jogo.rodadaFase} />
                    <input type="hidden" name="adversarioNome" value={jogo.adversarioNome} />
                    <input type="hidden" name="dataJogo" value={jogo.dataJogo} />
                    <input type="hidden" name="horario" value={jogo.horario} />
                    <input type="hidden" name="localEstadio" value={jogo.localEstadio} />
                    <input type="hidden" name="endereco" value={jogo.endereco} />
                    <input type="hidden" name="mandante" value={String(jogo.mandante)} />
                    <input type="hidden" name="golsPro" value={jogo.golsPro ?? ""} />
                    <input type="hidden" name="golsContra" value={jogo.golsContra ?? ""} />
                    <input type="hidden" name="fpfLinkSumula" value={jogo.fpfLinkSumula ?? ""} />
                    <button type="submit" className="btn-primary">
                      Criar jogo
                    </button>
                  </form>

                  <form action={ignorarJogoFpf}>
                    <input type="hidden" name="fpfIdJogo" value={jogo.fpfIdJogo} />
                    <input
                      type="hidden"
                      name="descricao"
                      value={`${jogo.adversarioNome} · ${jogo.dataJogo}`}
                    />
                    <button type="submit" className="btn-secondary">
                      Ignorar
                    </button>
                  </form>
                </div>
              </div>

              {jogosSemVinculo.length > 0 ? (
                <details className="mt-1">
                  <summary className="cursor-pointer text-sm font-medium text-grena hover:underline">
                    Vincular a um jogo já cadastrado
                  </summary>
                  <form action={vincularJogoExistente} className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="fpfIdJogo" value={jogo.fpfIdJogo} />
                    <input type="hidden" name="fpfLinkSumula" value={jogo.fpfLinkSumula ?? ""} />
                    <select name="jogoId" required className="field-input min-w-[260px]">
                      <option value="">Selecione o jogo...</option>
                      {jogosSemVinculo.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.adversario_nome} · {j.data_jogo.split("-").reverse().join("/")} · {j.competicao}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn-secondary">
                      Vincular
                    </button>
                  </form>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
