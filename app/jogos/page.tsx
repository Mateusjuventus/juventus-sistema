import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { DeleteButton } from "@/components/delete-button";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type { JogoRow } from "@/lib/supabase/types";
import { deleteJogo } from "./actions";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatHorario(horario: string | null): string | null {
  if (!horario) return null;
  return horario.slice(0, 5);
}

export default async function JogosPage({
  searchParams,
}: {
  searchParams: { q?: string; mandante?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const mandanteFiltro = searchParams.mandante ?? "";
  const supabase = createClient();

  let query = supabase.from("jogos").select("*").order("data_jogo", { ascending: false });
  if (q) query = query.ilike("adversario_nome", `%${q}%`);
  if (mandanteFiltro === "casa") query = query.eq("mandante", true);
  if (mandanteFiltro === "fora") query = query.eq("mandante", false);

  const [{ data, error }, { data: todosJogosData }, { data: convocacoesData }] = await Promise.all([
    query,
    supabase.from("jogos").select("id, data_jogo"),
    supabase.from("convocacoes").select("jogo_id"),
  ]);
  const jogos = (data ?? []) as JogoRow[];
  const logoUrls = await Promise.all(
    jogos.map((j) => getSignedPhotoUrl(supabase, j.adversario_logo_path)),
  );

  const hojeStr = new Date().toISOString().slice(0, 10);
  const jogoIdsComConvocacao = new Set((convocacoesData ?? []).map((c) => c.jogo_id as string));
  const jogosSemConvocacao = (todosJogosData ?? []).filter(
    (j) => j.data_jogo >= hojeStr && !jogoIdsComConvocacao.has(j.id),
  ).length;
  const pendenciaJogos =
    jogosSemConvocacao > 0
      ? `${jogosSemConvocacao} jogo${jogosSemConvocacao > 1 ? "s" : ""} sem convocação registrada`
      : null;

  return (
    <AppShell>
      <Link href="/profissional" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Jogos / Competições" pendencia={pendenciaJogos} />
      <div className="mt-3 flex justify-end">
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

          return (
            <div key={j.id} className="card flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                <span>{j.competicao}{j.rodada_fase ? ` · ${j.rodada_fase}` : ""}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    j.mandante ? "bg-dourado/20 text-grena-escuro" : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {j.mandante ? "Em casa" : "Fora"}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  {ladoEsquerdo.logo}
                  <span className="text-center text-sm font-semibold text-grena-escuro">
                    {ladoEsquerdo.nome}
                  </span>
                </div>
                <span className="text-lg font-bold text-neutral-300">×</span>
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
                <Link href={`/jogos/${j.id}/convocacao`} className="btn-secondary">
                  Convocação
                </Link>
                <Link href={`/jogos/${j.id}`} className="btn-secondary">
                  Editar
                </Link>
                <DeleteButton action={deleteJogo} id={j.id} entityLabel="jogo" />
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
