import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SearchBar } from "@/components/search-bar";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import type { AtletaRow } from "@/lib/supabase/types";
import { deleteAtleta } from "./actions";

export default async function AtletasPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const supabase = createClient();

  let query = supabase
    .from("atletas")
    .select("*")
    .order("nome_completo", { ascending: true });

  if (q) {
    query = query.ilike("nome_completo", `%${q}%`);
  }

  const { data, error } = await query;
  const atletas = (data ?? []) as AtletaRow[];

  const fotoUrls = await Promise.all(
    atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)),
  );

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-grena-escuro">Atletas</h1>
        <Link href="/atletas/novo" className="btn-primary">
          + Novo atleta
        </Link>
      </div>

      <div className="card mt-4 p-4">
        <SearchBar action="/atletas" defaultValue={q} placeholder="Buscar atleta por nome..." />
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar os atletas. Verifique a conexão com o Supabase.
        </p>
      ) : null}

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Posição</th>
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">CPF</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {atletas.map((atleta, i) => (
              <tr key={atleta.id}>
                <td className="px-4 py-3">
                  {fotoUrls[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fotoUrls[i]!}
                      alt={atleta.nome_completo}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-neutral-100" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-neutral-800">{atleta.nome_completo}</td>
                <td className="px-4 py-3">{atleta.posicao}</td>
                <td className="px-4 py-3">{atleta.numero_camisa ?? "—"}</td>
                <td className="px-4 py-3">{formatCPF(atleta.cpf)}</td>
                <td className="px-4 py-3">{atleta.telefone ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/atletas/${atleta.id}`} className="btn-secondary">
                      Editar
                    </Link>
                    <DeleteButton
                      action={deleteAtleta.bind(null, atleta.id)}
                      entityLabel="atleta"
                    />
                  </div>
                </td>
              </tr>
            ))}
            {atletas.length === 0 && !error ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum atleta encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
