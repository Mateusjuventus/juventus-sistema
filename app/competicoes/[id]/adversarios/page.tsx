import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompeticaoTabs } from "@/components/competicao-tabs";
import { createClient } from "@/lib/supabase/server";
import { carregarCompeticao } from "@/lib/futebol/competicao-query";
import { jogosAJogar, JUVENTUS_NOME } from "@/lib/futebol/competicao-classificacao";
import { hojeBrasilia } from "@/lib/data-brasil";

function ehJuventus(nome: string): boolean {
  return nome.trim().toLocaleLowerCase("pt-BR") === JUVENTUS_NOME.toLocaleLowerCase("pt-BR");
}

/**
 * Análise de adversários (pedido do Mateus): "como já puxa os dados dos cartões, quero que gere
 * alerta pra mim — seriam como se fosse dados para avaliarmos nossos adversários". Tudo o que
 * aparece aqui é DERIVADO do que já existe: classificação do grupo (pontos, saldo, jogos a jogar)
 * e disciplina por equipe (CA/CV) das súmulas lançadas.
 *
 * A contagem é sempre no escopo do GRUPO, e cada grupo pertence a uma fase — então o zeramento
 * entre fases do Art. 60 vale aqui naturalmente: os números de uma fase nova começam do zero.
 */
