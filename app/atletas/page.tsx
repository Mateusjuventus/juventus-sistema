import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AtletasResumoFiltros, type AtletaResumoItem, type StatusFiltroOpcao } from "@/components/atletas/atletas-resumo-filtros";
import { IconAtletas } from "@/components/module-icons";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getCategoriasBasePermitidas, getModulosPermitidos } from "@/lib/auth/role";
import {
  CATEGORIAS_ATLETA,
  CATEGORIA_ATLETA_COR,
  categoriaAtletaLabel,
  ehCategoriaAtletaValida,
} from "@/lib/auth/categorias-base";
import { ATLETA_TIPO_CONTRATO_OPTIONS, ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import type { AtletaRow, AtletaStatus, AtletaTipoContrato, CategoriaAtleta } from "@/lib/supabase/types";

// Rótulos "Apto"/"Depto. Médico" (em vez de Liberado/Departamento Médico) — pedido do Mateus pra
// bater com o layout antigo de antes do redesign (ver item 7 do ajuste de 2026-09-10).
// "Suspenso" saiu do vocabulário em 01/10/2026 (Profissional) e na própria unificação (Base) — ver
// docs/superpowers/specs/2026-10-01-departamento-medico-historico-status-design.md.
// "Dispensado" passou a valer pras duas categorias desde a unificação de Atletas (28/10/2026, ver
// docs/superpowers/specs/2026-10-28-unificacao-atletas-design.md) — por isso os chips de Status
// agora são os mesmos pras duas, com "Dispensado" por último e escondido por padrão (mesmo
// princípio que já valia só pra Base, ver `statusOcultoPorPadrao` abaixo).
const STATUS_LABEL: Record<AtletaStatus, string> = {
  liberado: "Apto",
  departamento_medico: "Depto. Médico",
  transicao: "Transição",
  dispensado: "Dispensado",
};

const STATUS_OPTIONS: StatusFiltroOpcao[] = [
  { value: "liberado", label: STATUS_LABEL.liberado },
  { value: "departamento_medico", label: STATUS_LABEL.departamento_medico },
  { value: "transicao", label: STATUS_LABEL.transicao },
  { value: "dispensado", label: STATUS_LABEL.dispensado },
];

// Sem "iniciacao" aqui — só existe na Base (ver docs/superpowers/specs/
// 2026-09-09-atletas-resumo-filtros-design.md, seção 2). "formacao" migrou de sub-flag de "amador"
// pra valor próprio em 2026-09-10 (ver supabase/migrations/0097_atleta_contrato_formacao_tipo.sql).
const CONTRATO_OPTIONS_PROFISSIONAL = ["definitivo", "emprestimo", "amador", "formacao"] as const;
const CONTRATO_OPTIONS_BASE = ["definitivo", "emprestimo", "amador", "formacao", "iniciacao"] as const;

/** Agrupa as linhas (já restritas às categorias que o usuário pode ver — ver `AtletasIndice`) por
 * `tipo_contrato`, separando Base de Profissional pelo mesmo critério usado em todo o resto da
 * tela (`categoria !== "profissional"`). Nulo cai no balde "sem_tipo" — cadastro antigo sem esse
 * campo preenchido. */
function contarPorTipoContrato(
  linhas: { categoria: string; tipo_contrato: AtletaTipoContrato | null }[],
  grupoBase: boolean,
): Map<AtletaTipoContrato | "sem_tipo", number> {
  const contagem = new Map<AtletaTipoContrato | "sem_tipo", number>();
  for (const linha of linhas) {
    if ((linha.categoria !== "profissional") !== grupoBase) continue;
    const chave = linha.tipo_contrato ?? "sem_tipo";
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return contagem;
}

/** Transforma a contagem acima numa lista pronta pra exibir no painel de resumo — na ordem das
 * opções de tipo de contrato (ver `ATLETA_TIPO_CONTRATO_OPTIONS`/`ATLETA_BASE_TIPO_CONTRATO_OPTIONS`
 * em lib/validation/schemas.ts), escondendo o que está zerado, com "Sem tipo definido" sempre por
 * último quando houver algum. */
function linhasResumoContrato(
  contagem: Map<AtletaTipoContrato | "sem_tipo", number>,
  opcoes: readonly { value: string; label: string }[],
): { label: string; valor: number }[] {
  const linhas = opcoes
    .map((opcao) => ({ label: opcao.label, valor: contagem.get(opcao.value as AtletaTipoContrato) ?? 0 }))
    .filter((linha) => linha.valor > 0);
  const semTipo = contagem.get("sem_tipo") ?? 0;
  if (semTipo > 0) linhas.push({ label: "Sem tipo definido", valor: semTipo });
  return linhas;
}

function calcularIdade(dataNascimento: string, hoje: Date): number {
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

/**
 * Atletas — unificado em 28/10/2026 (ver docs/superpowers/specs/2026-10-28-unificacao-atletas-
 * design.md). `/atletas` sozinho (sem `?categoria=`) é um índice: um bloco/link por categoria
 * (Profissional + as 7 da Base), cada um só com uma contagem — decisão do Mateus ("Manter páginas
 * separadas por categoria"): a experiência pesada de filtros/busca (`AtletasResumoFiltros`, com
 * pizza de contrato, chips de status/posição etc.) continua existindo uma categoria por vez, não
 * 8 bloqos acordeão numa página só. `/atletas?categoria=X` é essa página cheia, uma por categoria
 * — o que antes eram duas rotas quase idênticas (`/atletas` pro Profissional,
 * `/base/atletas/[categoria]` pra Base) virou uma só, parametrizada por query string.
 */
export default async function AtletasPage({
  searchParams,
}: {
  searchParams: { categoria?: string };
}) {
  const categoriaParam = searchParams.categoria;
  const categoria =
    categoriaParam && ehCategoriaAtletaValida(categoriaParam) ? (categoriaParam as CategoriaAtleta) : null;

  if (!categoria) {
    return <AtletasIndice />;
  }

  return <AtletasCategoriaListagem categoria={categoria} />;
}

async function AtletasIndice() {
  const supabase = createClient();

  const [modulosPermitidos, categoriasBasePermitidas, { data }] = await Promise.all([
    getModulosPermitidos(supabase),
    getCategoriasBasePermitidas(supabase),
    supabase.from("atletas").select("categoria, tipo_contrato").eq("ativo", true),
  ]);

  const podeVerProfissional = modulosPermitidos.includes("atletas");
  const linhas = (data ?? []) as { categoria: string; tipo_contrato: AtletaTipoContrato | null }[];

  const contagens = new Map<string, number>();
  for (const linha of linhas) {
    contagens.set(linha.categoria, (contagens.get(linha.categoria) ?? 0) + 1);
  }

  const categoriasVisiveis = CATEGORIAS_ATLETA.filter((cat) =>
    cat.value === "profissional" ? podeVerProfissional : categoriasBasePermitidas.includes(cat.value),
  );

  // O painel de resumo só conta o que o próprio usuário já pode ver nos cards abaixo — nunca
  // mistura atleta de uma categoria de Base fora do seu acesso.
  const categoriasVisiveisValores = new Set<string>(categoriasVisiveis.map((cat) => cat.value));
  const linhasVisiveis = linhas.filter((linha) => categoriasVisiveisValores.has(linha.categoria));
  const temBaseVisivel = categoriasVisiveis.some((cat) => cat.value !== "profissional");

  const totalBase = linhasVisiveis.filter((linha) => linha.categoria !== "profissional").length;
  const totalProfissional = linhasVisiveis.filter((linha) => linha.categoria === "profissional").length;
  const resumoBase = linhasResumoContrato(contarPorTipoContrato(linhasVisiveis, true), ATLETA_BASE_TIPO_CONTRATO_OPTIONS);
  const resumoProfissional = linhasResumoContrato(
    contarPorTipoContrato(linhasVisiveis, false),
    ATLETA_TIPO_CONTRATO_OPTIONS,
  );

  return (
    <AppShell breadcrumb="Atletas">
      <h1 className="text-2xl font-bold text-grena-escuro">Atletas</h1>
      <p className="mt-1 text-sm text-neutral-500">Escolha uma categoria pra ver a listagem completa.</p>

      {temBaseVisivel || podeVerProfissional ? (
        <div className="card mt-6 divide-y divide-linha overflow-hidden sm:flex sm:divide-x sm:divide-y-0">
          {temBaseVisivel ? (
            <ResumoGrupo
              titulo="Base"
              total={totalBase}
              linhas={resumoBase}
              corTexto="text-grena-escuro"
              corFundo="bg-grena/10"
              corBarra="bg-grena"
            />
          ) : null}
          {podeVerProfissional ? (
            <ResumoGrupo
              titulo="Profissional"
              total={totalProfissional}
              linhas={resumoProfissional}
              corTexto="text-dourado"
              corFundo="bg-dourado/10"
              corBarra="bg-dourado"
            />
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categoriasVisiveis.map((cat) => {
          const cor = CATEGORIA_ATLETA_COR[cat.value];
          const quantidade = contagens.get(cat.value) ?? 0;
          return (
            <Link
              key={cat.value}
              href={`/atletas?categoria=${cat.value}`}
              className="card group relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: cor }} aria-hidden />
              <div className="flex items-center justify-between gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${cor}1A`, color: cor }}
                >
                  <IconAtletas className="h-5 w-5" />
                </span>
                <span className="text-3xl font-bold tabular-nums text-grena-escuro">{quantidade}</span>
              </div>
              <p className="mt-3 text-base font-semibold text-neutral-800 transition-colors group-hover:text-grena-escuro">
                {cat.label}
              </p>
              <p className="text-xs text-neutral-400">{quantidade === 1 ? "atleta ativo" : "atletas ativos"}</p>
            </Link>
          );
        })}
        {categoriasVisiveis.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma categoria liberada pro seu acesso.</p>
        ) : null}
      </div>
    </AppShell>
  );
}

/** Uma coluna do painel de resumo (Base ou Profissional) — total em destaque + composição por tipo
 * de contrato, cada linha com uma barrinha de proporção (mesmo espírito do `DonutComposicao` de
 * `components/charts/donut-composicao.tsx`, mas em lista/barra em vez de rosca: aqui são contagens
 * de atleta, não valores em R$, e o painel é só leitura, sem precisar de interação/hover). */
function ResumoGrupo({
  titulo,
  total,
  linhas,
  corTexto,
  corFundo,
  corBarra,
}: {
  titulo: string;
  total: number;
  linhas: { label: string; valor: number }[];
  corTexto: string;
  corFundo: string;
  corBarra: string;
}) {
  return (
    <div className="flex-1 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${corFundo} ${corTexto}`}>
          <IconAtletas className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{titulo}</p>
          <p className="text-2xl font-bold leading-tight text-grena-escuro">
            {total} <span className="text-sm font-medium text-neutral-400">{total === 1 ? "atleta" : "atletas"}</span>
          </p>
        </div>
      </div>

      {linhas.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-3">
          {linhas.map((linha) => {
            const pct = total > 0 ? Math.round((linha.valor / total) * 100) : 0;
            return (
              <li key={linha.label}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-neutral-700">{linha.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-neutral-800">{linha.valor}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div className={`h-full rounded-full ${corBarra}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-neutral-400">Nenhum atleta ativo por aqui ainda.</p>
      )}
    </div>
  );
}

async function AtletasCategoriaListagem({ categoria }: { categoria: CategoriaAtleta }) {
  const supabase = createClient();
  const isBase = categoria !== "profissional";

  if (isBase) {
    const categoriasPermitidas = await getCategoriasBasePermitidas(supabase);
    if (!categoriasPermitidas.includes(categoria)) {
      return (
        <AppShell breadcrumb="Atletas">
          <p className="mt-4 text-sm text-neutral-500">Você não tem acesso a esta categoria.</p>
        </AppShell>
      );
    }
  }

  const { data, error } = await supabase
    .from("atletas")
    .select("*")
    .eq("categoria", categoria)
    .order("nome_completo", { ascending: true });
  const atletas = (data ?? []) as AtletaRow[];

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const idades = atletas.map((a) => calcularIdade(a.data_nascimento, hoje));
  const mediaIdade = idades.length > 0 ? idades.reduce((soma, i) => soma + i, 0) / idades.length : 0;

  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));

  const itens: AtletaResumoItem[] = atletas.map((atleta, i) => ({
    id: atleta.id,
    nome: atleta.nome_completo,
    apelido: atleta.apelido,
    cpf: atleta.cpf,
    fotoUrl: fotoUrls[i],
    dataNascimento: atleta.data_nascimento,
    dataFimContrato: atleta.data_fim_contrato,
    tipoContrato: atleta.tipo_contrato,
    posicao: atleta.posicao,
    numeroCamisa: atleta.numero_camisa,
    dispensado: atleta.status === "dispensado",
    classificacao: atleta.classificacao,
    status: atleta.status,
    ativo: atleta.ativo,
    href: `/atletas/${atleta.id}/ver`,
  }));

  const exportar = isBase
    ? {
        excelHref: `/base/atletas/${categoria}/export`,
        pdfHref: `/base/atletas/${categoria}/export/pdf`,
        extras: [{ label: "Exportar relação", href: `/base/atletas/relacao?categoria=${categoria}` }],
      }
    : { excelHref: "/atletas/export", pdfHref: "/atletas/export/pdf" };

  return (
    <AppShell departamento={isBase ? "futebol_base" : undefined} largura="total" breadcrumb="Atletas">
      <Link href="/atletas" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-grena-escuro">Atletas — {categoriaAtletaLabel(categoria)}</h1>
        <div className="flex flex-wrap gap-2">
          {isBase ? (
            <Link href={`/base/atletas/campograma?categoria=${categoria}`} className="btn-secondary">
              Ver campograma
            </Link>
          ) : null}
          <Link href={`/atletas/novo?categoria=${categoria}`} className="btn-primary">
            + Novo atleta
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar os atletas. Verifique a conexão com o Supabase.
        </p>
      ) : null}

      <div className="mt-4">
        <AtletasResumoFiltros
          atletas={itens}
          statusOptions={STATUS_OPTIONS}
          contratoOptions={isBase ? [...CONTRATO_OPTIONS_BASE] : [...CONTRATO_OPTIONS_PROFISSIONAL]}
          statusOcultoPorPadrao="dispensado"
          estatisticaExtra={
            !isBase && mediaIdade > 0 ? { label: "Média de idade", valor: mediaIdade.toFixed(1) } : undefined
          }
          exportar={exportar}
        />
      </div>
    </AppShell>
  );
}
