import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { CadastroPublicoToggle } from "@/components/cadastro-publico-toggle";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import {
  CAPTACAO_STATUS_OPTIONS,
  contarInscricoesPendentes,
  contarPorStatus,
} from "@/lib/futebol/captacao";
import type {
  CaptacaoBaseRow,
  ConfiguracaoInscricaoCaptacaoBaseRow,
  ConfiguracaoParecerCaptacaoBaseRow,
} from "@/lib/supabase/types";
import { alternarInscricaoCaptacao, atualizarAssinaturasParecer, mudarStatusCaptacao } from "./actions";
import { CaptacaoLista } from "./captacao-lista";
import { AssinaturasConfigForm } from "./assinaturas-config-form";

/**
 * Banco de dados da Captação/Avaliação — TOTALMENTE separado do cadastro de Atletas (ver
 * docs/superpowers/specs/2026-08-19-captacao-atletas-separacao-design.md). Quem se inscreve pelo
 * link público cai na fila de "Aprovações" antes de aparecer como "Em avaliação" aqui. O dashboard
 * com o mapa por estado fica em `/base/captacao/dashboard`, separado desta lista pra não sobrecarregar
 * a tela do dia a dia.
 */
export default async function CaptacaoPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; categoria?: string; uf?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const status = searchParams.status?.trim() ?? "";
  const categoria = searchParams.categoria?.trim() ?? "";
  const uf = searchParams.uf?.trim() ?? "";
  const supabase = createClient();

  // "Inscrição enviada" nunca aparece aqui — fica só na fila de Aprovações
  // (/base/captacao/aprovacoes) até ser decidida (ver docs/superpowers/specs/
  // 2026-08-19-captacao-atletas-separacao-design.md).
  let query = supabase
    .from("captacao_base")
    .select("*")
    .neq("status", "inscricao")
    .order("numero", { ascending: false });
  if (q) query = query.ilike("nome_completo", `%${q}%`);
  if (status) query = query.eq("status", status);
  if (categoria) query = query.eq("categoria", categoria);
  if (uf) query = query.eq("uf", uf.toUpperCase());

  const [{ data, error }, { data: configData }, { data: configParecerData }] = await Promise.all([
    query,
    supabase.from("configuracoes_inscricao_captacao_base").select("*").limit(1).maybeSingle(),
    supabase.from("configuracoes_parecer_captacao_base").select("*").limit(1).maybeSingle(),
  ]);

  const candidatos = (data ?? []) as CaptacaoBaseRow[];
  const config = configData as ConfiguracaoInscricaoCaptacaoBaseRow | null;
  const configParecer = configParecerData as ConfiguracaoParecerCaptacaoBaseRow | null;

  // A contagem dos cartões é sobre TODO o banco (sem o filtro de busca/status da lista) — senão
  // filtrar por "Aprovado" faria os outros três cartões sumirem, o oposto do que um resumo serve.
  const { data: todosData } = await supabase.from("captacao_base").select("status");
  const todosStatus = (todosData ?? []) as { status: CaptacaoBaseRow["status"] }[];
  const contagem = contarPorStatus(todosStatus);
  const aguardandoAprovacao = contarInscricoesPendentes(todosStatus);

  return (
    <AppShell departamento="futebol_base">
      <Link href="/base" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>
      <PageHeader title="Captação/Avaliação" />
      <p className="mt-1 text-center text-sm text-neutral-500">
        Banco de candidatos em teste — sem relação com o cadastro de Atletas já do clube.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Link
          href="/base/captacao/aprovacoes"
          className="card p-4 text-center transition-shadow hover:shadow-md"
        >
          <p className="text-2xl font-bold text-blue-700">{aguardandoAprovacao}</p>
          <p className="mt-1 text-xs font-medium text-neutral-500">Aguardando aprovação</p>
        </Link>
        {CAPTACAO_STATUS_OPTIONS.map((opcao) => (
          <div key={opcao.value} className="card p-4 text-center">
            <p className="text-2xl font-bold text-grena-escuro">{contagem[opcao.value]}</p>
            <p className="mt-1 text-xs font-medium text-neutral-500">{opcao.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Link href="/base/captacao/aprovacoes" className="btn-secondary">
          Ver Aprovações
        </Link>
        <Link href="/base/captacao/dashboard" className="btn-secondary">
          Ver dashboard e mapa
        </Link>
        <a
          href={`/base/captacao/pdf?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&categoria=${encodeURIComponent(categoria)}&uf=${encodeURIComponent(uf)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          Gerar PDF (com os filtros de agora)
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
            linkPath="/inscricao-captacao-base"
            action={alternarInscricaoCaptacao}
          />
        </div>
      ) : null}

      {configParecer ? (
        <div className="card mt-4 p-4">
          <AssinaturasConfigForm
            id={configParecer.id}
            assinaturasIniciais={configParecer.assinaturas}
            action={atualizarAssinaturasParecer}
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
          <div className="min-w-[100px]">
            <label htmlFor="uf" className="field-label">
              UF
            </label>
            <input
              id="uf"
              name="uf"
              defaultValue={uf}
              maxLength={2}
              placeholder="Ex: SP"
              className="field-input"
            />
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
        <div className="mt-4">
          <CaptacaoLista candidatos={candidatos} updateStatusAction={mudarStatusCaptacao} />
        </div>
      )}
    </AppShell>
  );
}
