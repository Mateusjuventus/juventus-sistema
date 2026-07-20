import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { DeleteButton } from "@/components/delete-button";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { ehCategoriaBaseValida, categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { ComissaoTecnicaBaseRow } from "@/lib/supabase/types";
import { deleteComissaoBase } from "../actions";

/** Lista de Comissão Técnica/Diretoria (Futebol de Base) filtrada por categoria — espelha
 * `app/comissao-tecnica/page.tsx`, restrita à categoria da URL. */
export default async function ComissaoTecnicaBaseCategoriaPage({
  params,
  searchParams,
}: {
  params: { categoria: string };
  searchParams: { q?: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  const categoria = params.categoria;

  const q = searchParams.q?.trim() ?? "";
  const supabase = createClient();

  let query = supabase
    .from("comissao_tecnica_base")
    .select("*")
    .eq("categoria", categoria)
    .order("nome_completo", { ascending: true });
  if (q) query = query.ilike("nome_completo", `%${q}%`);

  const { data, error } = await query;
  const pessoas = (data ?? []) as ComissaoTecnicaBaseRow[];
  const fotoUrls = await Promise.all(pessoas.map((p) => getSignedPhotoUrl(supabase, p.foto_path)));

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base/comissao-tecnica" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title={`Comissão Técnica — ${categoriaBaseLabel(categoria)}`} />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <a
          href={`/base/comissao-tecnica/${categoria}/export?q=${encodeURIComponent(q)}`}
          className="btn-secondary"
        >
          Exportar para Excel
        </a>
        <Link href={`/base/comissao-tecnica/${categoria}/novo`} className="btn-primary">
          + Nova pessoa
        </Link>
      </div>

      <div className="card mt-4 p-4">
        <SearchBar action={`/base/comissao-tecnica/${categoria}`} defaultValue={q} placeholder="Buscar por nome..." />
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
                    <Link href={`/base/comissao-tecnica/${categoria}/${p.id}`} className="btn-secondary">
                      Editar
                    </Link>
                    <DeleteButton action={deleteComissaoBase} id={p.id} entityLabel="registro" />
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
