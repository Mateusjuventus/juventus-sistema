import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompeticaoTabs } from "@/components/competicao-tabs";
import { createClient } from "@/lib/supabase/server";
import { carregarCompeticao } from "@/lib/futebol/competicao-query";
import { resolverEquipes } from "@/lib/futebol/competicao-classificacao";

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
  } = carregada;

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
        Os jogos do Juventus entram sozinhos (pelo placar preenchido no cadastro do jogo); os resultados dos
        outros clubes são lançados na aba Súmulas dos Grupos.
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
                        <p className="mt-3 border-t border-linha pt-3 text-xs text-neutral-500">
                          {jogosDoGrupo.length + resultados.length} resultado(s) contabilizado(s) ·{" "}
                          <Link
                            href={`/competicoes/${competicao.id}/resultados`}
                            className="font-medium text-grena hover:underline"
                          >
                            lançar/ver súmulas dos jogos do grupo →
                          </Link>
                        </p>
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
