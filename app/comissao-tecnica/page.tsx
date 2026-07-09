import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SearchBar } from "@/components/search-bar";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import type { ComissaoTecnicaRow } from "@/lib/supabase/types";
import { deleteComissao } from "./actions";

export default async function ComissaoTecnicaPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const supabase = createClient();

  let query = supabase.from("comissao_tecnica").select("*").order("nome_completo", { ascending: true });
  if (q) query = query.ilike("nome_completo", `%${q}%`);

  const { data, error } = await query;
  const pessoas = (data ?? []) as ComissaoTecnicaRow[];
  const fotoUrls = await Promise.all(pessoas.map((p) => getSignedPhotoUrl(supabase, p.foto_path)));

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-grena-escuro">Comissão Técnica / Diretoria</h1>
        <Link href="/comissao-tecnica/novo" className="btn-primary">
          + Nova pessoa
        </Link>
      </div>

      <div className="card mt-4 p-4">
        <SearchBar action="/comissao-tecnica" defaultValue={q} placeholder="Buscar por nome..." />
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar os registros. Verifique a conexão com o Supabase.
        </p>
      ) : null}

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Função</th>
              <th className="px-4 py-3">CPF</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {pessoas.map((p, i) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  {fotoUrls[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fotoUrls[i]!} alt={p.nome_completo} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-neutral-100" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-neutral-800">{p.nome_completo}</td>
                <td className="px-4 py-3">{p.funcao}</td>
                <td className="px-4 py-3">{formatCPF(p.cpf)}</td>
                <td className="px-4 py-3">{p.telefone ?? "—"}</td>
                <td className="px-4 py-3">{p.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/comissao-tecnica/${p.id}`} className="btn-secondary">
                      Editar
                    </Link>
                    <DeleteButton action={deleteComissao.bind(null, p.id)} entityLabel="registro" />
                  </div>
                </td>
              </tr>
            ))}
            {pessoas.length === 0 && !error ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
