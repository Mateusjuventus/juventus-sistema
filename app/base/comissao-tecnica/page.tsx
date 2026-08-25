import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { DeleteButton } from "@/components/delete-button";
import { CadastroPublicoToggle } from "@/components/cadastro-publico-toggle";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { CATEGORIAS_BASE, categoriaBaseLabel, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { ComissaoTecnicaBaseTabs } from "@/components/comissao-tecnica-base-tabs";
import type { ComissaoTecnicaBaseRow, ConfiguracaoCadastroComissaoTecnicaBaseRow } from "@/lib/supabase/types";
import { deleteComissaoBase } from "./actions";
import { alternarCadastroPublicoComissaoTecnicaBase } from "./cadastro-publico-actions";

/**
 * Lista única de Comissão Técnica/Diretoria (Futebol de Base) — sem divisão em cards por
 * categoria (uma pessoa pode atuar em mais de uma, ver docs/superpowers/specs/
 * 2026-08-19-comissao-tecnica-multi-categoria-design.md). Mesmo padrão do Staff Operacional da
 * Base (`/base/staff-operacional`): lista única, com um filtro de categoria opcional.
 */
export default async function ComissaoTecnicaBasePage({
  searchParams,
}: {
  searchParams: { q?: string; categoria?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const categoria = ehCategoriaBaseValida(searchParams.categoria ?? "") ? searchParams.categoria! : "";
  const supabase = createClient();

  let query = supabase
    .from("comissao_tecnica_base")
    .select("*")
    .order("nome_completo", { ascending: true });
  if (q) query = query.ilike("nome_completo", `%${q}%`);
  if (categoria) query = query.contains("categorias", [categoria]);

  const [{ data, error }, { data: configData }] = await Promise.all([
    query,
    supabase.from("configuracoes_cadastro_comissao_tecnica_base").select("*").limit(1).maybeSingle(),
  ]);
  const pessoas = (data ?? []) as ComissaoTecnicaBaseRow[];
  const config = configData as ConfiguracaoCadastroComissaoTecnicaBaseRow | null;
  const fotoUrls = await Promise.all(pessoas.map((p) => getSignedPhotoUrl(supabase, p.foto_path)));

  const novaPessoaHref = categoria
    ? `/base/comissao-tecnica/novo?categoria=${categoria}`
    : "/base/comissao-tecnica/novo";

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Comissão Técnica / Diretoria" />
      <ComissaoTecnicaBaseTabs active="lista" />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <a
          href={`/base/comissao-tecnica/export?q=${encodeURIComponent(q)}&categoria=${encodeURIComponent(categoria)}`}
          className="btn-secondary"
        >
          Exportar para Excel
        </a>
        <Link href={novaPessoaHref} className="btn-primary">
          + Nova pessoa
        </Link>
      </div>

      {config ? (
        <div className="mt-4">
          <CadastroPublicoToggle
            id={config.id}
            ativo={config.cadastro_publico_ativo}
            linkPath="/cadastro-comissao-tecnica-base"
            action={alternarCadastroPublicoComissaoTecnicaBase}
          />
        </div>
      ) : null}

      <div className="card mt-4 p-4">
        <SearchBar action="/base/comissao-tecnica" defaultValue={q} placeholder="Buscar por nome...">
          <div className="min-w-[180px]">
            <label htmlFor="categoria" className="field-label">
              Categoria
            </label>
            <select id="categoria" name="categoria" defaultValue={categoria} className="field-input">
              <option value="">Todas</option>
              {CATEGORIAS_BASE.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </SearchBar>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar os registros. Verifique a conexão com o Supabase.
        </p>
      ) : null}

      <div className="card tabela-rolavel mt-4">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Função</th>
              <th className="px-4 py-3">Categoria(s)</th>
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
                <td className="px-4 py-3">{p.categorias.map(categoriaBaseLabel).join(" · ")}</td>
                <td className="px-4 py-3">{formatCPF(p.cpf)}</td>
                <td className="px-4 py-3">{p.telefone ?? "—"}</td>
                <td className="px-4 py-3">{p.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/base/comissao-tecnica/${p.id}`} className="btn-secondary">
                      Editar
                    </Link>
                    <DeleteButton action={deleteComissaoBase} id={p.id} entityLabel="registro" />
                  </div>
                </td>
              </tr>
            ))}
            {pessoas.length === 0 && !error ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-neutral-400">
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
