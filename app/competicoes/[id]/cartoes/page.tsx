import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompeticaoTabs } from "@/components/competicao-tabs";
import { createClient } from "@/lib/supabase/server";
import { carregarCompeticao } from "@/lib/futebol/competicao-query";
import { calcularDisciplina } from "@/lib/futebol/competicao-disciplina";
import { hojeBrasilia } from "@/lib/data-brasil";

/**
 * Tela de Cartões — SOMENTE consulta e análise (spec, item 9): não existe "+ Registrar cartão".
 * Todo cartão nasce como evento da súmula do jogo; esta tela lê e consolida esses eventos, com
 * filtros por fase/grupo/atleta/tipo. Filtro de fase/grupo recalcula a disciplina só com os jogos
 * daquele recorte (mesmo motor, subconjunto de jogos).
 */
export default async function CompeticaoCartoesPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { fase?: string; grupo?: string; atleta?: string; tipo?: string };
}) {
  const supabase = createClient();
  const carregada = await carregarCompeticao(supabase, params.id);
  if (!carregada) notFound();

  const { competicao, fases, gruposPorFase, vinculos, jogosOrdenados, eventosCartao, manuais, atletasById } =
    carregada;
  const hojeStr = hojeBrasilia();

  const faseFiltro = searchParams.fase || "";
  const grupoFiltro = searchParams.grupo || "";
  const atletaFiltro = searchParams.atleta || "";
  const tipoFiltro = searchParams.tipo || "";

  // Recorte de jogos pelo filtro de fase/grupo → recalcula o motor só com esses jogos.
  const jogosFiltrados = jogosOrdenados.filter((j) => {
    const vinculo = vinculos.find((v) => v.jogo_id === j.jogoId);
    if (faseFiltro && vinculo?.fase_id !== faseFiltro) return false;
    if (grupoFiltro && vinculo?.grupo_id !== grupoFiltro) return false;
    return true;
  });
  const disciplinaFiltrada =
    faseFiltro || grupoFiltro
      ? calcularDisciplina(
          {
            amarelosParaSuspensao: competicao.regra_amarelos_suspensao,
            jogosSuspensaoAmarelos: competicao.regra_jogos_suspensao_amarelos,
            jogosSuspensaoVermelho: competicao.regra_jogos_suspensao_vermelho,
          },
          jogosFiltrados,
          eventosCartao,
          manuais.map((m) => ({
            id: m.id,
            atletaId: m.atleta_id,
            origem: m.origem,
            motivo: m.motivo,
            jogosSuspensao: m.jogos_suspensao,
            dataDecisao: m.data_decisao,
          })),
          hojeStr,
          carregada.fasesQueZeramAmarelos,
        )
      : carregada.disciplina;

  const linhas = disciplinaFiltrada.cartoes
    .filter((c) => (atletaFiltro ? c.atletaId === atletaFiltro : true))
    .filter((c) => {
      if (tipoFiltro === "amarelo") return c.amarelos > 0;
      if (tipoFiltro === "vermelho") return c.vermelhos > 0;
      return true;
    })
    .sort((a, b) => b.amarelos + b.vermelhos * 10 - (a.amarelos + a.vermelhos * 10));

  const suspensosAtivos = new Set(
    disciplinaFiltrada.suspensoes.filter((s) => s.status === "ativa").map((s) => s.atletaId),
  );

  const atletasComCartao = Array.from(new Set(carregada.disciplina.cartoes.map((c) => c.atletaId)))
    .map((id) => atletasById.get(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, "pt-BR"));

  const pdfQuery = new URLSearchParams();
  if (faseFiltro) pdfQuery.set("fase", faseFiltro);
  if (grupoFiltro) pdfQuery.set("grupo", grupoFiltro);
  if (atletaFiltro) pdfQuery.set("atleta", atletaFiltro);
  if (tipoFiltro) pdfQuery.set("tipo", tipoFiltro);

  return (
    <AppShell>
      <CompeticaoTabs competicao={competicao} active="cartoes" />

      <p className="rounded-md border border-dourado/30 bg-dourado/5 px-4 py-3 text-sm text-neutral-700">
        <span className="font-semibold">Tela somente de consulta.</span> Todo cartão nasce na súmula do jogo
        (Jogos → Súmula) — aqui os eventos são lidos e consolidados pelo motor de regras. Fluxo: Súmula →
        Evento disciplinar → Cartões → Motor de regras → Suspensão → Condição de jogo → Alerta.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="fase" className="field-label">
            Fase
          </label>
          <select id="fase" name="fase" defaultValue={faseFiltro} className="field-input w-auto">
            <option value="">Todas</option>
            {fases.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="grupo" className="field-label">
            Grupo
          </label>
          <select id="grupo" name="grupo" defaultValue={grupoFiltro} className="field-input w-auto">
            <option value="">Todos</option>
            {fases.flatMap((f) =>
              (gruposPorFase.get(f.id) ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome} ({f.nome})
                </option>
              )),
            )}
          </select>
        </div>
        <div>
          <label htmlFor="atleta" className="field-label">
            Atleta
          </label>
          <select id="atleta" name="atleta" defaultValue={atletaFiltro} className="field-input w-auto">
            <option value="">Todos</option>
            {atletasComCartao.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome_completo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tipo" className="field-label">
            Tipo
          </label>
          <select id="tipo" name="tipo" defaultValue={tipoFiltro} className="field-input w-auto">
            <option value="">Todos</option>
            <option value="amarelo">Amarelo</option>
            <option value="vermelho">Vermelho</option>
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Filtrar
        </button>
        <a
          href={`/competicoes/${competicao.id}/cartoes/pdf${pdfQuery.toString() ? `?${pdfQuery.toString()}` : ""}`}
          target="_blank"
          className="btn-secondary ml-auto"
        >
          Gerar PDF
        </a>
      </form>

      <div className="card tabela-rolavel mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linha bg-neutral-50 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">Atleta</th>
              <th className="px-4 py-3">Amarelos</th>
              <th className="px-4 py-3">Vermelhos</th>
              <th className="px-4 py-3">Último cartão</th>
              <th className="px-4 py-3">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {linhas.map((c) => {
              const atleta = atletasById.get(c.atletaId);
              const ultimoJogo = c.ultimoJogoId
                ? jogosOrdenados.find((j) => j.jogoId === c.ultimoJogoId) ?? null
                : null;
              const suspenso = suspensosAtivos.has(c.atletaId);
              return (
                <tr key={c.atletaId}>
                  <td className="px-4 py-3 font-medium text-neutral-800">
                    {atleta?.nome_completo ?? "Atleta"}
                    {atleta?.posicao ? <span className="ml-1 text-xs text-neutral-400">· {atleta.posicao}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-amber-600">{c.amarelos}</span>
                    {c.amarelosAtivos !== c.amarelos ? (
                      <span className="ml-1 text-xs text-neutral-400">({c.amarelosAtivos} no ciclo)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={c.vermelhos > 0 ? "font-semibold text-red-700" : "text-neutral-400"}>
                      {c.vermelhos}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{ultimoJogo ? ultimoJogo.confronto : "—"}</td>
                  <td className="px-4 py-3">
                    {suspenso ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        Suspenso
                      </span>
                    ) : c.pendurado ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        Pendurado
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        Regular
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum cartão registrado nas súmulas dos jogos vinculados{faseFiltro || grupoFiltro ? " (neste filtro)" : ""}.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
