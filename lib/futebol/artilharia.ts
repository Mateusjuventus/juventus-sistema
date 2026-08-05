/**
 * Artilharia calculada com dados nossos — conta os gols já lançados na Súmula de cada jogo (só
 * `sumula_eventos.tipo = 'gol'` com `atleta_id` preenchido, ou seja, gols do próprio Juventus; um
 * gol do adversário registrado via `nome_adversario` nunca entra aqui). Substitui a artilharia ao
 * vivo da FPF, que dependia de um domínio bloqueado pro nosso servidor (ver
 * docs/superpowers/specs/2026-08-04-integracao-fpf-design.md).
 */

export interface ArtilheiroContagem {
  atletaId: string;
  gols: number;
}

/** Agrupa e ordena por número de gols (desc) — em empate, mantém a ordem de primeira aparição
 * (estável), sem critério de desempate adicional. */
export function calcularArtilheiros(golsPorAtleta: { atletaId: string | null }[]): ArtilheiroContagem[] {
  const contagem = new Map<string, number>();
  for (const gol of golsPorAtleta) {
    if (!gol.atletaId) continue;
    contagem.set(gol.atletaId, (contagem.get(gol.atletaId) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([atletaId, gols]) => ({ atletaId, gols }))
    .sort((a, b) => b.gols - a.gols);
}
