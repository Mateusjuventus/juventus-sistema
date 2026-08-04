import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AtletaTabsBase } from "@/components/atleta-tabs-base";
import { AtletaPerfilHeader } from "@/components/atleta-perfil-header";
import { DonutChart } from "@/components/donut-chart";
import { StatCard } from "@/components/stat-card";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { buscarEstatisticasAtleta } from "@/lib/futebol/estatisticas-atleta-query";
import { juventusTheme } from "@/lib/theme";
import { categoriaBaseLabel, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { AtletaBaseRow } from "@/lib/supabase/types";

const TABELAS = {
  jogos: "jogos_base",
  convocacoes: "convocacoes_base",
  convocacaoAtletas: "convocacao_atletas_base",
  sumulas: "sumulas_base",
  sumulaEventos: "sumula_eventos_base",
};

/** Espelha `app/atletas/[id]/dados-de-jogo/page.tsx` para o Futebol de Base — mesma lógica, só
 * trocando as tabelas consultadas (ver `buscarEstatisticasAtleta`). Como o resto de Jogos no Base,
 * os jogos/competições disponíveis no filtro vêm de `jogos_base` (sem filtrar por categoria — a
 * Convocação de cada jogo já é só de uma categoria, então o universo considerado naturalmente já
 * fica restrito aos jogos daquela categoria em que o atleta foi ou não convocado). */
export default async function DadosDeJogoAtletaBasePage({
  params,
  searchParams,
}: {
  params: { categoria: string; id: string };
  searchParams: { de?: string; ate?: string; competicao?: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();

  const supabase = createClient();
  const { data: atletaData } = await supabase.from("atletas_base").select("*").eq("id", params.id).single();
  if (!atletaData) notFound();

  const atleta = atletaData as AtletaBaseRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const subtitulo = `${categoriaBaseLabel(atleta.categoria)} · ${atleta.posicao}${atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}`;

  const filtro = {
    de: searchParams.de || undefined,
    ate: searchParams.ate || undefined,
    competicao: searchParams.competicao || undefined,
  };
  const { stats, competicoesDisponiveis } = await buscarEstatisticasAtleta(
    supabase,
    atleta.id,
    TABELAS,
    filtro,
  );

  return (
    <AppShell departamento="futebol_base">
      <AtletaTabsBase categoria={params.categoria} atletaId={atleta.id} active="dados-de-jogo" />

      <AtletaPerfilHeader
        nome={atleta.nome_completo}
        apelido={atleta.apelido}
        subtitulo={subtitulo}
        fotoUrl={fotoUrl}
        editarHref={`/base/atletas/${params.categoria}/${atleta.id}`}
      />

      <section className="card mt-6 p-4">
        <h2 className="text-lg font-bold text-grena-escuro">Filtro de período</h2>
        <form method="get" className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="field-label">De</label>
            <input type="date" name="de" defaultValue={searchParams.de ?? ""} className="field-input" />
          </div>
          <div>
            <label className="field-label">Até</label>
            <input type="date" name="ate" defaultValue={searchParams.ate ?? ""} className="field-input" />
          </div>
          <div className="min-w-[200px]">
            <label className="field-label">Competição</label>
            <select name="competicao" defaultValue={searchParams.competicao ?? ""} className="field-input">
              <option value="">Todas</option>
              {competicoesDisponiveis.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-secondary">
            Filtrar
          </button>
        </form>
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
        <StatCard label="Jogos com +60min" valor={stats.jogosMais60min} />
        <StatCard label="Jogos com +90min" valor={stats.jogosMais90min} />
      </section>

      <section className="card mt-4 p-4">
        <h2 className="text-lg font-bold text-grena-escuro">Relatório em PDF</h2>
        <p className="mt-1 text-sm text-neutral-500">
          O PDF usa o mesmo período filtrado acima.
        </p>
        <form
          action={`/base/atletas/${params.categoria}/${atleta.id}/relatorio/pdf`}
          method="get"
          target="_blank"
          className="mt-3 flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="de" value={searchParams.de ?? ""} />
          <input type="hidden" name="ate" value={searchParams.ate ?? ""} />
          <input type="hidden" name="competicao" value={searchParams.competicao ?? ""} />
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
