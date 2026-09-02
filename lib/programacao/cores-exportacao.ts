import type { ProgramacaoAtividadeTipo } from "@/lib/supabase/types";
import { corHexAtividade } from "./tipo-atividade";

/**
 * Paleta de cores da EXPORTAÇÃO da Programação Semanal (PDF/JPG por categoria e Programação Geral —
 * ver docs/superpowers/specs/2026-09-02-programacao-copiar-dia-layout-geral-design.md, Parte 2/3),
 * INDEPENDENTE de `TIPO_COR_HEX` (`./tipo-atividade`), que continua sendo só a cor da grade em
 * tela. Extraída por amostragem direta da foto de referência do Mateus (WhatsApp Image 2026-08-29
 * at 21.33.16.jpeg).
 *
 * Mora em `lib/programacao/` (não em `lib/pdf/`) de propósito: é consumida por
 * `lib/programacao/microciclo-data.ts` e `lib/programacao/programacao-geral-data.ts` (nenhum dos
 * dois tem qualquer outra razão pra depender de `@react-pdf/renderer`), e reaproveitada pelos
 * componentes visuais em `lib/pdf/programacao-export-shared.tsx` (PDF) e
 * `lib/posters/poster-imagem-shared.tsx` (JPG).
 */

export const CORES_EXPORT = {
  cabecalho: "#1E3A5F",
  folgaBg: "#f5f5f5",
  folgaText: "#a3a3a3",
};

const EXPORT_COR_POR_TIPO: Partial<Record<ProgramacaoAtividadeTipo, { bg: string; text: string }>> = {
  apresentacao: { bg: "#2B5F99", text: "#FFFFFF" },
  cafe_manha: { bg: "#4A90D9", text: "#FFFFFF" },
  video: { bg: "#8EE685", text: "#1F1F1F" },
  academia: { bg: "#FDE68A", text: "#1F1F1F" },
  treinamento: { bg: "#FFFFFF", text: "#1F1F1F" },
};

/** Cor de um tipo de atividade NA EXPORTAÇÃO (não na grade em tela — ver `corHexAtividade` pra
 * isso). Os 6 tipos sem exemplo no modelo impresso do Mateus (Programação, Refeição, Transporte,
 * Jogo Treino, Imprensa, Regenerativo) caem no fallback de `corHexAtividade` — o sistema precisa
 * continuar dando conta de qualquer um dos 12 tipos em qualquer categoria, mesmo os que a foto de
 * referência não exemplifica. */
export function corExportacaoAtividade(tipo: ProgramacaoAtividadeTipo): { bg: string; text: string } {
  return EXPORT_COR_POR_TIPO[tipo] ?? corHexAtividade(tipo);
}
