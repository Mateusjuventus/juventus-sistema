import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AtletaTabs } from "@/components/atleta-tabs";
import { AtletaPerfilHeader } from "@/components/atleta-perfil-header";
import { DonutChart } from "@/components/donut-chart";
import { StatCard } from "@/components/stat-card";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { buscarEstatisticasAtleta } from "@/lib/futebol/estatisticas-atleta-query";
import { juventusTheme } from "@/lib/theme";
import type { AtletaRow } from "@/lib/supabase/types";

const TABELAS = {
  jogos: "jogos",
  convocacoes: "convocacoes",
  convocacaoAtletas: "convocacao_atletas",
  sumulas: "sumulas",
  sumulaEventos: "sumula_eventos",
};

/** Aba "Dados de Jogo" do perfil do atleta — participação, gols/assistências/cartões e minutagem,
 * calculados sob demanda a partir da Convocação e da Súmula. Ver
 * docs/superpowers/specs/2026-08-04-estatisticas-atleta-design.md. */
export default async function DadosDeJogoAtletaPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { de?: string; ate?: string; competicao?: string };
}) {
  const supabase = createClient();
  const { data: atletaData } = await supabase.from("atletas").select("*").eq("id", params.id).single();
  if (!atletaData) notFound();

  const atleta = atletaData as AtletaRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const subtitulo = `${atleta.posicao}${atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}`;

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
    <AppShell>
      <AtletaTabs atletaId={atleta.id} active="dados-de-jogo" />

      <AtletaPerfilHeader
        nome={atleta.nome_completo}
        apelido={atleta.apelido}
        subtitulo={subtitulo}
        fotoUrl={fotoUrl}
        editarHref={`/atletas/${atleta.id}`}
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
          action={`/atletas/${atleta.id}/relatorio/pdf`}
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
