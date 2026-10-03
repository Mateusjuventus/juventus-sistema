import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CompeticaoTabsBase } from "@/components/competicao-tabs-base";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { verificarAcessoCompeticaoBase } from "@/lib/auth/competicao-base-guard";
import { resolverEquipes } from "@/lib/futebol/competicao-classificacao";
import type { CompeticaoFaseStatus } from "@/lib/supabase/types";
import { normalizarCriterios } from "@/lib/futebol/competicao-desempate";
import { CriteriosDesempateField } from "@/app/competicoes/criterios-desempate-field";
import {
  adicionarEquipeBase,
  atualizarCriteriosFaseBase,
  atualizarStatusFaseBase,
  criarFaseBase,
  criarGrupoBase,
  excluirEquipeBase,
  excluirFaseBase,
  excluirGrupoBase,
} from "../../actions";

const FASE_STATUS_LABEL: Record<CompeticaoFaseStatus, string> = {
  aguardando: "Aguardando",
  em_andamento: "Em andamento",
  encerrada: "Encerrada",
};

/**
 * Estrutura da competição da Base: FASES → GRUPOS → equipes — espelha
 * `app/competicoes/[id]/fases/page.tsx`.
 */
export default async function CompeticaoBaseFasesPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const carregada = await verificarAcessoCompeticaoBase(supabase, params.id);
  if (!carregada) notFound();

  const { competicao, fases, gruposPorFase, equipesPorGrupo, classificacoesPorGrupo, nomesGrupos, vinculos } =
    carregada;

  const criarFaseAction = criarFaseBase.bind(null, competicao.id);
  const criarGrupoAction = criarGrupoBase.bind(null, competicao.id);
  const adicionarEquipeAction = adicionarEquipeBase.bind(null, competicao.id);
  const excluirFaseAction = excluirFaseBase.bind(null, competicao.id);
  const excluirGrupoAction = excluirGrupoBase.bind(null, competicao.id);
  const excluirEquipeAction = excluirEquipeBase.bind(null, competicao.id);
  const statusFaseAction = atualizarStatusFaseBase.bind(null, competicao.id);
  const criteriosFaseAction = atualizarCriteriosFaseBase.bind(null, competicao.id);
  const criteriosDaCompeticao = normalizarCriterios(competicao.criterios_desempate);

  // Grupos de fases ANTERIORES podem ser origem de vaga projetada nas fases seguintes.
  const todosGrupos = fases.flatMap((f) => (gruposPorFase.get(f.id) ?? []).map((g) => ({ fase: f, grupo: g })));

  return (
    <AppShell>
      <CompeticaoTabsBase competicao={competicao} active="fases" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-bold text-grena-escuro">Estrutura da competição</h2>
        <div className="flex items-end gap-2">
          <a href={`/base/competicoes/${competicao.id}/pdf`} target="_blank" className="btn-secondary">
            Gerar PDF
          </a>
          <form action={criarFaseAction} className="flex items-end gap-2">
            <input name="nome" className="field-input w-44" placeholder="Nome da nova fase" required />
            <button type="submit" className="btn-primary">
              + Fase
            </button>
          </form>
        </div>
      </div>

      {fases.length === 0 ? (
        <div className="card mt-4 p-8 text-center text-neutral-400">
          Nenhuma fase ainda. Crie a primeira (ex.: Primeira Fase) e depois os grupos dela.
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        {fases.map((fase) => {
          const grupos = gruposPorFase.get(fase.id) ?? [];
          return (
            <section key={fase.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-grena-escuro">{fase.nome}</h3>
                  <form action={statusFaseAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="faseId" value={fase.id} />
                    <select
                      name="status"
                      defaultValue={fase.status}
                      className="field-input w-auto py-1 text-xs"
                    >
                      {(Object.keys(FASE_STATUS_LABEL) as CompeticaoFaseStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {FASE_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <label
                      className="flex cursor-pointer items-center gap-1 text-xs text-neutral-600"
                      title="Encerrada esta fase, os amarelos acumulados zeram — a suspensão de um 3º amarelo recebido na fase continua valendo."
                    >
                      <input type="checkbox" name="zeraCartoes" defaultChecked={fase.zerar_cartoes_ao_encerrar} />
                      Zera amarelos ao encerrar
                    </label>
                    <button type="submit" className="btn-secondary px-2 py-1 text-xs">
                      OK
                    </button>
                  </form>
                </div>
                <div className="flex items-center gap-2">
                  <form action={criarGrupoAction} className="flex items-center gap-2">
                    <input type="hidden" name="faseId" value={fase.id} />
                    <input name="nome" className="field-input w-36 py-1" placeholder="Ex.: Grupo 3" required />
                    <button type="submit" className="btn-secondary px-3 py-1 text-sm">
                      + Grupo
                    </button>
                  </form>
                  <DeleteButton action={excluirFaseAction} id={fase.id} entityLabel="fase (com os grupos dela)" />
                </div>
              </div>

              <details className="mt-3 rounded-md border border-linha bg-neutral-50 p-3">
                <summary className="cursor-pointer text-xs font-medium text-neutral-600 hover:text-grena">
                  Critérios de desempate desta fase{" "}
                  <span className="font-normal text-neutral-400">
                    ({fase.criterios_desempate ? "próprios da fase" : "herdados da competição"})
                  </span>
                </summary>
                <form action={criteriosFaseAction} className="mt-3">
                  <input type="hidden" name="faseId" value={fase.id} />
                  <p className="mb-2 text-[11px] text-neutral-400">
                    Deixe vazio pra herdar os da competição.
                  </p>
                  <CriteriosDesempateField
                    valorInicial={fase.criterios_desempate}
                    herdado={criteriosDaCompeticao}
                    compacto
                  />
                  <button type="submit" className="btn-secondary mt-2 px-2 py-1 text-xs">
                    Salvar critérios da fase
                  </button>
                </form>
              </details>

              {grupos.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-400">Nenhum grupo nesta fase ainda.</p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {grupos.map((grupo) => {
                    const equipes = equipesPorGrupo.get(grupo.id) ?? [];
                    const resolvidas = resolverEquipes(
                      equipes.map((e) => ({
                        nome: e.nome,
                        origemGrupoId: e.origem_grupo_id,
                        origemPosicao: e.origem_posicao,
                      })),
                      nomesGrupos,
                      classificacoesPorGrupo,
                    );
                    const jogosNoGrupo = vinculos.filter((v) => v.grupo_id === grupo.id).length;
                    const origensPossiveis = todosGrupos.filter((t) => t.grupo.id !== grupo.id);
                    return (
                      <div key={grupo.id} className="rounded-lg border border-linha">
                        <div className="flex items-center justify-between gap-2 border-b border-linha bg-neutral-50 px-3 py-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-neutral-600">
                            {grupo.nome}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {jogosNoGrupo === 1 ? "1 jogo" : `${jogosNoGrupo} jogos`}
                          </span>
                        </div>
                        <ul className="divide-y divide-neutral-100 px-3 py-1">
                          {equipes.map((equipe, i) => {
                            const resolvida = resolvidas[i];
                            const ehJuventus = resolvida.rotulo.trim().toLocaleLowerCase("pt-BR") === "juventus";
                            return (
                              <li key={equipe.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                                <span className={ehJuventus ? "font-bold text-grena" : "text-neutral-700"}>
                                  {resolvida.rotulo}
                                  {resolvida.projecao ? (
                                    <span className="ml-1 text-xs font-normal text-dourado">
                                      (hoje: {resolvida.projecao})
                                    </span>
                                  ) : null}
                                </span>
                                <form action={excluirEquipeAction}>
                                  <input type="hidden" name="id" value={equipe.id} />
                                  <button
                                    type="submit"
                                    className="text-xs text-neutral-300 hover:text-red-600"
                                    title="Remover equipe"
                                  >
                                    ✕
                                  </button>
                                </form>
                              </li>
                            );
                          })}
                          {equipes.length === 0 ? (
                            <li className="py-1.5 text-xs text-neutral-400">Nenhuma equipe ainda.</li>
                          ) : null}
                        </ul>
                        <div className="space-y-2 border-t border-linha p-3">
                          <form action={adicionarEquipeAction} className="flex items-center gap-1.5">
                            <input type="hidden" name="grupoId" value={grupo.id} />
                            <input name="nome" className="field-input flex-1 py-1 text-xs" placeholder="Nome da equipe" />
                            <button type="submit" className="btn-secondary px-2 py-1 text-xs">
                              +
                            </button>
                          </form>
                          {origensPossiveis.length > 0 ? (
                            <form action={adicionarEquipeAction} className="flex items-center gap-1.5">
                              <input type="hidden" name="grupoId" value={grupo.id} />
                              <select name="origemPosicao" className="field-input w-16 py-1 text-xs" defaultValue="1">
                                {[1, 2, 3, 4].map((p) => (
                                  <option key={p} value={p}>
                                    {p}º
                                  </option>
                                ))}
                              </select>
                              <select name="origemGrupoId" className="field-input flex-1 py-1 text-xs">
                                {origensPossiveis.map((t) => (
                                  <option key={t.grupo.id} value={t.grupo.id}>
                                    do {t.grupo.nome} ({t.fase.nome})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="submit"
                                className="btn-secondary px-2 py-1 text-xs"
                                title="Adicionar vaga projetada (ex.: 1º do Grupo 3)"
                              >
                                + vaga
                              </button>
                            </form>
                          ) : null}
                          <div className="flex justify-end">
                            <form action={excluirGrupoAction}>
                              <input type="hidden" name="id" value={grupo.id} />
                              <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
                                Excluir grupo
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
