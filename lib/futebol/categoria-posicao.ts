import type { CategoriaPosicao } from "@/lib/supabase/types";

/**
 * Classificação fixa de posição (Goleiro/Zagueiro/Lateral/Meia/Atacante), usada pra gerar a tag
 * curta e colorida (GOL/ZAG/LAT/MEI/ATA) na grade de Convocação — ver spec
 * `docs/superpowers/specs/2026-08-04-convocacao-redesign-design.md`. Diferente do campo de texto
 * livre "posicao" (mais descritivo, usado em listagens/PDFs — ver `lib/futebol/ordem-posicao.ts`
 * pra ordenação tática por palavra-chave), este é um campo cadastrado (enum fixo), não inferido.
 */

export const CATEGORIA_POSICAO_OPTIONS: { value: CategoriaPosicao; label: string }[] = [
  { value: "goleiro", label: "Goleiro" },
  { value: "zagueiro", label: "Zagueiro" },
  { value: "lateral", label: "Lateral" },
  { value: "meia", label: "Meia" },
  { value: "atacante", label: "Atacante" },
];

/** Sigla curta (3 letras) exibida na tag da grade de Convocação. */
export const CATEGORIA_POSICAO_SIGLA: Record<CategoriaPosicao, string> = {
  goleiro: "GOL",
  zagueiro: "ZAG",
  lateral: "LAT",
  meia: "MEI",
  atacante: "ATA",
};

/** Classes Tailwind (fundo + texto) da tag, uma cor por categoria — mesmo espírito das cores por
 * módulo já usadas na tela inicial. Atletas sem categoria cadastrada (`null`, ex.: cadastros
 * antigos que a migração não conseguiu classificar por palavra-chave) usam a cor "desconhecida". */
export const CATEGORIA_POSICAO_COR: Record<CategoriaPosicao, string> = {
  goleiro: "bg-amber-100 text-amber-800",
  zagueiro: "bg-blue-100 text-blue-800",
  lateral: "bg-teal-100 text-teal-800",
  meia: "bg-purple-100 text-purple-800",
  atacante: "bg-red-100 text-red-800",
};

const COR_DESCONHECIDA = "bg-neutral-100 text-neutral-500";
const SIGLA_DESCONHECIDA = "—";

/** Sigla pra exibir na tag — "—" quando o atleta ainda não tem categoria cadastrada. */
export function siglaCategoriaPosicao(categoria: CategoriaPosicao | null): string {
  return categoria ? CATEGORIA_POSICAO_SIGLA[categoria] : SIGLA_DESCONHECIDA;
}

/** Classes de cor da tag — cinza quando o atleta ainda não tem categoria cadastrada. */
export function corCategoriaPosicao(categoria: CategoriaPosicao | null): string {
  return categoria ? CATEGORIA_POSICAO_COR[categoria] : COR_DESCONHECIDA;
}
