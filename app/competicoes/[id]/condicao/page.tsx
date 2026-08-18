import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompeticaoTabs } from "@/components/competicao-tabs";
import { createClient } from "@/lib/supabase/server";
import { carregarCompeticao } from "@/lib/futebol/competicao-query";
import { condicaoDoAtleta, type CondicaoJogoStatus } from "@/lib/futebol/competicao-disciplina";
import { hojeBrasilia } from "@/lib/data-brasil";

const STATUS_INFO: Record<CondicaoJogoStatus, { label: string; classe: string; ordem: number }> = {
  suspenso: { label: "SUSPENSO", classe: "bg-red-50 text-red-700", ordem: 0 },
  irregular: { label: "IRREGULAR", classe: "bg-red-50 text-red-700", ordem: 1 },
  atencao: { label: "ATENÇÃO", classe: "bg-amber-50 text-amber-700", ordem: 2 },
  apto: { label: "APTO", classe: "bg-emerald-50 text-emerald-700", ordem: 3 },
};

/**
 * Condição de jogo (spec, item 7): calculada automaticamente ao escolher um jogo vinculado —
 * inscrição na competição, cartões das súmulas anteriores, suspensões (ativas e cumpridas) e
 * regras da competição. Além dos inscritos, quem está CONVOCADO pro jogo sem estar inscrito
 * aparece como IRREGULAR (é exatamente o caso que essa tela existe pra pegar).
 */
export default async function CompeticaoCondicaoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { jogoId?: string };
}) {
  const supabase = createClient();
  const carregada = await carregarCompeticao(supabase, params.id);
  if (!carregada) notFound();

  const { competicao, disciplina, inscricoes, atletasById, jogosOrdenados } = carregada;
  const hojeStr = hojeBrasilia();

  const jogoSelecionadoId =
    searchParams.jogoId && jogosOrdenados.some((j) => j.jogoId === searchParams.jogoId)
      ? searchParams.jogoId
      : (jogosOrdenados.find((j) => j.data >= hojeStr) ?? jogosOrdenados[jogosOrdenados.length - 1])?.jogoId ?? null;
  const jogoSelecionado = jogosOrdenados.find((j) => j.jogoId === jogoSelecionadoId) ?? null;

  // Convocados do jogo que não estão inscritos na competição → IRREGULAR.
  let convocadosNaoInscritos: string[] = [];
  if (jogoSelecionado) {
    const { data: convocacaoData } = await supabase
      .from("convocacoes")
      .select("id")
      .eq("jogo_id", jogoSelecionado.jogoId)
      .maybeSingle();
    if (convocacaoData) {
      const { data: convocadosData } = await supabase
        .from("convocacao_atletas")
        .select("atleta_id")
        .eq("convocacao_id", convocacaoData.id as string);
      const inscritosIds = new Set(inscricoes.map((i) => i.atleta_id));
      convocadosNaoInscritos = ((convocadosData ?? []) as { atleta_id: string }[])
        .map((c) => c.atleta_id)
        .filter((id) => !inscritosIds.has(id));
    }
  }

  // Nomes dos convocados não inscritos podem não estar em atletasById (que só carrega envolvidos).
  const nomesExtras = new Map<string, { nome_completo: string; posicao: string | null }>();
  const faltando = convocadosNaoInscritos.filter((id) => !atletasById.has(id));
  if (faltando.length) {
    const { data } = await supabase.from("atletas").select("id, nome_completo, posicao").in("id", faltando);
    for (const a of (data ?? []) as { id: string; nome_completo: string; posicao: string | null }[]) {
      nomesExtras.set(a.id, { nome_completo: a.nome_completo, posicao: a.posicao });
    }
  }

  const linhas = jogoSelecionado
    ? [
        ...inscricoes.map((i) => ({
          atletaId: i.atleta_id,
          condicao: condicaoDoAtleta(i.atleta_id, jogoSelecionado.jogoId, true, disciplina),
        })),
        ...convocadosNaoInscritos.map((atletaId) => ({
          atletaId,
          condicao: condicaoDoAtleta(atletaId, jogoSelecionado.jogoId, false, disciplina),
        })),
      ].sort((a, b) => {
        const oa = STATUS_INFO[a.condicao.status].ordem;
        const ob = STATUS_INFO[b.condicao.status].ordem;
        if (oa !== ob) return oa - ob;
        const na = atletasById.get(a.atletaId)?.nome_completo ?? nomesExtras.get(a.atletaId)?.nome_completo ?? "";
        const nb = atletasById.get(b.atletaId)?.nome_completo ?? nomesExtras.get(b.atletaId)?.nome_completo ?? "";
        return na.localeCompare(nb, "pt-BR");
      })
    : [];

  const contagem = { apto: 0, atencao: 0, suspenso: 0, irregular: 0 } as Record<CondicaoJogoStatus, number>;
  for (const l of linhas) contagem[l.condicao.status] += 1;

  return (
    <AppShell>
      <CompeticaoTabs competicao={competicao} active="condicao" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-bold text-grena-escuro">Condição de jogo</h2>
        <div className="flex items-end gap-2">
          <form method="get" className="flex items-end gap-2">
            <div>
              <label htmlFor="jogoId" className="field-label">
                Jogo
              </label>
              <select id="jogoId" name="jogoId" defaultValue={jogoSelecionadoId ?? ""} className="field-input w-auto">
                {jogosOrdenados.map((j) => (
                  <option key={j.jogoId} value={j.jogoId}>
                    {j.confronto}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-secondary">
              Ver
            </button>
          </form>
          {jogoSelecionado ? (
            <a
              href={`/competicoes/${competicao.id}/condicao/pdf?jogoId=${jogoSelecionado.jogoId}`}
              target="_blank"
              className="btn-secondary"
            >
              Gerar PDF
            </a>
          ) : null}
        </div>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Calculada automaticamente: inscrição, lista A/B, cartões das súmulas anteriores, suspensões (ativas e
        cumpridas) e as regras da competição.
      </p>

      {!jogoSelecionado ? (
        <div className="card mt-4 p-8 text-center text-neutral-400">
          Vincule jogos à competição primeiro (aba Jogos).
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">🟢 Aptos</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{contagem.apto}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">🟡 Atenção</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{contagem.atencao}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">🔴 Suspensos</p>
              <p className="mt-1 text-2xl font-bold text-red-700">{contagem.suspenso}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">🔴 Irregulares</p>
              <p className="mt-1 text-2xl font-bold text-red-700">{contagem.irregular}</p>
            </div>
          </div>

          <div className="card tabela-rolavel mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-linha bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-4 py-3">Atleta</th>
                  <th className="px-4 py-3">Condição</th>
                  <th className="px-4 py-3">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {linhas.map((l) => {
                  const atleta = atletasById.get(l.atletaId) ?? null;
                  const extra = nomesExtras.get(l.atletaId) ?? null;
                  const info = STATUS_INFO[l.condicao.status];
                  return (
                    <tr key={l.atletaId}>
                      <td className="px-4 py-3 font-medium text-neutral-800">
                        {atleta?.nome_completo ?? extra?.nome_completo ?? "Atleta"}
                        {(atleta?.posicao ?? extra?.posicao) ? (
                          <span className="ml-1 text-xs text-neutral-400">· {atleta?.posicao ?? extra?.posicao}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${info.classe}`}>
                          {info.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{l.condicao.detalhe}</td>
                    </tr>
                  );
                })}
                {linhas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                      Nenhum atleta inscrito na competição ainda (aba Atletas Inscritos).
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