export default async function CompeticaoAdversariosPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const carregada = await carregarCompeticao(supabase, params.id);
  if (!carregada) notFound();

  const {
    competicao,
    fases,
    gruposPorFase,
    classificacoesPorGrupo,
    nomesGrupos,
    vinculos,
    jogosById,
    jogosOrdenados,
  } = carregada;
  const hojeStr = hojeBrasilia();

  // Próximo jogo vinculado → destaque do adversário da vez.
  const proximoJogo = jogosOrdenados.find((j) => j.data >= hojeStr) ?? null;
  const vinculoProximo = proximoJogo ? vinculos.find((v) => v.jogo_id === proximoJogo.jogoId) ?? null : null;
  const jogoProximo = proximoJogo ? jogosById.get(proximoJogo.jogoId) ?? null : null;

  // Grupos onde o Juventus está (é onde ficam os adversários diretos).
  const gruposDoJuventus = new Set(
    vinculos.map((v) => v.grupo_id).filter((id): id is string => id !== null),
  );

  return (
    <AppShell>
      <CompeticaoTabs competicao={competicao} active="adversarios" />

      <h2 className="text-lg font-bold text-grena-escuro">Análise de adversários</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Números derivados das súmulas e dos resultados lançados — cartões, aproveitamento e jogos a jogar de
        cada rival, no escopo do grupo (cada fase começa do zero, conforme o regulamento).
      </p>

      {jogoProximo && vinculoProximo?.grupo_id ? (
        (() => {
          const classificacao = classificacoesPorGrupo.get(vinculoProximo.grupo_id) ?? [];
          const posicao = classificacao.findIndex((l) => l.equipe.trim().toLocaleLowerCase("pt-BR") === jogoProximo.adversario_nome.trim().toLocaleLowerCase("pt-BR"));
          const linha = posicao !== -1 ? classificacao[posicao] : null;
          const nossa = classificacao.find((l) => ehJuventus(l.equipe)) ?? null;
          const nossaPos = classificacao.findIndex((l) => ehJuventus(l.equipe));
          return (
            <section className="card mt-4 border-l-4 border-l-dourado p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-dourado">Próximo adversário</p>
              <h3 className="mt-1 text-xl font-bold text-grena-escuro">{jogoProximo.adversario_nome}</h3>
              <p className="text-sm text-neutral-500">
                {proximoJogo?.confronto} · {nomesGrupos.get(vinculoProximo.grupo_id) ?? "grupo"}
              </p>

              {linha ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md border border-linha p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Posição</p>
                    <p className="mt-0.5 text-2xl font-bold text-grena-escuro">{posicao + 1}º</p>
                    <p className="text-xs text-neutral-500">
                      {linha.pontos} pts em {linha.jogos} jogos
                      {nossa && nossaPos !== -1 ? ` · Juventus: ${nossaPos + 1}º (${nossa.pontos} pts)` : ""}
                    </p>
                  </div>
                  <div className="rounded-md border border-linha p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Disciplina</p>
                    <p className="mt-0.5 text-2xl font-bold text-amber-600">
                      {linha.cartoesAmarelos} <span className="text-sm font-medium text-neutral-400">CA</span>
                      <span className="ml-2 text-red-700">{linha.cartoesVermelhos}</span>{" "}
                      <span className="text-sm font-medium text-neutral-400">CV</span>
                    </p>
                    <p className="text-xs text-neutral-500">
                      {linha.jogos > 0 ? `${(linha.cartoesAmarelos / linha.jogos).toFixed(1)} amarelos/jogo` : "sem jogos"}
                    </p>
                  </div>
                  <div className="rounded-md border border-linha p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Gols</p>
                    <p className="mt-0.5 text-2xl font-bold text-grena-escuro">
                      {linha.golsPro}
                      <span className="text-sm font-medium text-neutral-400"> x </span>
                      {linha.golsContra}
                    </p>
                    <p className="text-xs text-neutral-500">saldo {linha.saldo}</p>
                  </div>
                  <div className="rounded-md border border-linha p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Campanha</p>
                    <p className="mt-0.5 text-2xl font-bold text-grena-escuro">
                      {linha.vitorias}V {linha.empates}E {linha.derrotas}D
                    </p>
                    <p className="text-xs text-neutral-500">
                      {jogosAJogar(classificacao.length, linha.jogos)} jogo(s) a jogar no grupo
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-neutral-400">
                  {jogoProximo.adversario_nome} ainda não está cadastrado como equipe deste grupo — adicione na aba
                  Fases e Grupos pra ver os números dele aqui.
                </p>
              )}
            </section>
          );
        })()
      ) : null}

      <div className="mt-6 space-y-6">
        {fases.map((fase) => {
          const grupos = (gruposPorFase.get(fase.id) ?? []).filter((g) => {
            const c = classificacoesPorGrupo.get(g.id) ?? [];
            return c.length > 0;
          });
          if (grupos.length === 0) return null;
          return (
            <section key={fase.id}>
              <h3 className="text-base font-bold text-grena-escuro">
                {fase.nome}
                {fase.zerar_cartoes_ao_encerrar ? (
                  <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                    zera amarelos ao encerrar
                  </span>
                ) : null}
              </h3>
              <div className="mt-2 grid gap-4 lg:grid-cols-2">
                {grupos.map((grupo) => {
                  const classificacao = classificacoesPorGrupo.get(grupo.id) ?? [];
                  const nossoGrupo = gruposDoJuventus.has(grupo.id);
                  return (
                    <div key={grupo.id} className="card p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold uppercase tracking-wide text-neutral-600">{grupo.nome}</h4>
                        {nossoGrupo ? (
                          <span className="rounded-full bg-grena/10 px-2 py-0.5 text-[11px] font-semibold text-grena">
                            grupo do Juventus
                          </span>
                        ) : null}
                      </div>
                      <table className="mt-3 w-full text-sm">
                        <thead>
                          <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                            <th className="py-1 pr-2">Equipe</th>
                            <th className="px-1 py-1 text-center">P</th>
                            <th className="px-1 py-1 text-center">J</th>
                            <th className="px-1 py-1 text-center">SG</th>
                            <th className="px-1 py-1 text-center">CA</th>
                            <th className="px-1 py-1 text-center">CV</th>
                            <th className="px-1 py-1 text-center" title="Média de cartões amarelos por jogo">
                              CA/J
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {classificacao.map((linha) => {
                            const nosso = ehJuventus(linha.equipe);
                            const media = linha.jogos > 0 ? linha.cartoesAmarelos / linha.jogos : 0;
                            return (
                              <tr key={linha.equipe} className={nosso ? "bg-dourado/5" : undefined}>
                                <td className={`py-1.5 pr-2 ${nosso ? "font-bold text-grena" : "text-neutral-800"}`}>
                                  {linha.equipe}
                                </td>
                                <td className="px-1 py-1.5 text-center font-semibold">{linha.pontos}</td>
                                <td className="px-1 py-1.5 text-center text-neutral-500">{linha.jogos}</td>
                                <td className="px-1 py-1.5 text-center text-neutral-500">{linha.saldo}</td>
                                <td className="px-1 py-1.5 text-center text-amber-600">{linha.cartoesAmarelos}</td>
                                <td className="px-1 py-1.5 text-center text-red-700">{linha.cartoesVermelhos}</td>
                                <td
                                  className={`px-1 py-1.5 text-center ${media >= 2.5 ? "font-semibold text-red-700" : "text-neutral-500"}`}
                                  title={media >= 2.5 ? "Time faltoso — média alta de amarelos" : undefined}
                                >
                                  {media.toFixed(1)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        Os cartões dos nossos atletas vêm da súmula do jogo; os dos adversários são lançados na aba{" "}
        <Link href={`/competicoes/${competicao.id}/resultados`} className="font-medium text-grena hover:underline">
          Súmulas dos Grupos
        </Link>
        .
      </p>
    </AppShell>
  );
}
