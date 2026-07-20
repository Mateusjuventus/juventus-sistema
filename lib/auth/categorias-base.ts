/**
 * Categorias de idade do Futebol de Base (Sub20 a Sub11) — usadas pelos módulos que organizam
 * cadastros por categoria: Atletas, Comissão Técnica e Jogos (ver
 * docs/superpowers/specs/2026-07-20-futebol-de-base-design.md). Staff Operacional, Estoque e
 * Solicitações do Futebol de Base NÃO usam categoria (listas únicas).
 *
 * Os `value` abaixo são exatamente os aceitos pelo check constraint de `categoria` nas tabelas
 * `atletas_base`, `comissao_tecnica_base` e `jogos_base` (ver as migrations correspondentes) — se
 * a lista mudar aqui, a migration também precisa mudar.
 */
export type CategoriaBase = "sub20" | "sub17" | "sub15" | "sub14" | "sub13" | "sub12" | "sub11";

export interface CategoriaBaseInfo {
  value: CategoriaBase;
  label: string;
}

export const CATEGORIAS_BASE: CategoriaBaseInfo[] = [
  { value: "sub20", label: "Sub-20" },
  { value: "sub17", label: "Sub-17" },
  { value: "sub15", label: "Sub-15" },
  { value: "sub14", label: "Sub-14" },
  { value: "sub13", label: "Sub-13" },
  { value: "sub12", label: "Sub-12" },
  { value: "sub11", label: "Sub-11" },
];

export const TODAS_CATEGORIAS_BASE: CategoriaBase[] = CATEGORIAS_BASE.map((c) => c.value);

export function ehCategoriaBaseValida(valor: string): valor is CategoriaBase {
  return (TODAS_CATEGORIAS_BASE as string[]).includes(valor);
}

export function categoriaBaseLabel(valor: string): string {
  return CATEGORIAS_BASE.find((c) => c.value === valor)?.label ?? valor;
}
