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

/** Cor do anel/borda ao redor da foto do atleta no Campograma (ver docs/superpowers/specs/
 * 2026-08-26-campograma-foto-classificacao-design.md) — mesmas cores de `CLASSIFICACAO_BORDA`, mas
 * como borda nos 4 lados (a foto é retangular, não um card com faixa lateral). Sem classificação
 * usa uma borda neutra, só pra dar acabamento na foto — não é "cor de não classificado". */
const CLASSIFICACAO_ANEL: Record<AtletaClassificacao, string> = {
  g1: "border-green-500",
  g2: "border-yellow-400",
  g3: "border-orange-500",
};
const ANEL_NEUTRO = "border-neutral-300";

/** Mesmas cores acima, em hexadecimal — usado pelo PDF do Campograma (`@react-pdf/renderer` não lê
 * classe Tailwind, só estilo inline). */
export const CLASSIFICACAO_ANEL_HEX: Record<AtletaClassificacao, string> = {
  g1: "#22c55e",
  g2: "#facc15",
  g3: "#f97316",
};
export const ANEL_NEUTRO_HEX = "#d4d4d4";

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

/** Classe Tailwind da borda ao redor da foto do atleta no Campograma — ver `CLASSIFICACAO_ANEL`. */
export function anelClassificacaoAtleta(classificacao: AtletaClassificacao | null | undefined): string {
  return classificacao ? CLASSIFICACAO_ANEL[classificacao] : ANEL_NEUTRO;
}

/** Mesma cor de `anelClassificacaoAtleta`, em hexadecimal — usado pelo PDF do Campograma. */
export function corHexAnelClassificacaoAtleta(classificacao: AtletaClassificacao | null | undefined): string {
  return classificacao ? CLASSIFICACAO_ANEL_HEX[classificacao] : ANEL_NEUTRO_HEX;
}
