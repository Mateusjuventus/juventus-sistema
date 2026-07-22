import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { DeleteButton } from "@/components/delete-button";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { CATEGORIAS_BASE, categoriaBaseLabel, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { JogoBaseRow } from "@/lib/supabase/types";
import { deleteJogoBase } from "./actions";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatHorario(horario: string | null): string | null {
  if (!horario) return null;
  return horario.slice(0, 5);
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

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jogos.map((j, i) => {
          const horario = formatHorario(j.horario);
          const adversarioLogo = logoUrls[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrls[i]!}
              alt={j.adversario_nome}
              className="h-14 w-14 rounded-full border border-neutral-200 bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-xs text-neutral-400">
              {j.adversario_nome.slice(0, 3).toUpperCase()}
            </div>
          );
          const juventusLogo = (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200 bg-white p-1">
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
            <div key={j.id} className="card flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                <span>
                  {categoriaBaseLabel(j.categoria)} · {j.competicao}
                  {j.rodada_fase ? ` · ${j.rodada_fase}` : ""}
                </span>
                <div className="flex gap-1.5">
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

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  {ladoEsquerdo.logo}
                  <span className="text-center text-sm font-semibold text-grena-escuro">
                    {ladoEsquerdo.nome}
                  </span>
                </div>
                {temResultado ? (
                  <span className="text-lg font-bold text-grena-escuro">
                    {placarEsquerda} × {placarDireita}
                  </span>
                ) : (
                  <span className="text-lg font-bold text-neutral-300">×</span>
                )}
                <div className="flex flex-col items-center gap-1.5">
                  {ladoDireito.logo}
                  <span className="text-center text-sm font-semibold text-grena-escuro">
                    {ladoDireito.nome}
                  </span>
                </div>
              </div>

              <div className="text-center text-sm text-neutral-600">
                {formatData(j.data_jogo)}
                {horario ? ` · ${horario}` : ""}
                {j.local_estadio ? ` · ${j.local_estadio}` : ""}
              </div>

              <div className="flex flex-wrap justify-center gap-2 border-t border-neutral-100 pt-3">
                <Link href={`/base/jogos/${j.id}/convocacao`} className="btn-secondary">
                  Entrar
                </Link>
                <Link href={`/base/jogos/${j.id}/checklist`} className="btn-secondary">
                  Checklist
                </Link>
                <Link href={`/base/jogos/${j.id}`} className="btn-secondary">
                  Editar
                </Link>
                <DeleteButton action={deleteJogoBase} id={j.id} entityLabel="jogo" />
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
