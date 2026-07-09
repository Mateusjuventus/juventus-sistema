import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SearchBar } from "@/components/search-bar";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type { JogoRow } from "@/lib/supabase/types";
import { deleteJogo } from "./actions";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
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

  const { data, error } = await query;
  const jogos = (data ?? []) as JogoRow[];
  const logoUrls = await Promise.all(
    jogos.map((j) => getSignedPhotoUrl(supabase, j.adversario_logo_path)),
  );

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-grena-escuro">Jogos / Competições</h1>
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

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Logo</th>
              <th className="px-4 py-3">Adversário</th>
              <th className="px-4 py-3">Competição</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Local</th>
              <th className="px-4 py-3">Mandante</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {jogos.map((j, i) => (
              <tr key={j.id}>
                <td className="px-4 py-3">
                  {logoUrls[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrls[i]!} alt={j.adversario_nome} className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-neutral-100" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-neutral-800">{j.adversario_nome}</td>
                <td className="px-4 py-3">{j.competicao}</td>
                <td className="px-4 py-3">{formatData(j.data_jogo)}</td>
                <td className="px-4 py-3">{j.local_estadio ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      j.mandante ? "bg-dourado/20 text-grena-escuro" : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {j.mandante ? "Em casa" : "Fora"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/jogos/${j.id}`} className="btn-secondary">
                      Editar
                    </Link>
                    <DeleteButton action={deleteJogo.bind(null, j.id)} entityLabel="jogo" />
                  </div>
                </td>
              </tr>
            ))}
            {jogos.length === 0 && !error ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum jogo encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
