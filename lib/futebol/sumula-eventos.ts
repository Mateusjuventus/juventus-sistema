import type { SumulaEventoTipo, SumulaTempo } from "@/lib/supabase/types";

/**
 * Labels e estilos dos eventos da Súmula (gol, cartão amarelo, cartão vermelho, substituição) —
 * ver spec `docs/superpowers/specs/2026-08-04-sumula-design.md`. Compartilhado entre Profissional
 * e Base, já que os tipos de evento são os mesmos nos dois departamentos.
 */

export const SUMULA_EVENTO_TIPO_OPTIONS: { value: SumulaEventoTipo; label: string }[] = [
  { value: "gol", label: "Gol" },
  { value: "cartao_amarelo", label: "Cartão Amarelo" },
  { value: "cartao_vermelho", label: "Cartão Vermelho" },
  { value: "substituicao", label: "Substituição" },
];

export const SUMULA_EVENTO_TIPO_LABEL: Record<SumulaEventoTipo, string> = {
  gol: "Gol",
  cartao_amarelo: "Cartão Amarelo",
  cartao_vermelho: "Cartão Vermelho",
  substituicao: "Substituição",
};

/** Ícone simples (emoji) pra identificar o tipo de evento de relance na lista. */
export const SUMULA_EVENTO_TIPO_ICONE: Record<SumulaEventoTipo, string> = {
  gol: "⚽",
  cartao_amarelo: "🟨",
  cartao_vermelho: "🟥",
  substituicao: "🔄",
};

/** "terceiro" só se aplica a jogos da Base vinculados a uma competição com `numero_tempos = 3`
 * (ver docs/superpowers/specs/2026-10-21-competicoes-formato-partida-design.md) — no Profissional
 * nunca é oferecido, já que lá a súmula sempre tem só 2 tempos. */
export const SUMULA_TEMPO_OPTIONS: { value: SumulaTempo; label: string }[] = [
  { value: "primeiro", label: "1º Tempo" },
  { value: "segundo", label: "2º Tempo" },
  { value: "terceiro", label: "3º Tempo" },
];

export const SUMULA_TEMPO_LABEL: Record<SumulaTempo, string> = {
  primeiro: "1º Tempo",
  segundo: "2º Tempo",
  terceiro: "3º Tempo",
};
