import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SearchBar } from "@/components/search-bar";
import { JogoCardBase } from "@/components/jogos/jogo-card-base";
import { SecaoJogosAnteriores } from "@/components/jogos/secao-jogos-anteriores";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getCategoriasBasePermitidas } from "@/lib/auth/role";
import { CATEGORIAS_BASE, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { JogoBaseRow, JogoRow } from "@/lib/supabase/types";

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
  // "cronologico" (padrão) = ordenado pela data do jogo — ver o comentário equivalente no
  // Profissional (`app/jogos/page.tsx`).
  const ordem = searchParams.ordem === "proximidade" ? "proximidade" : "cronologico";
  const supabase = createClient();
  const categoriasPermitidas = await getCategoriasBasePermitidas(supabase);

  let query = supabase
    .from("jogos")
    .select("*")
    .in("categoria", categoriasPermitidas)
    .order("data_jogo", { ascending: false });
  if (q) query = query.ilike("adversario_nome", `%${q}%`);
  if (mandanteFiltro === "casa") query = query.eq("mandante", true);
  if (mandanteFiltro === "fora") query = query.eq("mandante", false);
  if (ehCategoriaBaseValida(categoriaFiltro)) query = query.eq("categoria", categoriaFiltro);

  const [{ data, error }, { data: todosJogosData }, { data: convocacoesData }] = await Promise.all([
    query,
    supabase.from("jogos").select("id, data_jogo").in("categoria", categoriasPermitidas),
    supabase.from("convocacoes").select("jogo_id"),
  ]);
  const hojeStr = new Date().toISOString().slice(0, 10);
  const hojeTime = new Date(hojeStr).getTime();

  // `JogoCardBase` (fora do escopo desta unificação) ainda espera o tipo antigo `JogoBaseRow`. Como
  // a query acima já filtra por `categoriasPermitidas` (só categorias da Base), `categoria` nunca é
  // de fato `"profissional"` aqui — a diferença entre os dois tipos é só essa união mais larga em
  // `JogoRow`, então o cast é seguro em tempo de execução.
  const paraJogoCardBase = (j: JogoRow): JogoBaseRow => j as unknown as JogoBaseRow;

  const jogos = ((data ?? []) as JogoRow[]).sort((a, b) => {
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
  // Separa os próximos jogos (destaque, sempre visíveis) dos já realizados (escondidos atrás de
  // "Jogos anteriores") — ver o comentário equivalente no Profissional (`app/jogos/page.tsx`).
  const logoUrlPorJogoId = new Map(jogos.map((j, i) => [j.id, logoUrls[i]]));
  const jogosProximos = jogos.filter((j) => j.data_jogo >= hojeStr);
  const jogosAnteriores = jogos.filter((j) => j.data_jogo < hojeStr);
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
    <AppShell departamento="futebol_base" breadcrumb="Jogos">
      {pendenciaJogos ? <p className="text-sm font-medium text-amber-700">{pendenciaJogos}</p> : null}
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
              {CATEGORIAS_BASE.filter((cat) => categoriasPermitidas.includes(cat.value)).map((cat) => (
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

      {jogos.length > 0 ? (
        jogosProximos.length > 0 ? (
          // Grid em vez de coluna única cheia — ver o comentário equivalente no Profissional
          // (`app/jogos/page.tsx`).
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {jogosProximos.map((j) => (
              <JogoCardBase
                key={j.id}
                jogo={paraJogoCardBase(j)}
                logoUrl={logoUrlPorJogoId.get(j.id) ?? null}
                href={`/base/jogos/${j.id}`}
                footer={
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
                }
              />
            ))}
          </div>
        ) : (
          <div className="card mt-4 p-8 text-center text-neutral-400">Nenhum jogo agendado.</div>
        )
      ) : null}

      {jogosAnteriores.length > 0 ? (
        <SecaoJogosAnteriores count={jogosAnteriores.length}>
          {jogosAnteriores.map((j) => (
            <JogoCardBase
              key={j.id}
              jogo={paraJogoCardBase(j)}
              logoUrl={logoUrlPorJogoId.get(j.id) ?? null}
              href={`/base/jogos/${j.id}`}
              footer={
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
              }
            />
          ))}
        </SecaoJogosAnteriores>
      ) : null}
    </AppShell>
  );
}
