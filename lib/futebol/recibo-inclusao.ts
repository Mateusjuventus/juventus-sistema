/**
 * Decide se uma pessoa entra no Recibo de Pagamento ao salvar (`saveRecibo`/`saveReciboBase`),
 * reconciliando o checkbox "Incluir" (que pode estar desatualizado, se a tela ficou aberta um tempo)
 * com a situação de vaga confirmada de verdade, consultada fresca no momento do salvamento — ver o
 * comentário longo em cima de `saveRecibo` (app/jogos/[id]/operacao-actions.ts) e
 * docs/superpowers/specs/2026-09-12-recibo-automatico-vagas-design.md.
 */
export function decidirInclusaoRecibo(opts: {
  /** Se o checkbox "Incluir" veio marcado nesse envio do formulário. */
  marcado: boolean;
  /** Se a pessoa já estava com vaga confirmada quando a tela foi carregada (campo oculto por
   * linha). */
  vagaAoCarregar: boolean;
  /** Se a pessoa está com vaga confirmada agora, numa consulta feita no momento do salvamento. */
  temVagaAgora: boolean;
}): boolean {
  const { marcado, vagaAoCarregar, temVagaAgora } = opts;

  // Perdeu a vaga depois que a tela abriu: nunca inclui, mesmo que o checkbox ainda apareça
  // marcado (mesma regra de sempre — sem vaga, sem recibo automático, mesmo que já estivesse pago).
  if (vagaAoCarregar && !temVagaAgora) return false;

  // Confirmou vaga depois que a tela abriu: inclui mesmo desmarcado — o usuário nunca teve chance
  // de decidir sobre essa pessoa neste salvamento específico.
  if (!vagaAoCarregar && temVagaAgora) return true;

  // Nos demais casos (vaga não mudou desde o carregamento, ou nunca teve vaga), o checkbox manda.
  return marcado;
}
