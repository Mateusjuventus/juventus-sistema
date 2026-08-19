// Import relativo (não "@/...") de propósito: é o único import "de verdade" (não só de tipo) que
// este arquivo faz de outro módulo de lib/, e o alias "@/" não é resolvido pelo vitest (só o
// Next.js resolve — ver tsconfig.json). Os outros imports deste arquivo são só `import type`, que o
// esbuild elimina antes de precisar resolver o caminho, por isso nunca deu problema até agora.
import { TODAS_CATEGORIAS_BASE, type CategoriaBase } from "../auth/categorias-base";
import type { CaptacaoBaseRow, CaptacaoStatus } from "@/lib/supabase/types";

/**
 * Regras puras da Captação/Avaliação (ver docs/superpowers/specs/
 * 2026-08-19-captacao-atletas-separacao-design.md e 0077_captacao_atletas_separacao.sql) — rótulos/
 * cores do status, e as contagens que alimentam o dashboard (`/base/captacao/dashboard`). Nada aqui
 * toca banco, por isso é testável isoladamente.
 *
 * "inscricao" (quem chegou pelo link público e ainda não foi aprovado pra entrar em avaliação) fica
 * FORA de `CAPTACAO_STATUS_OPTIONS`/`contarPorStatus`/`taxaAprovacao` de propósito — esses três
 * continuam representando só os 4 status "decididos" (o funil pedido originalmente). A fila de
 * inscrições tem tela própria (`/base/captacao/aprovacoes`) e sua própria contagem
 * (`contarInscricoesPendentes`).
 */

type CaptacaoStatusDecidido = Exclude<CaptacaoStatus, "inscricao">;

export const CAPTACAO_STATUS_OPTIONS: { value: CaptacaoStatusDecidido; label: string }[] = [
  { value: "avaliacao", label: "Em avaliação" },
  { value: "aprovado", label: "Aprovado" },
  { value: "dispensado", label: "Dispensado" },
  { value: "nao_compareceu", label: "Não compareceu" },
];

export const CAPTACAO_STATUS_LABEL: Record<CaptacaoStatus, string> = {
  inscricao: "Inscrição enviada",
  avaliacao: "Em avaliação",
  aprovado: "Aprovado",
  dispensado: "Dispensado",
  nao_compareceu: "Não compareceu",
};

/** Cor da tag/badge de cada status — mesmo espírito das cores por categoria de posição já usadas
 * na Convocação (ver lib/futebol/categoria-posicao.ts). */
export const CAPTACAO_STATUS_COR: Record<CaptacaoStatus, string> = {
  inscricao: "bg-blue-100 text-blue-800",
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

/** Quantos candidatos existem em cada status "decidido" (fora "inscricao") — base dos cartões do
 * dashboard. Sempre devolve as 4 chaves, mesmo com 0, pra o dashboard não precisar tratar
 * "undefined" na hora de exibir. */
export function contarPorStatus(
  candidatos: Pick<CaptacaoBaseRow, "status">[],
): Record<CaptacaoStatusDecidido, number> {
  const contagem: Record<CaptacaoStatusDecidido, number> = {
    avaliacao: 0,
    aprovado: 0,
    dispensado: 0,
    nao_compareceu: 0,
  };
  for (const c of candidatos) {
    if (c.status === "inscricao") continue;
    contagem[c.status] += 1;
  }
  return contagem;
}

/** Quantos candidatos estão na fila de "Aprovações" (inscritos pelo link público, aguardando o
 * Mateus aprovar e informar a Data de Início) — ver `/base/captacao/aprovacoes`. */
export function contarInscricoesPendentes(candidatos: Pick<CaptacaoBaseRow, "status">[]): number {
  return candidatos.filter((c) => c.status === "inscricao").length;
}

/** Quantos candidatos existem por categoria × status "decidido" — tabela do dashboard pedida em
 * 19/08 ("tipo uma tabela principal de quantos atletas em avaliação, dispensados, aprovados por
 * categoria"). Sempre devolve as 7 categorias (Sub20 a Sub11), mesmo com tudo zerado, pelo mesmo
 * motivo de `contarPorStatus`. Ignora quem não tem categoria preenchida (a Captação não exige) e
 * "inscricao" (só os 4 status decididos entram, igual `contarPorStatus`). */
export function contarPorCategoriaEStatus(
  candidatos: Pick<CaptacaoBaseRow, "status" | "categoria">[],
): Record<CategoriaBase, Record<CaptacaoStatusDecidido, number>> {
  const contagem = {} as Record<CategoriaBase, Record<CaptacaoStatusDecidido, number>>;
  for (const categoria of TODAS_CATEGORIAS_BASE) {
    contagem[categoria] = { avaliacao: 0, aprovado: 0, dispensado: 0, nao_compareceu: 0 };
  }
  for (const c of candidatos) {
    if (c.status === "inscricao" || !c.categoria) continue;
    contagem[c.categoria][c.status] += 1;
  }
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
export function taxaAprovacao(contagem: Record<CaptacaoStatusDecidido, number>): number | null {
  const decididos = contagem.aprovado + contagem.dispensado + contagem.nao_compareceu;
  if (decididos === 0) return null;
  return Math.round((contagem.aprovado / decididos) * 100);
}
