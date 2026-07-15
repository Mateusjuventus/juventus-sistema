/**
 * Modelo fixo dos itens do checklist de preparação de jogo — a lista muda dependendo se o
 * Juventus é mandante (jogo em casa) ou visitante (jogo fora). Usado só uma vez, pra popular a
 * tabela checklist_jogo_itens na primeira vez que a aba "Checklist" de um jogo é aberta (ver
 * app/jogos/[id]/checklist/actions.ts). Não é uma tabela editável — pra mudar os itens padrão é
 * preciso editar este arquivo.
 *
 * O item "Documentação" do pedido original virou dois itens separados (Súmula e Carteirinha), pra
 * poder marcar cada um como concluído de forma independente.
 */
export const CHECKLIST_TEMPLATE_CASA: string[] = [
  "Policiamento",
  "Documentação – Súmula",
  "Documentação – Carteirinha",
  "Hospedagem",
  "Transporte",
  "Alimentação",
  "Segurança",
  "Credenciamento Atletas, Comissão Técnica e Diretoria",
  "2 Ambulâncias (UTI e Remoção)",
  "Escolta",
  "Sonorização",
  "Credenciamento Staff",
  "Orientador",
  "Controlador de acesso",
  "Gandulas e Maqueiros (Uniformização Zeca)",
  "Lanche para o Staff (Janaina/Empresa)",
  "Recibos",
  "Limpeza",
  "Bombeiro Civil",
  "Bar e Lanchonete",
  "Stewards",
  "Separação dos coletes e bancos",
  "Pulseiras de identificação",
  "Súmula Pro Soccer",
  "Informativo de Jogo",
];

export const CHECKLIST_TEMPLATE_FORA: string[] = [
  "Hospedagem",
  "Transporte",
  "Alimentação",
  "Credenciamento Atletas, Comissão Técnica e Diretoria",
  "Escolta",
  "Documentação – Súmula",
  "Documentação – Carteirinha",
  "Informativo de Viagem",
  "Súmula Pro Soccer",
];

export function checklistTemplateParaJogo(mandante: boolean): string[] {
  return mandante ? CHECKLIST_TEMPLATE_CASA : CHECKLIST_TEMPLATE_FORA;
}
