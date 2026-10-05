import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompeticaoTabsBase } from "@/components/competicao-tabs-base";
import { createClient } from "@/lib/supabase/server";
import { verificarAcessoCompeticaoBase } from "@/lib/auth/competicao-base-guard";
import { confrontoResumoBase } from "@/lib/futebol/competicao-query-base";
import { hojeBrasilia } from "@/lib/data-brasil";
import type { JogoBaseRow } from "@/lib/supabase/types";
import { atualizarVinculoJogoBase, desvincularJogoBase, vincularJogoBase } from "../../actions";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Jogos da competição (Futebol de Base) — espelha `app/competicoes/[id]/jogos/page.tsx`. Única
 * diferença: a lista de jogos disponíveis pra vincular já filtra pela categoria DESTA competição
 * (uma competição da Base é sempre de uma categoria só — não faz sentido oferecer jogos de outra).
 */
export default async function CompeticaoBaseJogosPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const carregada = await verificarAcessoCompeticaoBase(supabase, params.id);
  if (!carregada) notFound();

  const { competicao, fases, gruposPorFase, vinculos, jogosById } = carregada;
  const hojeStr = hojeBrasilia();

  // Jogos da MESMA categoria ainda sem vínculo com NENHUMA competição (jogo_id é unique em
  // competicao_jogos_base).
  const [{ data: jogosData }, { data: vinculadosData }] = await Promise.all([
    supabase.from("jogos_base").select("*").eq("categoria", competicao.categoria).order("data_jogo", { ascending: false }),
    supabase.from("competicao_jogos_base").select("jogo_id"),
  ]);
  const jaVinculados = new Set(((vinculadosData ?? []) as { jogo_id: string }[]).map((v) => v.jogo_id));
  const jogosDisponiveis = ((jogosData ?? []) as JogoBaseRow[]).filter((j) => !jaVinculados.has(j.id));

  const vincularAction = vincularJogoBase.bind(null, competicao.id);
  const atualizarAction = atualizarVinculoJogoBase.bind(null, competicao.id);
  const desvincularAction = desvincularJogoBase.bind(null, competicao.id);

  const vinculosOrdenados = [...vinculos].sort((a, b) => {
    const ja = jogosById.get(a.jogo_id)?.data_jogo ?? "";
    const jb = jogosById.get(b.jogo_id)?.data_jogo ?? "";
    return ja.localeCompare(jb);
  });

  const todosGrupos = fases.flatMap((f) =>
    (gruposPorFase.get(f.id) ?? []).map((g) => ({ faseNome: f.nome, grupo: g })),
  );
  const proximoVinculado = vinculosOrdenados.find((v) => (jogosById.get(v.jogo_id)?.data_jogo ?? "") >= hojeStr);

  return (
    <AppShell breadcrumb="Jogos vinculados">
      <CompeticaoTabsBase competicao={competicao} active="jogos" />

      <p className="rounded-md border border-dourado/30 bg-dourado/5 px-4 py-3 text-sm text-neutral-700">
        <span className="font-semibold">Os jogos vêm do módulo de Jogos.</span> Aqui você só vincula um jogo
        existente à competição, informando fase e grupo — nada de cadastrar jogo de novo.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-grena-escuro">
          Jogos vinculados ({vinculosOrdenados.length})
        </h2>
        <a href={`/base/competicoes/${competicao.id}/pdf`} target="_blank" className="btn-secondary">
          Gerar PDF
        </a>
      </div>

      <div className="card tabela-rolavel mt-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linha bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">Jogo</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Fase</th>
              <th className="px-4 py-3">Grupo</th>
              <th className="px-4 py-3">Placar</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {vinculosOrdenados.map((v) => {
              const jogo = jogosById.get(v.jogo_id);
              if (!jogo) return null;
              const comPlacar = jogo.gols_pro !== null && jogo.gols_contra !== null;
              const ehProximo = proximoVinculado?.id === v.id;
              return (
                <tr key={v.id} className={ehProximo ? "bg-dourado/5" : undefined}>
                  <td className="px-4 py-3">
                    <Link href={`/base/jogos/${jogo.id}`} className="font-medium text-neutral-800 hover:text-grena">
                      {confrontoResumoBase(jogo)}
                    </Link>
                    {ehProximo ? (
                      <span className="ml-2 rounded-full bg-dourado/10 px-2 py-0.5 text-xs font-semibold text-dourado">
                        Próximo
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{formatData(jogo.data_jogo)}</td>
                  <td className="px-4 py-3" colSpan={2}>
                    <form action={atualizarAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="vinculoId" value={v.id} />
                      <select name="faseId" defaultValue={v.fase_id ?? ""} className="field-input w-auto py-1 text-xs">
                        <option value="">Sem fase</option>
                        {fases.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nome}
                          </option>
                        ))}
                      </select>
                      <select name="grupoId" defaultValue={v.grupo_id ?? ""} className="field-input w-auto py-1 text-xs">
                        <option value="">Sem grupo</option>
                        {todosGrupos.map((t) => (
                          <option key={t.grupo.id} value={t.grupo.id}>
                            {t.grupo.nome} ({t.faseNome})
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="btn-secondary px-2 py-1 text-xs">
                        OK
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {comPlacar
                      ? jogo.mandante
                        ? `${jogo.gols_pro} x ${jogo.gols_contra}`
                        : `${jogo.gols_contra} x ${jogo.gols_pro}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={desvincularAction}>
                      <input type="hidden" name="id" value={v.id} />
                      <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
                        Desvincular
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {vinculosOrdenados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum jogo vinculado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section className="card mt-6 p-5">
        <h3 className="text-base font-bold text-grena-escuro">Vincular jogo existente</h3>
        {jogosDisponiveis.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">
            Todos os jogos cadastrados dessa categoria já estão vinculados a alguma competição. Cadastre o
            jogo no módulo de{" "}
            <Link href="/base/jogos/novo" className="font-medium text-grena hover:underline">
              Jogos
            </Link>{" "}
            e volte aqui pra vincular.
          </p>
        ) : (
          <form action={vincularAction} className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-[260px] flex-1">
              <label htmlFor="jogoId" className="field-label">
                Jogo
              </label>
              <select id="jogoId" name="jogoId" className="field-input" required>
                {jogosDisponiveis.map((j) => (
                  <option key={j.id} value={j.id}>
                    {confrontoResumoBase(j)} — {formatData(j.data_jogo)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="faseId" className="field-label">
                Fase
              </label>
              <select id="faseId" name="faseId" className="field-input">
                <option value="">Sem fase</option>
                {fases.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="grupoId" className="field-label">
                Grupo
              </label>
              <select id="grupoId" name="grupoId" className="field-input">
                <option value="">Sem grupo</option>
                {todosGrupos.map((t) => (
                  <option key={t.grupo.id} value={t.grupo.id}>
                    {t.grupo.nome} ({t.faseNome})
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary">
              Vincular
            </button>
          </form>
        )}
      </section>
    </AppShell>
  );
}
