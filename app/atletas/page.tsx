import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AtletasResumoFiltros, type AtletaResumoItem, type StatusFiltroOpcao } from "@/components/atletas/atletas-resumo-filtros";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getCategoriasBasePermitidas, getModulosPermitidos } from "@/lib/auth/role";
import { CATEGORIAS_ATLETA, categoriaAtletaLabel, ehCategoriaAtletaValida } from "@/lib/auth/categorias-base";
import type { AtletaRow, AtletaStatus, CategoriaAtleta } from "@/lib/supabase/types";

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
    supabase.from("atletas").select("categoria").eq("ativo", true),
  ]);

  const podeVerProfissional = modulosPermitidos.includes("atletas");
  const contagens = new Map<string, number>();
  for (const row of (data ?? []) as { categoria: string }[]) {
    contagens.set(row.categoria, (contagens.get(row.categoria) ?? 0) + 1);
  }

  const categoriasVisiveis = CATEGORIAS_ATLETA.filter((cat) =>
    cat.value === "profissional" ? podeVerProfissional : categoriasBasePermitidas.includes(cat.value),
  );

  return (
    <AppShell breadcrumb="Atletas">
      <h1 className="text-2xl font-bold text-grena-escuro">Atletas</h1>
      <p className="mt-1 text-sm text-neutral-500">Escolha uma categoria pra ver a listagem completa.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categoriasVisiveis.map((cat) => (
          <Link
            key={cat.value}
            href={`/atletas?categoria=${cat.value}`}
            className="card flex items-center justify-between p-5 transition-colors hover:border-grena"
          >
            <span className="text-lg font-semibold text-grena-escuro">{cat.label}</span>
            <span className="rounded-full bg-grena/10 px-3 py-1 text-sm font-semibold text-grena-escuro">
              {contagens.get(cat.value) ?? 0}
            </span>
          </Link>
        ))}
        {categoriasVisiveis.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma categoria liberada pro seu acesso.</p>
        ) : null}
      </div>
    </AppShell>
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
