/**
 * Média de ingressos atendidos por pessoa = total atendido ÷ todas as solicitações lançadas para o
 * jogo, mesmo as que ainda estão com 0 ingresso atendido — reflete a média real considerando todo
 * mundo que pediu (em vez de só quem já recebeu algo). `null` quando não há nenhuma solicitação
 * lançada ainda (evita divisão por zero) — usado tanto na tela de Ingressos quanto no PDF gerado,
 * em ambos os departamentos.
 */
export function calcularMediaIngressosPorPessoa(totalAtendido: number, totalSolicitacoes: number): number | null {
  if (totalSolicitacoes === 0) return null;
  return totalAtendido / totalSolicitacoes;
}

/** Formata a média com 1 casa decimal, no padrão brasileiro (vírgula) — "—" quando não há dado. */
export function formatarMediaIngressos(media: number | null): string {
  if (media === null) return "—";
  return media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
