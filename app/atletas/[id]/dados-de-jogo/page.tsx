import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AtletaTabs } from "@/components/atleta-tabs";
import { AtletaPerfilHeader } from "@/components/atleta-perfil-header";
import { DonutChart } from "@/components/donut-chart";
import { StatCard } from "@/components/stat-card";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import {
  ROTULO_SEM_COMPETICAO,
  buscarCompeticoesDisponiveisAtleta,
  buscarEstatisticasAtleta,
  type CompeticaoDisponivelAtleta,
} from "@/lib/futebol/estatisticas-atleta-query";
import { confrontoComPlacar, dataHorarioJogo, resumoDetalheJogo } from "@/lib/futebol/ficha-atleta";
import { juventusTheme } from "@/lib/theme";
import type { AtletaRow } from "@/lib/supabase/types";

const TABELAS = {
  jogos: "jogos",
  convocacoes: "convocacoes",
  convocacaoAtletas: "convocacao_atletas",
  sumulas: "sumulas",
  sumulaEventos: "sumula_eventos",
  competicaoJogos: "competicao_jogos",
  competicoes: "competicoes",
  temporadas: "temporadas",
};

/** Agrupa a lista de Competições disponíveis por Temporada pra exibir no checklist — o array já vem
 * ordenado com a mesma Temporada consecutiva (ver `buscarCompeticoesDisponiveisAtleta`). */
function agruparPorTemporada(
  competicoes: CompeticaoDisponivelAtleta[],
): { temporadaId: string; temporadaNome: string; itens: CompeticaoDisponivelAtleta[] }[] {
  const grupos: { temporadaId: string; temporadaNome: string; itens: CompeticaoDisponivelAtleta[] }[] = [];
  for (const c of competicoes) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.temporadaId === c.temporadaId) ultimo.itens.push(c);
    else grupos.push({ temporadaId: c.temporadaId, temporadaNome: c.temporadaNome, itens: [c] });
  }
  return grupos;
}

/** Aba "Dados de Jogo" do perfil do atleta — participação, gols/assistências/cartões e minutagem,
 * calculados sob demanda a partir da Convocação e da Súmula. Ver
 * docs/superpowers/specs/2026-08-04-estatisticas-atleta-design.md. */
