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

/** Uma cor por categoria, do mais velho (Sub-20) ao mais novo (Sub-11) — tons do próprio `grena`
 * da identidade visual (ver `lib/theme.ts`), cada vez mais claros, nunca uma cor fora da paleta do
 * sistema. Usado nos gráficos de composição por categoria (ex.: Assistência Social, ver
 * docs/superpowers/specs/2026-10-05-assistencia-social-e-demandas-design.md). */
export const CATEGORIA_BASE_COR: Record<CategoriaBase, string> = {
  sub20: "#3F0724",
  sub17: "#5C0A35",
  sub15: "#732D52",
  sub14: "#8B516F",
  sub13: "#A2748C",
  sub12: "#BA97A9",
  sub11: "#D1BAC6",
};

/**
 * Categorias da Comissão Técnica unificada (Profissional + Base) — ver
 * docs/superpowers/specs/2026-10-28-unificacao-comissao-tecnica-design.md. "profissional" é
 * específico desta tabela unificada (`comissao_tecnica.categorias`); NÃO é um valor válido em
 * `atletas_base`/`jogos_base`, que continuam só com as 7 categorias de `CategoriaBase` acima — por
 * isso é um tipo (e uma lista) à parte, em vez de estender `CategoriaBase` globalmente.
 */
export type CategoriaComissaoTecnica = "profissional" | CategoriaBase;

export interface CategoriaComissaoTecnicaInfo {
  value: CategoriaComissaoTecnica;
  label: string;
}

export const CATEGORIAS_COMISSAO_TECNICA: CategoriaComissaoTecnicaInfo[] = [
  { value: "profissional", label: "Profissional" },
  ...CATEGORIAS_BASE,
];

export function ehCategoriaComissaoTecnicaValida(valor: string): valor is CategoriaComissaoTecnica {
  return valor === "profissional" || ehCategoriaBaseValida(valor);
}

export function categoriaComissaoTecnicaLabel(valor: string): string {
  return CATEGORIAS_COMISSAO_TECNICA.find((c) => c.value === valor)?.label ?? valor;
}

/** Mesma ideia de `CATEGORIA_BASE_COR`, mais "profissional" — usa `dourado` (ver `lib/theme.ts`),
 * o acento de destaque já usado no sistema, pra marcar visualmente o bloco "Profissional" como
 * algo diferente do degradê de idade da Base, sem introduzir uma cor nova fora da paleta. */
export const CATEGORIA_COMISSAO_TECNICA_COR: Record<CategoriaComissaoTecnica, string> = {
  profissional: "#B98F1E",
  ...CATEGORIA_BASE_COR,
};

/**
 * Categoria do atleta, unificada em 28/10/2026 (ver docs/superpowers/specs/
 * 2026-10-28-unificacao-atletas-design.md) — mesmo formato de `CategoriaComissaoTecnica` (texto
 * igual, "profissional" + as 7 de `CategoriaBase`), mas usada como valor ESCALAR em
 * `atletas.categoria` (um atleta nunca está em duas categorias ao mesmo tempo), nunca como lista —
 * diferente de `comissao_tecnica.categorias`, que é array. Por isso os filtros no código usam `=`
 * em vez de `.includes()`.
 */
export type CategoriaAtleta = CategoriaComissaoTecnica;

export type CategoriaAtletaInfo = CategoriaComissaoTecnicaInfo;

export const CATEGORIAS_ATLETA: CategoriaAtletaInfo[] = CATEGORIAS_COMISSAO_TECNICA;

export const ehCategoriaAtletaValida = ehCategoriaComissaoTecnicaValida;

export const categoriaAtletaLabel = categoriaComissaoTecnicaLabel;

/** Mesma ideia de `CATEGORIA_COMISSAO_TECNICA_COR` — cor de fundo pra tag de categoria na
 * listagem/filtro de Atletas (não é a cor da borda de Classificação G1/G2/G3, que é outra coisa:
 * ver `AtletaClassificacao`/`lib/futebol/classificacao-atleta.ts`). */
export const CATEGORIA_ATLETA_COR: Record<CategoriaAtleta, string> = CATEGORIA_COMISSAO_TECNICA_COR;
