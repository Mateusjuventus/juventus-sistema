import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompeticaoTabs } from "@/components/competicao-tabs";
import { createClient } from "@/lib/supabase/server";
import { carregarCompeticao, confrontoComData } from "@/lib/futebol/competicao-query";
import { resolverEquipes } from "@/lib/futebol/competicao-classificacao";
import { excluirResultadoExterno, lancarResultadoExterno } from "../../actions";

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Classificação por grupo + possíveis confrontos das próximas fases (pedido do Mateus durante a
 * revisão do mockup). Os pontos do Juventus entram sozinhos, dos jogos vinculados ao grupo com
 * placar preenchido; os confrontos entre os outros clubes são lançados aqui (registro leve, não é
 * um "jogo" do sistema). Vagas projetadas ("1º do Grupo 3") mostram quem ocuparia a vaga hoje.
 */
export default async function CompeticaoClassificacaoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const carregada = await carregarCompeticao(supabase, params.id);
  if (!carregada) notFound();

  const {
    competicao,
    fases,
    gruposPorFase,
    equipesPorGrupo,
    resultadosPorGrupo,
    classificacoesPorGrupo,
    nomesGrupos,
    vinculos,
    jogosById,
  } = carregada;

  const lancarAction = lancarResultadoExterno.bind(null, competicao.id);
  const excluirAction = excluirResultadoExterno.bind(null, competicao.id);

  return (
    <AppShell>
      <CompeticaoTabs competicao={competicao} active="classificacao" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-grena-escuro">Classificação</h2>
        <a href={`/competicoes/${competicao.id}/classificacao/pdf`} target="_blank" className="btn-secondary">
          Gerar PDF
        </a>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Os jogos do Juventus entram sozinhos (pelo placar preenchido no cadastro do jogo). Lance aqui só os
        resultados entre os outros clubes do grupo.
      </p>

      {fases.length === 0 ? (
        <div className="card mt-4 p-8 text-center text-neutral-400">
          Crie as fases e grupos da competição primeiro, na aba Fases e Grupos.
        </div>
      ) : null}

      <div className="mt-4 space-y-6">
        {fases.map((fase) => {
          const grupos = gruposPorFase.get(fase.id) ?? [];
          if (grupos.length === 0) return null;
          return (
            <section key={fase.id}>
              <h3 className="text-base font-bold text-grena-escuro">{fase.nome}</h3>
              <div className="mt-2 grid gap-4 lg:grid-cols-2">
                {grupos.map((grupo) => {
                  const classificacao = classificacoesPorGrupo.get(grupo.id) ?? [];
                  const resultados = resultadosPorGrupo.get(grupo.id) ?? [];
                  const jogosDoGrupo = vinculos.filter((v) => v.grupo_id === grupo.id);
                  const equipes = equipesPorGrupo.get(grupo.id) ?? [];
                  const temVagaProjetada = equipes.some((e) => e.nome === null);
                  const resolvidas = resolverEquipes(
                    equipes.map((e) => ({
                      nome: e.nome,
                      origemGrupoId: e.origem_grupo_id,
                      origemPosicao: e.origem_posicao,
                    })),
                    nomesGrupos,
                    classificacoesPorGrupo,
                  );

                  return (
                    <div key={grupo.id} className="card p-4">
                      <h4 className="text-sm font-bold uppercase tracking-wide text-neutral-600">{grupo.nome}</h4>

                      {temVagaProjetada ? (
                        // Grupo de fase futura: mostra as vagas e os POSSÍVEIS CONFRONTOS de hoje.
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                            Possível confronto pela classificação atual
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {resolvidas.map((r, i) => (
                              <li key={i} className="text-sm text-neutral-700">
                                <span className="font-medium">{r.rotulo}</span>
                                {r.projecao ? (
                                  <span
                                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      r.projecao.trim().toLocaleLowerCase("pt-BR") === "juventus"
                                        ? "bg-grena/10 text-grena"
                                        : "bg-dourado/10 text-dourado"
                                    }`}
                                  >
                                    hoje: {r.projecao}
                                  </span>
                                ) : (
                                  <span className="ml-2 text-xs text-neutral-400">a definir</span>
                                )}
                              </li>
                            ))}
                          </ul>
                          {resolvidas.length === 2 && resolvidas[0].projecao && resolvidas[1].projecao ? (
                            <p className="mt-3 rounded-md bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-700">
                              {resolvidas[0].projecao} x {resolvidas[1].projecao}
                            </p>
                          ) : null}
                        </div>
                      ) : classificacao.length === 0 ? (
                        <p className="mt-3 text-sm text-neutral-400">
                          Cadastre as equipes do grupo na aba Fases e Grupos pra montar a tabela.
                        </p>
                      ) : (
                        <table className="mt-3 w-full text-sm">
                          <thead>
                            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                              <th className="py-1 pr-2">#</th>
                              <th className="py-1 pr-2">Equipe</th>
                              <th className="px-1 py-1 text-center">P</th>
                              <th className="px-1 py-1 text-center">J</th>
                              <th className="px-1 py-1 text-center">V</th>
                              <th className="px-1 py-1 text-center">E</th>
                              <th className="px-1 py-1 text-center">D</th>
                              <th className="px-1 py-1 text-center">GP</th>
                              <th className="px-1 py-1 text-center">GC</th>
                              <th className="px-1 py-1 text-center">SG</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {classificacao.map((linha, i) => {
                              const ehJuventus = linha.equipe.trim().toLocaleLowerCase("pt-BR") === "juventus";
                              return (
                                <tr key={linha.equipe} className={ehJuventus ? "bg-dourado/5" : undefined}>
                                  <td className="py-1.5 pr-2 text-neutral-400">{i + 1}º</td>
                                  <td className={`py-1.5 pr-2 ${ehJuventus ? "font-bold text-grena" : "text-neutral-800"}`}>
                                    {linha.equipe}
                                  </td>
                                  <td className="px-1 py-1.5 text-center font-semibold">{linha.pontos}</td>
                                  <td className="px-1 py-1.5 text-center text-neutral-500">{linha.jogos}</td>
                                  <td className="px-1 py-1.5 text-center text-neutral-500">{linha.vitorias}</td>
                                  <td className="px-1 py-1.5 text-center text-neutral-500">{linha.empates}</td>
                                  <td className="px-1 py-1.5 text-center text-neutral-500">{linha.derrotas}</td>
                                  <td className="px-1 py-1.5 text-center text-neutral-500">{linha.golsPro}</td>
                                  <td className="px-1 py-1.5 text-center text-neutral-500">{linha.golsContra}</td>
                                  <td className="px-1 py-1.5 text-center text-neutral-500">{linha.saldo}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}

                      {!temVagaProjetada ? (
                        <details className="mt-3 border-t border-linha pt-3">
                          <summary className="cursor-pointer text-xs font-medium text-neutral-500 hover:text-grena">
                            Resultados do grupo ({jogosDoGrupo.length + resultados.length})
                          </summary>
                          <ul className="mt-2 space-y-1 text-sm text-neutral-700">
                            {jogosDoGrupo.map((v) => {
                              const jogo = jogosById.get(v.jogo_id);
                              if (!jogo) return null;
                              const comPlacar = jogo.gols_pro !== null && jogo.gols_contra !== null;
                              return (
                                <li key={v.id} className="flex items-center justify-between gap-2">
                                  <span>{confrontoComData(jogo)}</span>
                                  <span className={comPlacar ? "font-medium" : "text-neutral-400"}>
                                    {comPlacar
                                      ? jogo.mandante
                                        ? `${jogo.gols_pro} x ${jogo.gols_contra}`
                                        : `${jogo.gols_contra} x ${jogo.gols_pro}`
                                      : "sem placar"}
                                  </span>
                                </li>
                              );
                            })}
                            {resultados.map((r) => (
                              <li key={r.id} className="flex items-center justify-between gap-2">
                                <span>
                                  {r.equipe_casa} x {r.equipe_fora}
                                  {r.data_jogo ? (
                                    <span className="ml-1 text-xs text-neutral-400">({formatData(r.data_jogo)})</span>
                                  ) : null}
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {r.gols_casa} x {r.gols_fora}
                                  </span>
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
                              </li>
                            ))}
                          </ul>

                          <form action={lancarAction} className="mt-3 flex flex-wrap items-center gap-1.5">
                            <input type="hidden" name="grupoId" value={grupo.id} />
                            <input
                              name="equipeCasa"
                              className="field-input w-32 py-1 text-xs"
                              placeholder="Mandante"
                              required
                            />
                            <input
                              name="golsCasa"
                              type="number"
                              min={0}
                              className="field-input w-14 py-1 text-xs"
                              placeholder="0"
                              required
                            />
                            <span className="text-xs text-neutral-400">x</span>
                            <input
                              name="golsFora"
                              type="number"
                              min={0}
                              className="field-input w-14 py-1 text-xs"
                              placeholder="0"
                              required
                            />
                            <input
                              name="equipeFora"
                              className="field-input w-32 py-1 text-xs"
                              placeholder="Visitante"
                              required
                            />
                            <input name="dataJogo" type="date" className="field-input w-36 py-1 text-xs" />
                            <button type="submit" className="btn-secondary px-2 py-1 text-xs">
                              Lançar
                            </button>
                          </form>
                          <p className="mt-1 text-[11px] text-neutral-400">
                            Só confrontos entre os outros clubes — os do Juventus vêm do cadastro do jogo.
                          </p>
                        </details>
                      ) : null}
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
