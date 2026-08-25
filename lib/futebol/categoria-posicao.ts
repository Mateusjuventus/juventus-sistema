import type { AtletaPosicao, CategoriaPosicao } from "@/lib/supabase/types";

/**
 * Classificação fixa de posição (Goleiro/Zagueiro/Lateral/Meia/Atacante), usada pra gerar a tag
 * curta e colorida (GOL/ZAG/LAT/MEI/ATA) na grade de Convocação — ver spec
 * `docs/superpowers/specs/2026-08-04-convocacao-redesign-design.md` — e pra agrupar o Campograma
 * (`lib/futebol/campograma.ts`). Até 25/08 era um campo cadastrado à parte ("Categoria de
 * posição"); desde a spec `2026-08-25-atleta-contrato-posicao-cpf-design.md` deixou de existir
 * como campo — é calculada a partir da posição única de 9 valores (`AtletaPosicao`), ver
 * `categoriaDaPosicao` abaixo.
 */

/** Mapeia cada uma das 9 posições fixas pro seu grupo de tag/cor. Volante entra em MEI, as duas
 * Pontas entram em ATA — decisão do Mateus, mantendo as mesmas 5 cores/tags de sempre na
 * Convocação e no Campograma. */
const CATEGORIA_DA_POSICAO: Record<AtletaPosicao, CategoriaPosicao> = {
  Goleiro: "goleiro",
  Zagueiro: "zagueiro",
  "Lateral Direito": "lateral",
  "Lateral Esquerdo": "lateral",
  Volante: "meia",
  Meia: "meia",
  Atacante: "atacante",
  "Ponta Direita": "atacante",
  "Ponta Esquerda": "atacante",
};

/** Calcula o grupo (GOL/ZAG/LAT/MEI/ATA) a partir da posição cadastrada. `null` só acontece pra
 * cadastros muito antigos que por algum motivo ainda não tenham uma das 9 posições válidas. */
export function categoriaDaPosicao(posicao: string | null | undefined): CategoriaPosicao | null {
  if (!posicao) return null;
  return CATEGORIA_DA_POSICAO[posicao as AtletaPosicao] ?? null;
}

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
