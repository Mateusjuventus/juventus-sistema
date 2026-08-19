import type { CaptacaoBaseRow, CaptacaoStatus } from "@/lib/supabase/types";

/**
 * Regras puras da Captação/Avaliação (ver docs/superpowers/specs/2026-08-19-captacao-base-design.md
 * e 0076_captacao_alojamento_base.sql) — rótulos/cores do status, e as contagens que alimentam o
 * dashboard (`/base/captacao/dashboard`). Nada aqui toca banco, por isso é testável isoladamente.
 */

export const CAPTACAO_STATUS_OPTIONS: { value: CaptacaoStatus; label: string }[] = [
  { value: "avaliacao", label: "Em avaliação" },
  { value: "aprovado", label: "Aprovado" },
  { value: "dispensado", label: "Dispensado" },
  { value: "nao_compareceu", label: "Não compareceu" },
];

export const CAPTACAO_STATUS_LABEL: Record<CaptacaoStatus, string> = {
  avaliacao: "Em avaliação",
  aprovado: "Aprovado",
  dispensado: "Dispensado",
  nao_compareceu: "Não compareceu",
};

/** Cor da tag/badge de cada status — mesmo espírito das cores por categoria de posição já usadas
 * na Convocação (ver lib/futebol/categoria-posicao.ts). */
export const CAPTACAO_STATUS_COR: Record<CaptacaoStatus, string> = {
  avaliacao: "bg-amber-100 text-amber-800",
  aprovado: "bg-emerald-100 text-emerald-800",
  dispensado: "bg-neutral-100 text-neutral-500",
  nao_compareceu: "bg-red-100 text-red-700",
};

export function captacaoStatusLabel(status: CaptacaoStatus): string {
  return CAPTACAO_STATUS_LABEL[status];
}

export function corCaptacaoStatus(status: CaptacaoStatus): string {
  return CAPTACAO_STATUS_COR[status];
}

/** Quantos candidatos existem em cada status — base dos cartões do dashboard. Sempre devolve as 4
 * chaves, mesmo com 0, pra o dashboard não precisar tratar "undefined" na hora de exibir. */
export function contarPorStatus(candidatos: Pick<CaptacaoBaseRow, "status">[]): Record<CaptacaoStatus, number> {
  const contagem: Record<CaptacaoStatus, number> = {
    avaliacao: 0,
    aprovado: 0,
    dispensado: 0,
    nao_compareceu: 0,
  };
  for (const c of candidatos) contagem[c.status] += 1;
  return contagem;
}

/** Quantos candidatos vieram de cada UF — alimenta o mapa do Brasil do dashboard. Ignora quem não
 * tem UF preenchida (o campo é opcional na Captação). */
export function contarPorUf(candidatos: Pick<CaptacaoBaseRow, "uf">[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const c of candidatos) {
    const uf = (c.uf ?? "").trim().toUpperCase();
    if (!uf) continue;
    contagem[uf] = (contagem[uf] ?? 0) + 1;
  }
  return contagem;
}

/** Taxa de aprovação (aprovados / total decidido), usada como um dos cartões do dashboard. Ignora
 * quem ainda está "em avaliação" — decisão pendente não deveria contar contra nem a favor da taxa.
 * Devolve `null` quando ninguém foi decidido ainda (evita divisão por zero e um "0%" enganoso). */
export function taxaAprovacao(contagem: Record<CaptacaoStatus, number>): number | null {
  const decididos = contagem.aprovado + contagem.dispensado + contagem.nao_compareceu;
  if (decididos === 0) return null;
  return Math.round((contagem.aprovado / decididos) * 100);
}
