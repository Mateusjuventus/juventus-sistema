import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SearchBar } from "@/components/search-bar";
import { DeleteButton } from "@/components/delete-button";
import { CadastroPublicoToggle } from "@/components/cadastro-publico-toggle";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { formatCPF } from "@/lib/validation/cpf";
import { formatTelefone } from "@/lib/validation/telefone";
import { getCategoriasBasePermitidas, getDepartamentosPermitidos } from "@/lib/auth/role";
import { CATEGORIAS_COMISSAO_TECNICA, ehCategoriaComissaoTecnicaValida } from "@/lib/auth/categorias-base";
import type { ComissaoTecnicaRow, ConfiguracaoCadastroComissaoTecnicaRow } from "@/lib/supabase/types";
import { deleteComissao } from "./actions";
import { alternarCadastroPublicoComissaoTecnica } from "./cadastro-publico-actions";

/**
 * Lista única da Comissão Técnica/Diretoria — Profissional e Base unificados num só cadastro, com
 * "Profissional" tratado como mais uma categoria (ver docs/superpowers/specs/2026-10-28-
 * unificacao-comissao-tecnica-design.md). Rota canônica, acessível pela sidebar dos dois
 * departamentos (mesmo padrão de Demandas/Programação) — `/base/comissao-tecnica` agora só
 * redireciona pra aqui.
 *
 * Mostrada em só 2 blocos — "Profissional" e "Base" — em vez de um bloco por categoria (pedido
 * explícito do Mateus: "deixar 2 blocos (1 profissional e 1 base)"); o bloco "Base" junta as 7
 * categorias de Base, cada pessoa aparecendo nele se tiver qualquer uma delas em `categorias`. O
 * filtro de busca por categoria (abaixo, no `<select>`) continua granular — pode filtrar por uma
 * categoria específica (ex.: Sub-14) mesmo com a exibição agrupada em só 2 blocos.
 *
 * Cadastro público: desde a mesma unificação, existe um único link (`/cadastro-comissao-tecnica`,
 * com seleção de categoria dentro do próprio formulário) e um único toggle de ativação — o antigo
 * link e toggle da Base foram desativados permanentemente (ver
 * `app/cadastro-comissao-tecnica-base/page.tsx`). Os dois interruptores de MÓDULO (Profissional e
 * Base) continuam separados e decidindo o que cada conta vê aqui (pedido explícito do Mateus:
 * "Manter 2 interruptores") — isso é independente do link público, que agora é um só.
 */
