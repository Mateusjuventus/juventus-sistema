import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompeticaoTabs } from "@/components/competicao-tabs";
import { createClient } from "@/lib/supabase/server";
import { getSignedCompeticaoDocumentoUrl } from "@/lib/supabase/storage";
import { carregarCompeticao, confrontoComData } from "@/lib/futebol/competicao-query";
import {
  atualizarCartoesAdversario,
  excluirResultadoExterno,
  importarCartoesAdversarioPorLink,
  importarResultadoPorLink,
  lancarResultadoExterno,
} from "../../actions";

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Súmulas dos jogos dos grupos (pedido do Mateus): a área pra lançar os resultados dos jogos
 * entre os OUTROS clubes de cada grupo — com rodada, data e o PDF da súmula anexado — pra
 * contabilizar os pontos e sustentar a classificação. Os jogos do Juventus aparecem aqui só como
 * referência (entram sozinhos pela súmula/placar do módulo de Jogos, nunca são lançados à mão).
 */
export default async function CompeticaoResultadosPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const carregada = await carregarCompeticao(supabase, params.id);
  if (!carregada) notFound();

  const { competicao, fases, gruposPorFase, equipesPorGrupo, resultadosPorGrupo, vinculos, jogosById, eventosCartao } =
    carregada;

  const lancarAction = lancarResultadoExterno.bind(null, competicao.id);
  const excluirAction = excluirResultadoExterno.bind(null, competicao.id);
  const cartoesAdversarioAction = atualizarCartoesAdversario.bind(null, competicao.id);
  const importarResultadoAction = importarResultadoPorLink.bind(null, competicao.id);
  const importarCartoesAction = importarCartoesAdversarioPorLink.bind(null, competicao.id);

  // Signed URLs das súmulas anexadas (1h) — resolvidas de uma vez pra página inteira.
  const sumulaUrls = new Map<string, string | null>();
  for (const resultados of Array.from(resultadosPorGrupo.values())) {
    for (const r of resultados) {
      if (r.sumula_path && !sumulaUrls.has(r.id)) {
        sumulaUrls.set(r.id, await getSignedCompeticaoDocumentoUrl(supabase, r.sumula_path));
      }
    }
  }

  return (
    <AppShell>
      <CompeticaoTabs competicao={competicao} active="resultados" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-grena-escuro">Súmulas dos jogos dos grupos</h2>
        <Link href={`/competicoes/${competicao.id}/classificacao`} className="btn-secondary">
          Ver classificação
        </Link>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Lance aqui os resultados dos jogos entre os outros clubes de cada grupo (com a súmula anexada, se
        quiser) — é daqui que a classificação contabiliza os pontos. Os jogos do Juventus entram sozinhos
        pelo placar do módulo de Jogos.
      </p>

      {fases.length === 0 ? (
        <div className="card mt-4 p-8 text-center text-neutral-400">
          Crie as fases e grupos da competição primeiro, na aba Fases e Grupos.
        </div>
      ) : null}

      <div className="mt-4 space-y-6">
        {fases.map((fase) => {
          const grupos = (gruposPorFase.get(fase.id) ?? []).filter(
            (g) => (equipesPorGrupo.get(g.id) ?? []).some((e) => e.nome !== null),
          );
          if (grupos.length === 0) return null;
          return (
            <section key={fase.id}>
              <h3 className="text-base font-bold text-grena-escuro">{fase.nome}</h3>
              <div className="mt-2 space-y-4">
                {grupos.map((grupo) => {
                  const resultados = resultadosPorGrupo.get(grupo.id) ?? [];
                  const jogosDoGrupo = vinculos.filter((v) => v.grupo_id === grupo.id);
                  const equipesFixas = (equipesPorGrupo.get(grupo.id) ?? [])
                    .map((e) => e.nome)
                    .filter((n): n is string => n !== null)
                    .filter((n) => n.trim().toLocaleLowerCase("pt-BR") !== "juventus");

                  return (
                    <div key={grupo.id} className="card p-4">
                      <h4 className="text-sm font-bold uppercase tracking-wide text-neutral-600">{grupo.nome}</h4>

                      <div className="mt-3 space-y-1.5">
                        {jogosDoGrupo.map((v) => {
                          const jogo = jogosById.get(v.jogo_id);
                          if (!jogo) return null;
                          const comPlacar = jogo.gols_pro !== null && jogo.gols_contra !== null;
                          const nossos = eventosCartao.filter((e) => e.jogoId === v.jogo_id);
                          const nossosAmarelos = nossos.filter((e) => e.tipo === "cartao_amarelo").length;
                          const nossosVermelhos = nossos.filter((e) => e.tipo === "cartao_vermelho").length;
                          return (
                            <div key={v.id} className="rounded-md bg-dourado/5 px-3 py-2 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-medium text-grena">
                                  {confrontoComData(jogo)}
                                  <span className="ml-2 rounded-full bg-grena/10 px-2 py-0.5 text-[11px] font-semibold">
                                    jogo do Juventus
                                  </span>
                                </span>
                                <span className={comPlacar ? "font-semibold" : "text-neutral-400"}>
                                  {comPlacar
                                    ? jogo.mandante
                                      ? `${jogo.gols_pro} x ${jogo.gols_contra}`
                                      : `${jogo.gols_contra} x ${jogo.gols_pro}`
                                    : "sem placar — preencha no cadastro do jogo"}
                                </span>
                              </div>
                              <form
                                action={importarCartoesAction}
                                className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs"
                              >
                                <input type="hidden" name="vinculoId" value={v.id} />
                                <input type="hidden" name="adversario" value={jogo.adversario_nome} />
                                <input
                                  name="sumulaLink"
                                  type="url"
                                  defaultValue={v.sumula_link ?? jogo.fpf_link_sumula ?? ""}
                                  placeholder="Cole o link do PDF da súmula da FPF"
                                  className="field-input min-w-[260px] flex-1 py-1 text-xs"
                                />
                                <button type="submit" className="btn-secondary px-2 py-1 text-xs">
                                  Importar cartões do adversário
                                </button>
                              </form>
                              <form
                                action={cartoesAdversarioAction}
                                className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-600"
                              >
                                <input type="hidden" name="vinculoId" value={v.id} />
                                <span>
                                  Juventus: 🟨 {nossosAmarelos} · 🟥 {nossosVermelhos}{" "}
                                  <span className="text-neutral-400">(da súmula)</span>
                                </span>
                                <span className="text-neutral-300">|</span>
                                <label className="flex items-center gap-1">
                                  {jogo.adversario_nome}: 🟨
                                  <input
                                    name="amarelosAdversario"
                                    type="number"
                                    min={0}
                                    defaultValue={v.cartoes_amarelos_adversario}
                                    className="field-input w-14 py-0.5 text-xs"
                                  />
                                </label>
                                <label className="flex items-center gap-1">
                                  🟥
                                  <input
                                    name="vermelhosAdversario"
                                    type="number"
                                    min={0}
                                    defaultValue={v.cartoes_vermelhos_adversario}
                                    className="field-input w-14 py-0.5 text-xs"
                                  />
                                </label>
                                <button type="submit" className="btn-secondary px-2 py-0.5 text-xs">
                                  Salvar
                                </button>
                              </form>
                            </div>
                          );
                        })}

                        {resultados.map((r) => {
                          const url = sumulaUrls.get(r.id) ?? null;
                          return (
                            <div
                              key={r.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-linha px-3 py-2 text-sm"
                            >
                              <span className="text-neutral-800">
                                {r.equipe_casa} <span className="font-semibold">{r.gols_casa} x {r.gols_fora}</span>{" "}
                                {r.equipe_fora}
                                <span className="ml-2 text-xs text-neutral-400">
                                  {[r.rodada, r.data_jogo ? formatData(r.data_jogo) : null]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                                {r.cartoes_amarelos_casa + r.cartoes_amarelos_fora + r.cartoes_vermelhos_casa + r.cartoes_vermelhos_fora > 0 ? (
                                  <span className="ml-2 text-xs text-neutral-500">
                                    🟨 {r.cartoes_amarelos_casa}x{r.cartoes_amarelos_fora} · 🟥{" "}
                                    {r.cartoes_vermelhos_casa}x{r.cartoes_vermelhos_fora}
                                  </span>
                                ) : null}
                              </span>
                              <span className="flex items-center gap-3">
                                {url ? (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-medium text-grena hover:underline"
                                  >
                                    📄 Súmula
                                  </a>
                                ) : null}
                                <form action={excluirAction}>
                                  <input type="hidden" name="id" value={r.id} />
                                  <button
                                    type="submit"
                                    className="text-xs text-neutral-300 hover:text-red-600"
                                    title="Excluir resultado"
                                  >
                                    ✕
                                  </button>
                                </form>
                              </span>
                            </div>
                          );
                        })}

                        {jogosDoGrupo.length === 0 && resultados.length === 0 ? (
                          <p className="text-sm text-neutral-400">Nenhum resultado lançado neste grupo ainda.</p>
                        ) : null}
                      </div>

                      {equipesFixas.length > 0 ? (
                        <form
                          action={importarResultadoAction}
                          className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-dourado/30 bg-dourado/5 p-3"
                        >
                          <input type="hidden" name="grupoId" value={grupo.id} />
                          <div className="min-w-[240px] flex-1">
                            <label className="field-label">
                              Link do PDF da súmula (FPF) — importa placar e cartões
                            </label>
                            <input
                              name="sumulaLink"
                              type="url"
                              required
                              placeholder="https://conteudo.fpf.org.br/.../sumula.pdf"
                              className="field-input py-1 text-xs"
                            />
                          </div>
                          <div>
                            <label className="field-label">Mandante</label>
                            <select name="equipeCasa" className="field-input w-36 py-1 text-xs" required>
                              {equipesFixas.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="field-label">Visitante</label>
                            <select
                              name="equipeFora"
                              className="field-input w-36 py-1 text-xs"
                              defaultValue={equipesFixas[1] ?? equipesFixas[0]}
                              required
                            >
                              {equipesFixas.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button type="submit" className="btn-primary px-3 py-1.5 text-sm">
                            Importar da súmula
                          </button>
                          <p className="w-full text-[11px] text-neutral-500">
                            Mesmo leitor da aba Súmula do jogo do Juventus. Se o link falhar ou o nome das
                            equipes não bater, use o lançamento manual abaixo.
                          </p>
                        </form>
                      ) : null}

                      <form
                        action={lancarAction}
                        className="mt-3 flex flex-wrap items-end gap-2 border-t border-linha pt-3"
                      >
                        <input type="hidden" name="grupoId" value={grupo.id} />
                        <div>
                          <label className="field-label">Rodada</label>
                          <input name="rodada" className="field-input w-24 py-1 text-xs" placeholder="1ª" />
                        </div>
                        <div>
                          <label className="field-label">Mandante</label>
                          {equipesFixas.length > 0 ? (
                            <select name="equipeCasa" className="field-input w-36 py-1 text-xs" required>
                              {equipesFixas.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input name="equipeCasa" className="field-input w-36 py-1 text-xs" required />
                          )}
                        </div>
                        <div>
                          <label className="field-label">Placar</label>
                          <div className="flex items-center gap-1">
                            <input
                              name="golsCasa"
                              type="number"
                              min={0}
                              className="field-input w-14 py-1 text-xs"
                              required
                            />
                            <span className="text-xs text-neutral-400">x</span>
                            <input
                              name="golsFora"
                              type="number"
                              min={0}
                              className="field-input w-14 py-1 text-xs"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="field-label">Visitante</label>
                          {equipesFixas.length > 0 ? (
                            <select
                              name="equipeFora"
                              className="field-input w-36 py-1 text-xs"
                              defaultValue={equipesFixas[1] ?? equipesFixas[0]}
                              required
                            >
                              {equipesFixas.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input name="equipeFora" className="field-input w-36 py-1 text-xs" required />
                          )}
                        </div>
                        <div>
                          <label className="field-label">Data</label>
                          <input name="dataJogo" type="date" className="field-input w-36 py-1 text-xs" />
                        </div>
                        <div>
                          <label className="field-label" title="Cartões amarelos (mandante x visitante)">
                            🟨 casa x fora
                          </label>
                          <div className="flex items-center gap-1">
                            <input name="amarelosCasa" type="number" min={0} defaultValue={0} className="field-input w-14 py-1 text-xs" />
                            <input name="amarelosFora" type="number" min={0} defaultValue={0} className="field-input w-14 py-1 text-xs" />
                          </div>
                        </div>
                        <div>
                          <label className="field-label" title="Cartões vermelhos (mandante x visitante)">
                            🟥 casa x fora
                          </label>
                          <div className="flex items-center gap-1">
                            <input name="vermelhosCasa" type="number" min={0} defaultValue={0} className="field-input w-14 py-1 text-xs" />
                            <input name="vermelhosFora" type="number" min={0} defaultValue={0} className="field-input w-14 py-1 text-xs" />
                          </div>
                        </div>
                        <div className="min-w-[180px]">
                          <label className="field-label">Súmula (PDF, opcional)</label>
                          <input name="sumula" type="file" className="field-input py-1 text-xs" />
                        </div>
                        <button type="submit" className="btn-primary px-3 py-1.5 text-sm">
                          Lançar resultado
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
