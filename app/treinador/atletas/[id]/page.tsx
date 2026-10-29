import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { DonutChart } from "@/components/donut-chart";
import { StatCard } from "@/components/stat-card";
import { juventusTheme } from "@/lib/theme";
import { buscarEstatisticasAtleta } from "@/lib/futebol/estatisticas-atleta-query";
import { montarHistoricoAtletaBase } from "@/lib/futebol/anotacoes-atleta";
import type { AtletaAnotacaoRow, AtletaRow } from "@/lib/supabase/types";
import { AnotacaoFormTreinador } from "./anotacao-form-treinador";

const TABELAS = {
  jogos: "jogos_base",
  convocacoes: "convocacoes_base",
  convocacaoAtletas: "convocacao_atletas_base",
  sumulas: "sumulas_base",
  sumulaEventos: "sumula_eventos_base",
  // Campos novos de `TabelasEstatisticasAtleta` (ver estatisticas-atleta-query.ts) — esta tela não
  // usa o filtro por Competição (mantém "sem filtro de período... só o histórico completo" de
  // propósito, pra manter simples pro Treinador), mas precisa informar as tabelas pro tipo bater.
  competicaoJogos: "competicao_jogos_base",
  competicoes: "competicoes_base",
  temporadas: "temporadas_base",
};

function formatDataHora(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
}

/**
 * Ficha do atleta pro Treinador — Dados de Jogo (sem filtro de período; só o histórico completo,
 * pra manter simples, ver a spec) + Anotações (histórico com autor e data automáticos, mistura a
 * entrada virtual de Relatório de Dispensa quando houver) + atalho pro Relatório de Dispensa. Ver
 * docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-anotacoes-design.md.
 *
 * Mesma dupla checagem de categoria de `dispensa/page.tsx`. Não usa `AtletaPerfilHeader` (exige
 * `editarHref`, e o Treinador não tem acesso à edição completa do cadastro) — cabeçalho próprio,
 * seguindo a mesma moldura (barra grena + "← Voltar") de `dispensa/page.tsx`.
 */
export default async function AtletaTreinadorPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const categorias = await getCategoriasTreinador(supabase);
  if (categorias.length === 0) redirect("/treinador");

  const { data } = await supabase.from("atletas").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const atleta = data as AtletaRow;
  if (!atleta.categoria || !categorias.includes(atleta.categoria)) redirect("/treinador");

  const [{ data: anotacoesData }, fotoUrl, { stats, duracaoReferencia }] = await Promise.all([
    supabase
      .from("atleta_anotacoes")
      .select("*")
      .eq("atleta_id", atleta.id)
      .order("created_at", { ascending: false }),
    getSignedPhotoUrl(supabase, atleta.foto_path),
    buscarEstatisticasAtleta(supabase, atleta.id, TABELAS, {}),
  ]);
  const anotacoes = (anotacoesData ?? []) as AtletaAnotacaoRow[];

  let dispensadoPorNome: string | null = null;
  if (atleta.dispensado_por) {
    const { data: perfilDispensa } = await supabase
      .from("perfis")
      .select("nome, email")
      .eq("id", atleta.dispensado_por)
      .maybeSingle();
    const perfil = perfilDispensa as { nome: string | null; email: string } | null;
    dispensadoPorNome = perfil?.nome?.trim() ? perfil.nome : (perfil?.email ?? null);
  }

  const historico = montarHistoricoAtletaBase(
    anotacoes,
    atleta,
    dispensadoPorNome,
    `/treinador/atletas/${atleta.id}/dispensa/pdf`,
  );

  const subtitulo = `${categoriaBaseLabel(atleta.categoria)} · ${atleta.posicao}${
    atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""
  }`;

  return (
    <div className="min-h-screen bg-pagina">
      <div className="bg-grena">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link
            href="/treinador/atletas"
            className="inline-flex items-center gap-1 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center gap-4">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoUrl}
              alt={atleta.nome_completo}
              className="h-20 w-20 flex-shrink-0 rounded-full object-cover ring-2 ring-neutral-100"
            />
          ) : (
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl font-bold text-neutral-400">
              {atleta.nome_completo.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-grena-escuro">{atleta.nome_completo}</h1>
            {atleta.apelido ? <p className="text-sm text-neutral-500">&ldquo;{atleta.apelido}&rdquo;</p> : null}
            <p className="mt-1 text-sm text-neutral-500">{subtitulo}</p>
          </div>
        </div>

        <section className="card mt-6 p-4">
          <h2 className="text-lg font-bold text-grena-escuro">Dados de Jogo</h2>
          <div className="mt-3">
            <DonutChart
              slices={[
                { label: "Titular", value: stats.titular, color: juventusTheme.grena },
                { label: "Banco", value: stats.banco, color: juventusTheme.dourado },
                { label: "Não Convocado", value: stats.naoConvocado, color: juventusTheme.prata },
              ]}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Gols" valor={stats.gols} />
            <StatCard label="Assistências" valor={stats.assistencias} />
            <StatCard label="Cartões Amarelos" valor={stats.cartoesAmarelos} destaque="text-amber-600" />
            <StatCard label="Cartões Vermelhos" valor={stats.cartoesVermelhos} destaque="text-red-700" />
            <StatCard label="Minutos totais" valor={stats.minutosTotais} />
            <StatCard label={`Jogos com +${duracaoReferencia.primeiroTempo}min`} valor={stats.jogosMaisUmTempo} />
            <StatCard label={`Jogo completo (${duracaoReferencia.total}min)`} valor={stats.jogosJogoCompleto} />
          </div>
        </section>

        <section className="card mt-4 p-4">
          <h2 className="text-lg font-bold text-grena-escuro">Anotações</h2>
          <div className="mt-3 space-y-2">
            {historico.map((item) => (
              <div
                key={item.id}
                className={`flex flex-wrap items-start gap-3 rounded-md px-3 py-2 text-sm ${
                  item.tipo === "dispensa" ? "border-l-4 border-l-grena bg-neutral-50" : "bg-neutral-50"
                }`}
              >
                <div className="min-w-[200px] flex-1">
                  {item.tipo === "dispensa" ? (
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-grena">
                      Relatório de Dispensa
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap text-neutral-800">{item.texto}</p>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="text-xs text-neutral-500">
                    {item.autor ?? "—"} · {formatDataHora(item.data)}
                  </span>
                  {item.tipo === "dispensa" ? (
                    <a href={item.linkPdf} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                      Ver PDF
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
            {historico.length === 0 ? <p className="text-sm text-neutral-400">Nenhuma anotação ainda.</p> : null}
          </div>

          <div className="mt-3">
            <AnotacaoFormTreinador atletaId={atleta.id} />
          </div>
        </section>

        <section className="card mt-4 p-4 text-center">
          <Link href={`/treinador/atletas/${atleta.id}/dispensa`} className="btn-secondary inline-block">
            {atleta.dispensa_data ? "Ver relatório de dispensa" : "Gerar relatório de dispensa"}
          </Link>
        </section>
      </main>
    </div>
  );
}