export default async function ComissaoTecnicaPage({
  searchParams,
}: {
  searchParams: { q?: string; categoria?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const categoria = ehCategoriaComissaoTecnicaValida(searchParams.categoria ?? "") ? searchParams.categoria! : "";
  const supabase = createClient();

  let query = supabase.from("comissao_tecnica").select("*").order("nome_completo", { ascending: true });
  if (q) query = query.ilike("nome_completo", `%${q}%`);
  if (categoria) query = query.contains("categorias", [categoria]);

  const [{ data, error }, { data: configData }, departamentosPermitidos, categoriasBasePermitidas] =
    await Promise.all([
      query,
      supabase.from("configuracoes_cadastro_comissao_tecnica").select("*").limit(1).maybeSingle(),
      getDepartamentosPermitidos(supabase),
      getCategoriasBasePermitidas(supabase),
    ]);
  const pessoas = (data ?? []) as ComissaoTecnicaRow[];
  const config = configData as ConfiguracaoCadastroComissaoTecnicaRow | null;
  const fotoUrlPorId = new Map(
    await Promise.all(pessoas.map(async (p) => [p.id, await getSignedPhotoUrl(supabase, p.foto_path)] as const)),
  );
  // Tela única, aberta a partir da sidebar dos dois departamentos — mostra a sidebar de quem só tem
  // a Base liberada; nos outros casos (só Profissional, ou os dois) usa o padrão (Profissional).
  const departamento =
    !departamentosPermitidos.includes("futebol_profissional") && departamentosPermitidos.includes("futebol_base")
      ? "futebol_base"
      : "futebol_profissional";

  const novaPessoaHref = categoria ? `/comissao-tecnica/novo?categoria=${categoria}` : "/comissao-tecnica/novo";
  // Opções do `<select>` de filtro por categoria — continua granular (Profissional + as 7 de Base),
  // mesmo com os BLOCOS exibidos agrupados em só 2 (ver `blocos` abaixo). Cada opção só aparece se o
  // interruptor de módulo do departamento dela estiver liberado pra essa conta.
  const categoriasFiltro = CATEGORIAS_COMISSAO_TECNICA.filter((cat) =>
    cat.value === "profissional"
      ? departamentosPermitidos.includes("futebol_profissional")
      : categoriasBasePermitidas.includes(cat.value),
  );
  // Só 2 blocos (pedido explícito do Mateus) — "Profissional" aparece se o módulo Profissional
  // estiver liberado; "Base" aparece se houver QUALQUER categoria de Base liberada pra essa conta, e
  // junta todas as categorias de Base permitidas num só bloco (não só as que têm gente cadastrada).
  const blocos = [
    ...(departamentosPermitidos.includes("futebol_profissional")
      ? [
          {
            value: "profissional",
            label: "Profissional",
            pessoas: pessoas.filter((p) => p.categorias.includes("profissional")),
          },
        ]
      : []),
    ...(categoriasBasePermitidas.length > 0
      ? [
          {
            value: "base",
            label: "Base",
            // `categoriasBasePermitidas` é `CategoriaBase[]` (subconjunto de `CategoriaComissaoTecnica`,
            // sem "profissional") — percorrer ela e checar contra `p.categorias` (mais amplo) tipa
            // certo; o contrário (`categoriasBasePermitidas.includes(c)` com `c` mais amplo) não tipa.
            pessoas: pessoas.filter((p) => categoriasBasePermitidas.some((permitida) => p.categorias.includes(permitida))),
          },
        ]
      : []),
  ];

  return (
    <AppShell departamento={departamento} breadcrumb="Comissão Técnica / Diretoria">
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <a
          href={`/comissao-tecnica/export?q=${encodeURIComponent(q)}&categoria=${encodeURIComponent(categoria)}`}
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
            linkPath="/cadastro-comissao-tecnica"
            action={alternarCadastroPublicoComissaoTecnica}
          />
        </div>
      ) : null}

      <div className="card mt-4 p-4">
        <SearchBar action="/comissao-tecnica" defaultValue={q} placeholder="Buscar por nome...">
          <div className="min-w-[180px]">
            <label htmlFor="categoria" className="field-label">
              Categoria
            </label>
            <select id="categoria" name="categoria" defaultValue={categoria} className="field-input">
              <option value="">Todas</option>
              {categoriasFiltro.map((cat) => (
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

      <div className="mt-4 space-y-3">
        {blocos.map((bloco) => (
          <details key={bloco.value} open className="card overflow-hidden">
            <summary className="flex cursor-pointer select-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-neutral-600">
              <span>
                {bloco.label}{" "}
                <span className="font-normal text-neutral-400">
                  ({bloco.pessoas.length} pessoa{bloco.pessoas.length === 1 ? "" : "s"})
                </span>
              </span>
            </summary>
            <div className="border-t border-neutral-100 tabela-rolavel">
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
                  {bloco.pessoas.map((p) => {
                    const fotoUrl = fotoUrlPorId.get(p.id) ?? null;
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-3">
                          {fotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={fotoUrl} alt={p.nome_completo} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-neutral-100" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-800">{p.nome_completo}</td>
                        <td className="px-4 py-3">{p.funcao}</td>
                        <td className="px-4 py-3">
                          {p.categorias.map((c) => CATEGORIAS_COMISSAO_TECNICA.find((o) => o.value === c)?.label ?? c).join(" · ")}
                        </td>
                        <td className="px-4 py-3">{formatCPF(p.cpf)}</td>
                        <td className="px-4 py-3">{p.telefone ? formatTelefone(p.telefone) : "—"}</td>
                        <td className="px-4 py-3">{p.email ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Link href={`/comissao-tecnica/${p.id}`} className="btn-secondary">
                              Editar
                            </Link>
                            <DeleteButton action={deleteComissao} id={p.id} entityLabel="registro" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {bloco.pessoas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-neutral-400">
                        Nenhum registro nessa categoria.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </AppShell>
  );
}
