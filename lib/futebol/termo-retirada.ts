import type { TermoRetiradaItemRow, TermoRetiradaTipo } from "@/lib/supabase/types";

/**
 * Regras do Termo de Responsabilidade — Retirada de Materiais (ver
 * docs/superpowers/specs/2026-08-11-termos-retirada-design.md). Funções puras, sem Supabase.
 */

export const TERMO_TIPO_LABEL: Record<TermoRetiradaTipo, string> = {
  emprestimo: "Empréstimo (com devolução)",
  definitiva: "Retirada definitiva",
};

/**
 * Texto padrão de responsabilidade, por tipo. É só o PONTO DE PARTIDA: o texto fica editável no
 * formulário e é gravado junto do termo, então mexer aqui não muda nenhum documento já assinado.
 * A redação segue o mesmo espírito da ficha de Saída do Estoque (lib/pdf/estoque-ficha-document.tsx),
 * que já é o formulário impresso usado pelo clube.
 */
export const TEXTO_PADRAO: Record<TermoRetiradaTipo, string> = {
  emprestimo: [
    "Declaro que recebi do Clube, a título de empréstimo, os materiais relacionados neste termo, comprometendo-me a utilizá-los exclusivamente no exercício das minhas atividades profissionais.",
    "Comprometo-me a zelar pela conservação dos itens recebidos e a devolvê-los em perfeitas condições de uso, ressalvado o desgaste natural decorrente da utilização regular, no prazo previsto neste termo, no ato da rescisão do meu contrato ou sempre que solicitado pelo Clube.",
    "Estou ciente de que a não devolução dos itens, ou a devolução em condições incompatíveis com o desgaste natural de uso, poderá acarretar o ressarcimento dos respectivos valores, conforme os valores indicados neste termo, observada a legislação vigente.",
  ].join("\n\n"),
  definitiva: [
    "Declaro que recebi do Clube, em caráter definitivo, os materiais relacionados neste termo, para utilização nas atividades a que se destinam.",
    "Declaro, ainda, que a presente retirada foi devidamente conferida e registrada, sendo de minha responsabilidade a correta destinação dos materiais, em conformidade com os procedimentos internos do Clube.",
    "Os valores indicados neste termo servem como referência do material retirado, para fins de controle patrimonial.",
  ].join("\n\n"),
};

export interface ItemParaTotal {
  quantidade: number;
  valorUnitario: number | null;
}

/** Total de um item — null quando não tem valor informado (item sem valor não soma). */
export function totalDoItem(item: ItemParaTotal): number | null {
  if (item.valorUnitario === null) return null;
  return item.quantidade * item.valorUnitario;
}

/** Total geral do termo: soma só os itens que têm valor informado. */
export function totalDoTermo(itens: ItemParaTotal[]): number {
  return itens.reduce((soma, item) => soma + (totalDoItem(item) ?? 0), 0);
}

export function itensParaTotal(itens: Pick<TermoRetiradaItemRow, "quantidade" | "valor_unitario">[]): ItemParaTotal[] {
  return itens.map((i) => ({ quantidade: i.quantidade, valorUnitario: i.valor_unitario }));
}

export type TermoSituacao = "devolvido" | "em_aberto" | "atrasado" | "definitiva";

/**
 * Situação do termo pra lista e alertas: empréstimo devolvido, em aberto, ou ATRASADO quando a
 * previsão de devolução já passou. Retirada definitiva não tem devolução a cobrar.
 */
export function situacaoDoTermo(
  termo: { tipo: TermoRetiradaTipo; previsao_devolucao: string | null; devolvido_em: string | null },
  hojeStr: string,
): TermoSituacao {
  if (termo.tipo === "definitiva") return "definitiva";
  if (termo.devolvido_em) return "devolvido";
  if (termo.previsao_devolucao && termo.previsao_devolucao < hojeStr) return "atrasado";
  return "em_aberto";
}

export const SITUACAO_LABEL: Record<TermoSituacao, string> = {
  devolvido: "Devolvido",
  em_aberto: "Em aberto",
  atrasado: "Devolução atrasada",
  definitiva: "Definitiva",
};

/** Próximo número sequencial do termo — a numeração é única no sistema inteiro (diferente das
 * fichas de Estoque, que numeram por categoria). */
export function proximoNumero(numeroAtualMaximo: number | null): number {
  return (numeroAtualMaximo ?? 0) + 1;
}

export function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
