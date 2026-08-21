import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { CATEGORIAS_BASE, categoriaBaseLabel, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { JogoBaseRow } from "@/lib/supabase/types";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatHorario(horario: string | null): string | null {
  if (!horario) return null;
  return horario.slice(0, 5);
}

const DIAS_SEMANA_ABREV = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MESES_ABREV = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

/** Selo de data compacto do cartão de jogo — ver o comentário equivalente no Profissional
 * (`app/jogos/page.tsx`). */
function formatSeloData(dataIso: string): { diaSemana: string; dia: string; mes: string } {
  const data = new Date(`${dataIso}T12:00:00`);
  return {
    diaSemana: DIAS_SEMANA_ABREV[data.getDay()],
    dia: String(data.getDate()).padStart(2, "0"),
    mes: MESES_ABREV[data.getMonth()],
  };
}

/**
 * Lista unificada de Jogos do Futebol de Base — espelha `app/jogos/page.tsx`, mas com um filtro de
 * Categoria (Sub20 a Sub11) além dos filtros de busca/mandante, já que os jogos continuam
 * pertencendo a uma categoria (campo do cadastro), só não há mais uma rota separada por categoria
 * (ver docs/superpowers/specs/2026-07-20-futebol-de-base-design.md).
 */
export default async function JogosBasePage({
  searchParams,
}: {
  searchParams: { q?: string; mandante?: string; categoria?: string; ordem?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const mandanteFiltro = searchParams.mandante ?? "";
  const categoriaFiltro = searchParams.categoria ?? "";
  const ordem = searchParams.ordem === "cronologico" ? "cronologico" : "proximidade";
  const supabase = createClient();

  let query = supabase.from("jogos_base").select("*").order("data_jogo", { ascending: false });
  if (q) query = query.ilike("adversario_nome", `%${q}%`);
  if (mandanteFiltro === "casa") query = query.eq("mandante", true);
  if (mandanteFiltro === "fora") query = query.eq("mandante", false);
  if (ehCategoriaBaseValida(categoriaFiltro)) query = query.eq("categoria", categoriaFiltro);

  const [{ data, error }, { data: todosJogosData }, { data: convocacoesData }] = await Promise.all([
    query,
    supabase.from("jogos_base").select("id, data_jogo"),
    supabase.from("convocacoes_base").select("jogo_id"),
  ]);
  const hojeStr = new Date().toISOString().slice(0, 10);
  const hojeTime = new Date(hojeStr).getTime();

  const jogos = ((data ?? []) as JogoBaseRow[]).sort((a, b) => {
    if (ordem === "cronologico") {
      return new Date(a.data_jogo).getTime() - new Date(b.data_jogo).getTime();
    }
    const distanciaA = Math.abs(new Date(a.data_jogo).getTime() - hojeTime);
    const distanciaB = Math.abs(new Date(b.data_jogo).getTime() - hojeTime);
    return distanciaA - distanciaB;
  });
  const logoUrls = await Promise.all(
    jogos.map((j) => getSignedPhotoUrl(supabase, j.adversario_logo_path)),
  );
  const jogoIdsComConvocacao = new Set((convocacoesData ?? []).map((c) => c.jogo_id as string));
  const jogosSemConvocacao = (todosJogosData ?? []).filter(
    (j) => j.data_jogo >= hojeStr && !jogoIdsComConvocacao.has(j.id),
  ).length;
  const pendenciaJogos =
    jogosSemConvocacao > 0
      ? `${jogosSemConvocacao} jogo${jogosSemConvocacao > 1 ? "s" : ""} sem convocação registrada`
      : null;

  const queryStringBase = `q=${encodeURIComponent(q)}&mandante=${encodeURIComponent(mandanteFiltro)}&categoria=${encodeURIComponent(categoriaFiltro)}`;

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Jogos / Competições" pendencia={pendenciaJogos} />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Link
          href={`/base/jogos?${queryStringBase}&ordem=${ordem === "cronologico" ? "proximidade" : "cronologico"}`}
          className="btn-secondary"
        >
          {ordem === "cronologico" ? "Ordenar por mais próximo" : "Ordenar cronologicamente"}
        </Link>
        <a href={`/base/jogos/export?${queryStringBase}`} className="btn-secondary">
          Exportar para Excel
        </a>
        <Link href="/base/jogos/novo" className="btn-primary">
          + Novo jogo
        </Link>
      </div>

      <div className="card mt-4 p-4">
        <SearchBar action="/base/jogos" defaultValue={q} placeholder="Buscar por adversário...">
          <div className="min-w-[160px]">
            <label htmlFor="categoria" className="field-label">
              Categoria
            </label>
            <select id="categoria" name="categoria" defaultValue={categoriaFiltro} className="field-input">
              <option value="">Todas</option>
              {CATEGORIAS_BASE.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label htmlFor="mandante" className="field-label">
              Mandante/Visitante
            </label>
            <select id="mandante" name="mandante" defaultValue={mandanteFiltro} className="field-input">
              <option value="">Todos</option>
              <option value="casa">Em casa</option>
              <option value="fora">Fora</option>
            </select>
          </div>
          <input type="hidden" name="ordem" value={ordem} />
        </SearchBar>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar os jogos. Verifique a conexão com o Supabase.
        </p>
      ) : null}

      {jogos.length === 0 && !error ? (
        <div className="card mt-4 p-8 text-center text-neutral-400">Nenhum jogo encontrado.</div>
      ) : null}

      <div className="mt-4 space-y-3">
        {jogos.map((j, i) => {
          const horario = formatHorario(j.horario);
          const selo = formatSeloData(j.data_jogo);
          const adversarioLogo = logoUrls[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrls[i]!}
              alt={j.adversario_nome}
              className="h-11 w-11 rounded-full border border-neutral-200 bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-xs text-neutral-400">
              {j.adversario_nome.slice(0, 3).toUpperCase()}
            </div>
          );
          const juventusLogo = (
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white p-1">
              <JuventusCrestMark className="h-full w-full" />
            </div>
          );
          const [ladoEsquerdo, ladoDireito] = j.mandante
            ? [
                { logo: juventusLogo, nome: "Juventus" },
                { logo: adversarioLogo, nome: j.adversario_nome },
              ]
            : [
                { logo: adversarioLogo, nome: j.adversario_nome },
                { logo: juventusLogo, nome: "Juventus" },
              ];

          const temResultado = j.gols_pro !== null && j.gols_contra !== null;
          const resultado = temResultado
            ? j.gols_pro! > j.gols_contra!
              ? { label: "Vitória", classe: "bg-green-100 text-green-800" }
              : j.gols_pro! < j.gols_contra!
                ? { label: "Derrota", classe: "bg-red-100 text-red-800" }
                : { label: "Empate", classe: "bg-neutral-200 text-neutral-700" }
            : null;
          const placarEsquerda = j.mandante ? j.gols_pro : j.gols_contra;
          const placarDireita = j.mandante ? j.gols_contra : j.gols_pro;

          return (
            <div key={j.id} className="card overflow-hidden">
              <Link
                href={`/base/jogos/${j.id}`}
                className="flex items-stretch transition-colors hover:bg-neutral-50"
              >
                <div className="flex w-16 shrink-0 flex-col items-center justify-center bg-grena px-1 py-3 text-white sm:w-20">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                    {selo.diaSemana}
                  </span>
                  <span className="text-2xl font-black leading-none">{selo.dia}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                    {selo.mes}
                  </span>
                </div>

                <div className="min-w-0 flex-1 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-medium text-neutral-500">
                    <span className="truncate">
                      {categoriaBaseLabel(j.categoria)} · {j.competicao}
                      {j.rodada_fase ? ` · ${j.rodada_fase}` : ""}
                    </span>
                    <div className="flex shrink-0 gap-1.5">
                      {resultado ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${resultado.classe}`}>
                          {resultado.label}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          j.mandante ? "bg-dourado/20 text-grena-escuro" : "bg-neutral-200 text-neutral-600"
                        }`}
                      >
                        {j.mandante ? "Em casa" : "Fora"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-center gap-3 sm:gap-4">
                    <div className="flex min-w-0 flex-col items-center gap-1">
                      {ladoEsquerdo.logo}
                      <span className="max-w-[90px] truncate text-center text-xs font-semibold text-grena-escuro sm:max-w-[140px] sm:text-sm">
                        {ladoEsquerdo.nome}
                      </span>
                    </div>
                    {temResultado ? (
                      <span className="shrink-0 text-lg font-bold text-grena-escuro">
                        {placarEsquerda} × {placarDireita}
                      </span>
                    ) : (
                      <span className="shrink-0 text-lg font-bold text-neutral-300">×</span>
                    )}
                    <div className="flex min-w-0 flex-col items-center gap-1">
                      {ladoDireito.logo}
                      <span className="max-w-[90px] truncate text-center text-xs font-semibold text-grena-escuro sm:max-w-[140px] sm:text-sm">
                        {ladoDireito.nome}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-center text-xs text-neutral-500 sm:text-sm">
                    {formatData(j.data_jogo)}
                    {horario ? ` · ${horario}` : ""}
                    {j.local_estadio ? ` · ${j.local_estadio}` : ""}
                  </div>
                </div>
              </Link>

              <div className="flex divide-x divide-linha border-t border-linha">
                <Link
                  href={`/base/jogos/${j.id}/sumula`}
                  className="flex-1 py-2.5 text-center text-xs font-semibold text-grena transition-colors hover:bg-grena hover:text-white"
                >
                  Súmula
                </Link>
                <Link
                  href={`/base/jogos/${j.id}/checklist`}
                  className="flex-1 py-2.5 text-center text-xs font-semibold text-grena transition-colors hover:bg-grena hover:text-white"
                >
                  Checklist
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
