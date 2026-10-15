import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SearchBar } from "@/components/search-bar";
import { JogoCard } from "@/components/jogos/jogo-card";
import { SecaoJogosAnteriores } from "@/components/jogos/secao-jogos-anteriores";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { calcularArtilheiros } from "@/lib/futebol/artilharia";
import type { JogoRow } from "@/lib/supabase/types";

const TOP_ARTILHEIROS = 5;

export default async function JogosPage({
  searchParams,
}: {
  searchParams: { q?: string; mandante?: string; ordem?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const mandanteFiltro = searchParams.mandante ?? "";
  // "cronologico" (padrão) = ordenado pela data do jogo, do mais antigo pro mais recente;
  // "proximidade" = jogo mais próximo de hoje primeiro (mistura passado/futuro por distância) —
  // vira uma opção alternável pelo botão "Ordenar" na tela, não mais o padrão.
  const ordem = searchParams.ordem === "proximidade" ? "proximidade" : "cronologico";
  const supabase = createClient();

  let query = supabase.from("jogos").select("*").order("data_jogo", { ascending: false });
  if (q) query = query.ilike("adversario_nome", `%${q}%`);
  if (mandanteFiltro === "casa") query = query.eq("mandante", true);
  if (mandanteFiltro === "fora") query = query.eq("mandante", false);

  const [{ data, error }, { data: todosJogosData }, { data: convocacoesData }, { data: golsData }] =
    await Promise.all([
      query,
      supabase.from("jogos").select("id, data_jogo"),
      supabase.from("convocacoes").select("jogo_id"),
      supabase.from("sumula_eventos").select("atleta_id").eq("tipo", "gol").not("atleta_id", "is", null),
    ]);

  const artilheirosContagem = calcularArtilheiros(
    ((golsData ?? []) as { atleta_id: string | null }[]).map((g) => ({ atletaId: g.atleta_id })),
  ).slice(0, TOP_ARTILHEIROS);
  const { data: artilheirosAtletasData } =
    artilheirosContagem.length > 0
      ? await supabase
          .from("atletas")
          .select("id, nome_completo")
          .in(
            "id",
            artilheirosContagem.map((a) => a.atletaId),
          )
      : { data: [] };
  const nomePorAtletaId = new Map(
    ((artilheirosAtletasData ?? []) as { id: string; nome_completo: string }[]).map((a) => [a.id, a.nome_completo]),
  );
  const artilheiros = artilheirosContagem
    .map((a) => ({ nome: nomePorAtletaId.get(a.atletaId), gols: a.gols }))
    .filter((a): a is { nome: string; gols: number } => Boolean(a.nome));
  const hojeStr = new Date().toISOString().slice(0, 10);
  const hojeTime = new Date(hojeStr).getTime();

  // Por padrão, ordena pela data mais próxima de hoje primeiro (o próximo jogo a acontecer fica no
  // topo) — em vez da ordem cronológica simples, que deixava o jogo mais distante no futuro lá em
  // cima e o próximo jogo perdido no meio da lista. Quem preferir a ordem cronológica normal (mais
  // antigo primeiro) pode alternar pelo botão "Ordenar" na tela.
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
  // "Jogos anteriores", só aparecem se a pessoa clicar) — pedido do Mateus pra não lotar a tela com
  // o histórico de jogos já passados.
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

  return (
    <AppShell breadcrumb="Jogos">
      {pendenciaJogos ? <p className="text-sm font-medium text-amber-700">{pendenciaJogos}</p> : null}

      {artilheiros.length > 0 ? (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-dourado/40 bg-dourado/10 px-4 py-1.5 text-sm">
            <span className="font-semibold text-grena-escuro">⚽ Artilharia:</span>
            {artilheiros.map((a, i) => (
              <span key={i} className="text-neutral-700">
                {a.nome} ({a.gols}){i < artilheiros.length - 1 ? " ·" : ""}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Link
          href={`/jogos?q=${encodeURIComponent(q)}&mandante=${encodeURIComponent(mandanteFiltro)}&ordem=${
            ordem === "cronologico" ? "proximidade" : "cronologico"
          }`}
          className="btn-secondary"
        >
          {ordem === "cronologico" ? "Ordenar por mais próximo" : "Ordenar cronologicamente"}
        </Link>
        <a
          href={`/jogos/export?q=${encodeURIComponent(q)}&mandante=${encodeURIComponent(mandanteFiltro)}`}
          className="btn-secondary"
        >
          Exportar para Excel
        </a>
        <Link href="/jogos/dashboard" className="btn-secondary">
          Ver dashboard
        </Link>
        <Link href="/jogos/novo" className="btn-primary">
          + Novo jogo
        </Link>
      </div>

      <div className="card mt-4 p-4">
        <SearchBar action="/jogos" defaultValue={q} placeholder="Buscar por adversário...">
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
          {/* Preserva a ordenação escolhida (botão "Ordenar" acima) ao filtrar pela busca. */}
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
          // Grid em vez de coluna única cheia: cartão mais estreito, vários lado a lado — cabem mais
          // jogos na mesma tela em vez de um por linha esticado na largura toda.
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {jogosProximos.map((j) => (
              <JogoCard
                key={j.id}
                jogo={j}
                logoUrl={logoUrlPorJogoId.get(j.id) ?? null}
                href={`/jogos/${j.id}`}
                footer={
                  // Atalhos pro que se usa em todo jogo, sem exceção — por isso Súmula e Checklist,
                  // não Logística (só existe em jogo fora) nem Vagas de Staff (só quando abre vagas).
                  <div className="flex divide-x divide-linha border-t border-linha">
                    <Link
                      href={`/jogos/${j.id}/sumula`}
                      className="flex-1 py-2.5 text-center text-xs font-semibold text-grena transition-colors hover:bg-grena hover:text-white"
                    >
                      Súmula
                    </Link>
                    <Link
                      href={`/jogos/${j.id}/checklist`}
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
            <JogoCard
              key={j.id}
              jogo={j}
              logoUrl={logoUrlPorJogoId.get(j.id) ?? null}
              href={`/jogos/${j.id}`}
              footer={
                <div className="flex divide-x divide-linha border-t border-linha">
                  <Link
                    href={`/jogos/${j.id}/sumula`}
                    className="flex-1 py-2.5 text-center text-xs font-semibold text-grena transition-colors hover:bg-grena hover:text-white"
                  >
                    Súmula
                  </Link>
                  <Link
                    href={`/jogos/${j.id}/checklist`}
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
