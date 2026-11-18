import { CATEGORIAS_BASE, categoriaBaseLabel, TODAS_CATEGORIAS_BASE, type CategoriaBase } from "@/lib/auth/categorias-base";
import type { AtletaStatus } from "@/lib/supabase/types";

/**
 * Lógica pura (sem Supabase) da Relação de Atletas da Base (ver docs/superpowers/specs/
 * 2026-09-04-relacao-atletas-base-design.md) — filtro de status/categoria com fallback, composição
 * do texto de escopo e agrupamento por categoria, extraídos pra poder ser testados sem precisar
 * renderizar o PDF nem bater no banco.
 */

export const RELACAO_STATUS_LABEL: Record<AtletaStatus, string> = {
  liberado: "Liberado",
  transicao: "Suspenso",
  departamento_medico: "Departamento Médico",
  dispensado: "Dispensado",
};

export const TODOS_STATUS_ATLETA_BASE: AtletaStatus[] = [
  "liberado",
  "transicao",
  "departamento_medico",
  "dispensado",
];

/** Nenhum status marcado no formulário → entende-se como "todos os status", pra não gerar um PDF
 * vazio por engano (ver a spec, decisão 3). */
export function statusParaFiltro(statusMarcados: AtletaStatus[]): AtletaStatus[] {
  return statusMarcados.length > 0 ? statusMarcados : TODOS_STATUS_ATLETA_BASE;
}

/** Nenhuma categoria marcada no formulário → entende-se como "todas as categorias", mesma lógica de
 * fallback de `statusParaFiltro` (e pelo mesmo motivo: não gerar um PDF vazio por engano). */
export function categoriasParaFiltro(categoriasMarcadas: CategoriaBase[]): CategoriaBase[] {
  return categoriasMarcadas.length > 0 ? categoriasMarcadas : TODAS_CATEGORIAS_BASE;
}

/** Filtro "Quais tipos de contrato incluir" (pedido do Mateus em 18/11/2026, pra poder gerar uma
 * relação só com quem tem Contrato de Formação, por exemplo) — mesmos 5 valores de
 * `ATLETA_BASE_TIPO_CONTRATO_OPTIONS`, mais "sem_contrato" (não existe no enum do banco; representa
 * `tipo_contrato is null`, útil pra achar quem ainda não tem contrato nenhum cadastrado). Como
 * `tipo_contrato` aceita `null`, esse filtro é aplicado em JS depois da query (um `.in()` do
 * Supabase não bate linha com `null`), não direto no Supabase como `statusParaFiltro`/
 * `categoriasParaFiltro` — ver `pdf/route.tsx`. */
export const TODOS_TIPOS_CONTRATO_ATLETA_BASE_FILTRO = [
  "definitivo",
  "emprestimo",
  "amador",
  "formacao",
  "iniciacao",
  "sem_contrato",
] as const;
export type AtletaBaseTipoContratoFiltro = (typeof TODOS_TIPOS_CONTRATO_ATLETA_BASE_FILTRO)[number];

/** Nenhum tipo marcado no formulário → entende-se como "todos os tipos", mesma lógica de fallback
 * de `statusParaFiltro`/`categoriasParaFiltro`. */
export function tipoContratoParaFiltro(
  tiposMarcados: AtletaBaseTipoContratoFiltro[],
): AtletaBaseTipoContratoFiltro[] {
  return tiposMarcados.length > 0 ? tiposMarcados : [...TODOS_TIPOS_CONTRATO_ATLETA_BASE_FILTRO];
}

/** `tipo_contrato` de um atleta (string do banco ou `null`) passa no filtro acima? `null` só passa
 * quando "sem_contrato" está no filtro. */
export function atletaPassaFiltroTipoContrato(
  tipoContrato: string | null,
  filtro: AtletaBaseTipoContratoFiltro[],
): boolean {
  const chave: AtletaBaseTipoContratoFiltro = tipoContrato ? (tipoContrato as AtletaBaseTipoContratoFiltro) : "sem_contrato";
  return filtro.includes(chave);
}

/** Texto de escopo que vira o subtítulo do documento — pedido do Mateus pra sempre listar as
 * categorias de verdade que entraram (ex.: "Sub-20, Sub-17, Sub-15"), nunca um rótulo genérico. Só
 * quando as 7 estão marcadas (equivalente a "todas") é que some a lista comprida e vira o rótulo
 * curto "Todas as Categorias". A ordem segue sempre a canônica de `CATEGORIAS_BASE`
 * (Sub-20 → Sub-11), não a ordem em que o usuário marcou os checkboxes. */
export function composicaoEscopoCategorias(categoriasSelecionadas: CategoriaBase[]): string {
  if (categoriasSelecionadas.length === TODAS_CATEGORIAS_BASE.length) return "Todas as Categorias";
  return CATEGORIAS_BASE.filter((c) => categoriasSelecionadas.includes(c.value))
    .map((c) => c.label)
    .join(", ");
}

export interface RelacaoAtletasGrupo<T> {
  categoria: CategoriaBase;
  categoriaLabel: string;
  atletas: T[];
}

/**
 * Agrupa atletas (já filtrados por status) nas categorias selecionadas, na ordem canônica de
 * `CATEGORIAS_BASE` (Sub-20 → Sub-11) — categorias fora de `categoriasSelecionadas` não entram no
 * resultado (pedido do Mateus: uma categoria não marcada não deve aparecer na relação como uma
 * seção vazia). Uma categoria selecionada, mas sem nenhum atleta, ainda aparece — vazia, pra o
 * documento mostrar "Nenhum atleta cadastrado nessa categoria" em vez de omiti-la silenciosamente
 * (diferença importante: "não selecionada" some, "selecionada mas vazia" aparece vazia).
 */
export function agruparAtletasPorCategoria<T extends { categoria: CategoriaBase }>(
  atletas: T[],
  categoriasSelecionadas: CategoriaBase[],
): RelacaoAtletasGrupo<T>[] {
  return CATEGORIAS_BASE.filter((c) => categoriasSelecionadas.includes(c.value)).map(({ value: categoria }) => ({
    categoria,
    categoriaLabel: categoriaBaseLabel(categoria),
    atletas: atletas.filter((a) => a.categoria === categoria),
  }));
}
