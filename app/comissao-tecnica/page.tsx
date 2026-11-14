import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SearchBar } from "@/components/search-bar";
import { CadastroPublicoToggle } from "@/components/cadastro-publico-toggle";
import { ComissaoCard } from "@/components/comissao-card";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getCategoriasBasePermitidas, getDepartamentosPermitidos } from "@/lib/auth/role";
import { CATEGORIAS_COMISSAO_TECNICA, ehCategoriaComissaoTecnicaValida } from "@/lib/auth/categorias-base";
import { SETOR_COMISSAO_TECNICA_OPTIONS } from "@/lib/validation/schemas";
import type { ComissaoTecnicaRow, ConfiguracaoCadastroComissaoTecnicaRow } from "@/lib/supabase/types";
import { alternarCadastroPublicoComissaoTecnica } from "./cadastro-publico-actions";

const SETOR_LABEL: Record<string, string> = Object.fromEntries(
  SETOR_COMISSAO_TECNICA_OPTIONS.map((o) => [o.value, o.label]),
);

/** Agrupa a lista de pessoas de um bloco (Profissional/Base) pelo Setor — pedido do Mateus em
 * 14/11/2026 (item 8, ponto 4). Segue a ordem de `SETOR_COMISSAO_TECNICA_OPTIONS`; quem não tem
 * setor cadastrado vai pro grupo "Sem setor", sempre por último. Grupos sem ninguém não aparecem. */
function agruparPorSetor(pessoas: ComissaoTecnicaRow[]): { label: string; pessoas: ComissaoTecnicaRow[] }[] {
  const grupos = SETOR_COMISSAO_TECNICA_OPTIONS.map((opcao) => ({
    label: opcao.label,
    pessoas: pessoas.filter((p) => p.setor === opcao.value),
  }));
  const semSetor = pessoas.filter((p) => !p.setor);
  return [...grupos, { label: "Sem setor", pessoas: semSetor }].filter((grupo) => grupo.pessoas.length > 0);
}

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
            <div className="border-t border-neutral-100 p-4">
              {bloco.pessoas.length === 0 ? (
                <p className="py-6 text-center text-sm text-neutral-400">Nenhum registro nessa categoria.</p>
              ) : (
                <div className="space-y-5">
                  {agruparPorSetor(bloco.pessoas).map((grupo) => (
                    <div key={grupo.label}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                        {grupo.label}{" "}
                        <span className="font-normal text-neutral-300">
                          ({grupo.pessoas.length} pessoa{grupo.pessoas.length === 1 ? "" : "s"})
                        </span>
                      </h3>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {grupo.pessoas.map((p) => (
                          <ComissaoCard
                            key={p.id}
                            id={p.id}
                            nome={p.nome_completo}
                            apelido={p.apelido}
                            fotoUrl={fotoUrlPorId.get(p.id) ?? null}
                            funcao={p.funcao}
                            setorLabel={p.setor ? SETOR_LABEL[p.setor] ?? p.setor : null}
                            ativo={p.ativo}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </AppShell>
  );
}
