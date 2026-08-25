import type { AtletaClassificacao } from "@/lib/supabase/types";

/**
 * Classificação G1/G2/G3 do atleta da Base (ver docs/superpowers/specs/
 * 2026-08-25-classificacao-dispensa-atleta-base-design.md) — rótulo livre, sem significado fixo no
 * sistema; só o rótulo e a cor de borda (verde/amarelo/laranja) são exibidos, mesmo espírito de
 * `lib/futebol/captacao.ts` (`captacaoStatusLabel`/`corCaptacaoStatus`).
 */

export const ATLETA_CLASSIFICACAO_OPTIONS: { value: AtletaClassificacao; label: string }[] = [
  { value: "g1", label: "G1" },
  { value: "g2", label: "G2" },
  { value: "g3", label: "G3" },
];

const CLASSIFICACAO_LABEL: Record<AtletaClassificacao, string> = {
  g1: "G1",
  g2: "G2",
  g3: "G3",
};

/** Classe da borda esquerda do card — mesma receita de `app/competicoes/[id]/adversarios/page.tsx`
 * (`.card` + `border-l-4 border-l-<cor>`), não um componente novo. */
const CLASSIFICACAO_BORDA: Record<AtletaClassificacao, string> = {
  g1: "border-l-4 border-l-green-500",
  g2: "border-l-4 border-l-yellow-400",
  g3: "border-l-4 border-l-orange-500",
};

const CLASSIFICACAO_BADGE: Record<AtletaClassificacao, string> = {
  g1: "bg-green-100 text-green-800",
  g2: "bg-yellow-100 text-yellow-800",
  g3: "bg-orange-100 text-orange-800",
};

export function classificacaoAtletaLabel(classificacao: AtletaClassificacao | null | undefined): string | null {
  return classificacao ? CLASSIFICACAO_LABEL[classificacao] : null;
}

/** Classe da borda esquerda do card do atleta — string vazia quando não classificado (o card segue
 * com a borda neutra padrão do `.card`, sem destaque nenhum). */
export function bordaClassificacaoAtleta(classificacao: AtletaClassificacao | null | undefined): string {
  return classificacao ? CLASSIFICACAO_BORDA[classificacao] : "";
}

export function badgeClassificacaoAtleta(classificacao: AtletaClassificacao): string {
  return CLASSIFICACAO_BADGE[classificacao];
}
