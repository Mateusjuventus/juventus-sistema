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
import type {
  ComissaoTecnicaRow,
  ConfiguracaoCadastroComissaoTecnicaRow,
  ConfiguracaoCadastroComissaoTecnicaBaseRow,
} from "@/lib/supabase/types";
import { deleteComissao } from "./actions";
import { alternarCadastroPublicoComissaoTecnica } from "./cadastro-publico-actions";
import { alternarCadastroPublicoComissaoTecnicaBase } from "../base/comissao-tecnica/cadastro-publico-actions";

/**
 * Lista única da Comissão Técnica/Diretoria — Profissional e Base unificados num só cadastro, com
 * "Profissional" tratado como mais uma categoria (ver docs/superpowers/specs/2026-10-28-
 * unificacao-comissao-tecnica-design.md). Rota canônica, acessível pela sidebar dos dois
 * departamentos (mesmo padrão de Demandas/Programação) — `/base/comissao-tecnica` agora só
 * redireciona pra aqui. Mostrada em blocos por categoria (nunca uma lista inteira misturada — pedido
 * explícito do Mateus), cada pessoa pode aparecer em mais de um bloco quando atua em mais de uma
 * categoria. Os cadastros públicos de auto-registro continuam em URLs separadas por departamento
 * (`/cadastro-comissao-tecnica` e `/cadastro-comissao-tecnica-base`) — por isso os dois toggles
 * aparecem aqui juntos, cada um com sua configuração própria.
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

  const [{ data, error }, { data: configData }, { data: configBaseData }, departamentosPermitidos, categoriasBasePermitidas] =
    await Promise.all([
      query,
      supabase.from("configuracoes_cadastro_comissao_tecnica").select("*").limit(1).maybeSingle(),
      supabase.from("configuracoes_cadastro_comissao_tecnica_base").select("*").limit(1).maybeSingle(),
      getDepartamentosPermitidos(supabase),
      getCategoriasBasePermitidas(supabase),
    ]);
  const pessoas = (data ?? []) as ComissaoTecnicaRow[];
  const config = configData as ConfiguracaoCadastroComissaoTecnicaRow | null;
  const configBase = configBaseData as ConfiguracaoCadastroComissaoTecnicaBaseRow | null;
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
  // Cada bloco só aparece se o interruptor de módulo do departamento dele estiver liberado pra essa
  // conta — "Profissional" depende de `futebol_profissional`; cada categoria da Base depende de
  // `getCategoriasBasePermitidas` (que já cobre o interruptor `futebol_base` + o vínculo com a
  // Comissão Técnica, ver `lib/auth/role.ts`). A tela é única, mas os dois interruptores de módulo
  // continuam mandando no que aparece (pedido explícito do Mateus: "Manter 2 interruptores").
  const blocosVisiveis = CATEGORIAS_COMISSAO_TECNICA.filter((cat) =>
    cat.value === "profissional"
      ? departamentosPermitidos.includes("futebol_profissional")
      : categoriasBasePermitidas.includes(cat.value),
  );
  const blocos = blocosVisiveis.map((cat) => ({
    ...cat,
    pessoas: pessoas.filter((p) => p.categorias.includes(cat.value)),
  }));

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

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {config ? (
          <CadastroPublicoToggle
            id={config.id}
            ativo={config.cadastro_publico_ativo}
            linkPath="/cadastro-comissao-tecnica"
            action={alternarCadastroPublicoComissaoTecnica}
          />
        ) : null}
        {configBase ? (
          <CadastroPublicoToggle
            id={configBase.id}
            ativo={configBase.cadastro_publico_ativo}
            linkPath="/cadastro-comissao-tecnica-base"
            action={alternarCadastroPublicoComissaoTecnicaBase}
          />
        ) : null}
      </div>

      <div className="card mt-4 p-4">
        <SearchBar action="/comissao-tecnica" defaultValue={q} placeholder="Buscar por nome...">
          <div className="min-w-[180px]">
            <label htmlFor="categoria" className="field-label">
              Categoria
            </label>
            <select id="categoria" name="categoria" defaultValue={categoria} className="field-input">
              <option value="">Todas</option>
              {blocosVisiveis.map((cat) => (
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
