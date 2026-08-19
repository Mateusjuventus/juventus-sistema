import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { CadastroPublicoToggle } from "@/components/cadastro-publico-toggle";
import { createClient } from "@/lib/supabase/server";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { CAPTACAO_STATUS_OPTIONS, captacaoStatusLabel, contarPorStatus, corCaptacaoStatus } from "@/lib/futebol/captacao";
import type { CaptacaoBaseRow, ConfiguracaoCadastroAtletaBaseRow } from "@/lib/supabase/types";
import { alternarCadastroPublicoAtletaBase } from "./actions";

function formatDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Banco de dados da Captação/Avaliação — todo candidato em teste passa por aqui antes de virar um
 * cadastro oficial em Atletas (ver docs/superpowers/specs/2026-08-19-captacao-base-design.md).
 * O dashboard com o mapa por estado fica em `/base/captacao/dashboard`, separado desta lista pra
 * não sobrecarregar a tela do dia a dia.
 */
export default async function CaptacaoPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const status = searchParams.status?.trim() ?? "";
  const supabase = createClient();

  let query = supabase.from("captacao_base").select("*").order("numero", { ascending: false });
  if (q) query = query.ilike("nome_completo", `%${q}%`);
  if (status) query = query.eq("status", status);

  const [{ data, error }, { data: configData }] = await Promise.all([
    query,
    supabase.from("configuracoes_cadastro_atleta_base").select("*").limit(1).maybeSingle(),
  ]);

  const candidatos = (data ?? []) as CaptacaoBaseRow[];
  const config = configData as ConfiguracaoCadastroAtletaBaseRow | null;

  // A contagem dos cartões é sobre TODO o banco (sem o filtro de busca/status da lista) — senão
  // filtrar por "Aprovado" faria os outros três cartões sumirem, o oposto do que um resumo serve.
  const { data: todosData } = await supabase.from("captacao_base").select("status");
  const contagem = contarPorStatus((todosData ?? []) as { status: CaptacaoBaseRow["status"] }[]);

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Captação/Avaliação" />
      <p className="mt-1 text-center text-sm text-neutral-500">
        Todo candidato em teste passa por aqui. Ao aprovar, o sistema já cria o cadastro completo
        dele em Atletas.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CAPTACAO_STATUS_OPTIONS.map((opcao) => (
          <div key={opcao.value} className="card p-4 text-center">
            <p className="text-2xl font-bold text-grena-escuro">{contagem[opcao.value]}</p>
            <p className="mt-1 text-xs font-medium text-neutral-500">{opcao.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Link href="/base/captacao/dashboard" className="btn-secondary">
          Ver dashboard e mapa
        </Link>
        <a href="/base/captacao/pdf" target="_blank" rel="noopener noreferrer" className="btn-secondary">
          Gerar PDF
        </a>
        <Link href="/base/captacao/novo" className="btn-primary">
          + Novo candidato
        </Link>
      </div>

      {config ? (
        <div className="mt-4">
          <CadastroPublicoToggle
            id={config.id}
            ativo={config.cadastro_publico_ativo}
            linkPath="/cadastro-atleta-base"
            action={alternarCadastroPublicoAtletaBase}
          />
        </div>
      ) : null}

      <div className="card mt-4 p-4">
        <SearchBar action="/base/captacao" defaultValue={q} placeholder="Buscar por nome...">
          <div className="min-w-[180px]">
            <label htmlFor="status" className="field-label">
              Status
            </label>
            <select id="status" name="status" defaultValue={status} className="field-input">
              <option value="">Todos</option>
              {CAPTACAO_STATUS_OPTIONS.map((opcao) => (
                <option key={opcao.value} value={opcao.value}>
                  {opcao.label}
                </option>
              ))}
            </select>
          </div>
        </SearchBar>
      </div>

      {error ? (
        <p className="card mt-4 p-6 text-center text-sm text-red-700">
          Não foi possível carregar a lista agora.
        </p>
      ) : candidatos.length === 0 ? (
        <p className="card mt-4 p-6 text-center text-sm text-neutral-400">Nenhum candidato encontrado.</p>
      ) : (
        <section className="card tabela-rolavel mt-4">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3">Nº</th>
                <th className="px-4 py-3">Data de início</th>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Nascimento</th>
                <th className="px-4 py-3">Posição</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Indicação</th>
                <th className="px-4 py-3">Alojamento</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {candidatos.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-500">{c.numero}</td>
                  <td className="px-4 py-3 text-neutral-500">{formatDataBr(c.data_inicio)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/base/captacao/${c.id}`} className="font-medium text-grena hover:underline">
                      {c.nome_completo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{formatDataBr(c.data_nascimento)}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.posicao ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {c.categoria ? categoriaBaseLabel(c.categoria) : "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {c.cidade ? `${c.cidade}${c.uf ? `/${c.uf}` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{c.indicacao ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.deseja_alojamento ? "Sim" : "Não"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${corCaptacaoStatus(c.status)}`}>
                      {captacaoStatusLabel(c.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </AppShell>
  );
}