export default async function DadosDeJogoAtletaPage({
  params,
  searchParams,
}: {
  params: { id: string };
  /** `filtrado=1` marca que o form do checklist foi submetido (mesmo que nada tenha sido
   * desmarcado) — sem ele, a página mostra o histórico completo (comportamento de sempre, sem
   * filtro nenhum). `competicaoId` pode repetir (um por Competição marcada); `semCompeticao=sim`
   * inclui os jogos sem Competição vinculada. Substituiu `de`/`ate`/`competicao` em 2026-10-27. */
  searchParams: { filtrado?: string; competicaoId?: string | string[]; semCompeticao?: string };
}) {
  const supabase = createClient();
  const [{ data: atletaData }, competicoesDisponiveisAtleta] = await Promise.all([
    supabase.from("atletas").select("*").eq("id", params.id).single(),
    buscarCompeticoesDisponiveisAtleta(supabase, TABELAS),
  ]);
  if (!atletaData) notFound();

  const atleta = atletaData as AtletaRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const subtitulo = `${atleta.posicao}${atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}`;

  const filtroAplicado = searchParams.filtrado === "1";
  const competicaoIdsSelecionados = filtroAplicado
    ? Array.isArray(searchParams.competicaoId)
      ? searchParams.competicaoId
      : searchParams.competicaoId
        ? [searchParams.competicaoId]
        : []
    : competicoesDisponiveisAtleta.competicoes.map((c) => c.competicaoId);
  const incluirSemCompeticaoSelecionado = filtroAplicado
    ? searchParams.semCompeticao === "sim"
    : competicoesDisponiveisAtleta.temJogosSemCompeticao;

  const { stats, duracaoReferencia, detalhePorCompeticao } = await buscarEstatisticasAtleta(
    supabase,
    atleta.id,
    TABELAS,
    filtroAplicado
      ? { competicaoIds: competicaoIdsSelecionados, incluirSemCompeticao: incluirSemCompeticaoSelecionado }
      : {},
  );

  return (
    <AppShell breadcrumb="Dados de Jogo">
      <AtletaTabs atletaId={atleta.id} active="dados-de-jogo" />

      <AtletaPerfilHeader
        nome={atleta.nome_completo}
        apelido={atleta.apelido}
        subtitulo={subtitulo}
        fotoUrl={fotoUrl}
        editarHref={`/atletas/${atleta.id}`}
      />

      <section className="card mt-6 p-4">
        <h2 className="text-lg font-bold text-grena-escuro">Filtro por Competição</h2>
        {competicoesDisponiveisAtleta.competicoes.length === 0 && !competicoesDisponiveisAtleta.temJogosSemCompeticao ? (
          <p className="mt-2 text-sm text-neutral-400">
            Nenhum jogo com Convocação salva encontrado ainda — o filtro aparece aqui quando houver.
          </p>
        ) : (
          <form method="get" className="mt-3">
            <input type="hidden" name="filtrado" value="1" />
            <div className="flex flex-col gap-3">
              {agruparPorTemporada(competicoesDisponiveisAtleta.competicoes).map((grupo) => (
                <div key={grupo.temporadaId}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {grupo.temporadaNome}
                  </p>
                  <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                    {grupo.itens.map((c) => (
                      <label key={c.competicaoId} className="flex items-center gap-2 text-sm text-neutral-700">
                        <input
                          type="checkbox"
                          name="competicaoId"
                          value={c.competicaoId}
                          defaultChecked={competicaoIdsSelecionados.includes(c.competicaoId)}
                          className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                        />
                        {c.competicaoNome}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {competicoesDisponiveisAtleta.temJogosSemCompeticao ? (
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    name="semCompeticao"
                    value="sim"
                    defaultChecked={incluirSemCompeticaoSelecionado}
                    className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                  />
                  {ROTULO_SEM_COMPETICAO}
                </label>
              ) : null}
            </div>
            <button type="submit" className="btn-secondary mt-3">
              Filtrar
            </button>
          </form>
        )}
      </section>

      <section className="card mt-4 p-4">
        <h2 className="text-lg font-bold text-grena-escuro">Participação</h2>
        <div className="mt-3">
          <DonutChart
            slices={[
              { label: "Titular", value: stats.titular, color: juventusTheme.grena },
              { label: "Banco", value: stats.banco, color: juventusTheme.dourado },
              { label: "Não Convocado", value: stats.naoConvocado, color: juventusTheme.prata },
            ]}
          />
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Gols" valor={stats.gols} />
        <StatCard label="Assistências" valor={stats.assistencias} />
        <StatCard label="Cartões Amarelos" valor={stats.cartoesAmarelos} destaque="text-amber-600" />
        <StatCard label="Cartões Vermelhos" valor={stats.cartoesVermelhos} destaque="text-red-700" />
        <StatCard label="Minutos totais" valor={stats.minutosTotais} />
        <StatCard label={`Jogos com +${duracaoReferencia.primeiroTempo}min`} valor={stats.jogosMaisUmTempo} />
        <StatCard label={`Jogo completo (${duracaoReferencia.total}min)`} valor={stats.jogosJogoCompleto} />
      </section>

      <section className="card mt-4 p-4">
        <h2 className="text-lg font-bold text-grena-escuro">Jogo a jogo</h2>
        {detalhePorCompeticao.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">Nenhum jogo encontrado no filtro selecionado.</p>
        ) : (
          <div className="mt-3 space-y-5">
            {detalhePorCompeticao.map((grupo) => (
              <div key={grupo.titulo}>
                <h3 className="text-sm font-semibold text-grena-escuro">{grupo.titulo}</h3>
                <div className="mt-2 space-y-1.5">
                  {grupo.jogos.map((jogo) => (
                    <div
                      key={jogo.jogoId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-neutral-50 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-neutral-800">
                          {confrontoComPlacar(jogo.adversarioNome, jogo.mandante, jogo.golsPro, jogo.golsContra)}
                        </p>
                        <p className="text-xs text-neutral-500">{dataHorarioJogo(jogo.dataJogo, jogo.horario)}</p>
                      </div>
                      <p className="text-sm text-neutral-600">{resumoDetalheJogo(jogo)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card mt-4 p-4">
        <h2 className="text-lg font-bold text-grena-escuro">Relatório em PDF</h2>
        <p className="mt-1 text-sm text-neutral-500">
          O PDF usa o mesmo filtro de Competição selecionado acima.
        </p>
        <form
          action={`/atletas/${atleta.id}/relatorio/pdf`}
          method="get"
          target="_blank"
          className="mt-3 flex flex-wrap items-center gap-3"
        >
          {filtroAplicado ? (
            <>
              <input type="hidden" name="filtrado" value="1" />
              {competicaoIdsSelecionados.map((id) => (
                <input key={id} type="hidden" name="competicaoId" value={id} />
              ))}
              {incluirSemCompeticaoSelecionado ? <input type="hidden" name="semCompeticao" value="sim" /> : null}
            </>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input type="checkbox" name="incluirDadosPessoais" value="sim" />
            Incluir dados pessoais
          </label>
          <button type="submit" className="btn-primary">
            Gerar PDF
          </button>
        </form>
      </section>
    </AppShell>
  );
}
