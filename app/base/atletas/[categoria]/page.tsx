import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AtletasResumoFiltros, type AtletaResumoItem, type StatusFiltroOpcao } from "@/components/atletas/atletas-resumo-filtros";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { ehCategoriaBaseValida, categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { AtletaBaseRow, AtletaBaseStatus } from "@/lib/supabase/types";

// Rótulos "Apto"/"Não apto"/"Depto. Médico" (em vez de Liberado/Suspenso/Departamento Médico) —
// pedido do Mateus pra bater com o layout antigo de antes do redesign (ver item 7 do ajuste de
// 2026-09-10). "Dispensado" continua com esse nome mesmo (é ele que o checkbox "Mostrar inativos"
// controla). O valor gravado no banco continua "liberado"/"suspenso"/"departamento_medico"; só o
// rótulo exibido nos chips de Status muda.
const STATUS_LABEL: Record<AtletaBaseStatus, string> = {
  liberado: "Apto",
  suspenso: "Não apto",
  departamento_medico: "Depto. Médico",
  dispensado: "Dispensado",
};

// Ordem de exibição dos chips de Status — "Dispensado" por último, de propósito (é o status que
// some por padrão, ver `statusOcultoPorPadrao` abaixo).
const STATUS_OPTIONS: StatusFiltroOpcao[] = [
  { value: "liberado", label: STATUS_LABEL.liberado },
  { value: "suspenso", label: STATUS_LABEL.suspenso },
  { value: "departamento_medico", label: STATUS_LABEL.departamento_medico },
  { value: "dispensado", label: STATUS_LABEL.dispensado },
];

// "formacao" migrou de sub-flag de "amador" pra valor próprio em 2026-09-10 (ver
// supabase/migrations/0097_atleta_contrato_formacao_tipo.sql) — ordem espelha
// ATLETA_BASE_TIPO_CONTRATO_OPTIONS.
const CONTRATO_OPTIONS_BASE = ["definitivo", "emprestimo", "amador", "formacao", "iniciacao"] as const;

/** Lista de Atletas do Futebol de Base filtrada por categoria (Sub20 a Sub11) — espelha
 * `app/atletas/page.tsx`, mas sempre restrita à categoria da URL. Resumo/filtros e busca são
 * inteiramente no client agora (ver docs/superpowers/specs/2026-09-09-atletas-resumo-filtros-design.md):
 * a página só busca a lista completa da categoria, sem filtro nenhum de status/busca na query. */
export default async function AtletasBaseCategoriaPage({
  params,
}: {
  params: { categoria: string };
}) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  const categoria = params.categoria;

  const supabase = createClient();

  const { data, error } = await supabase
    .from("atletas_base")
    .select("*")
    .eq("categoria", categoria)
    .order("nome_completo", { ascending: true });
  const atletas = (data ?? []) as AtletaBaseRow[];

  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));

  const itens: AtletaResumoItem[] = atletas.map((atleta, i) => ({
    id: atleta.id,
    nome: atleta.nome_completo,
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
    href: `/base/atletas/${categoria}/${atleta.id}/ver`,
  }));

  // Pendência do sino/rodapé (ver `PageHeader` antigo) fica de fora aqui — o resumo/filtros logo
  // abaixo do título já mostra contagem de Suspensos e Contratos a vencer de forma bem mais visível
  // do que uma linha de texto no cabeçalho.

  return (
    <AppShell departamento="futebol_base" largura="total">
      <Link href="/base/atletas" className="text-sm font-medium text-grena hover:underline">
        ← Voltar
      </Link>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-grena-escuro">Atletas — {categoriaBaseLabel(categoria)}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/base/atletas/campograma?categoria=${categoria}`} className="btn-secondary">
            Ver campograma
          </Link>
          <Link href={`/base/atletas/${categoria}/novo`} className="btn-primary">
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
          contratoOptions={[...CONTRATO_OPTIONS_BASE]}
          statusOcultoPorPadrao="dispensado"
          exportar={{
            excelHref: `/base/atletas/${categoria}/export`,
            pdfHref: `/base/atletas/${categoria}/export/pdf`,
            extras: [{ label: "Exportar relação", href: `/base/atletas/relacao?categoria=${categoria}` }],
          }}
        />
      </div>
    </AppShell>
  );
}
