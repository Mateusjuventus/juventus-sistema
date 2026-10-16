import type { AtletaContratoRow, AtletaRow, ComissaoTecnicaRow } from "../supabase/types";

/**
 * Rótulo do tipo de pagamento de um atleta do Profissional na aba "Geral" do Financeiro — mesmo
 * espírito de `tipoPagamentoAtletaBase` (`lib/futebol/financeiro-base.ts`), mas só com as opções do
 * Profissional (sem "Iniciação", que só existe na Base). Quem não tem `tipo_contrato` definido (ou
 * está com "Formação", ainda sem contrato formalizado) aparece como "Sem contrato".
 */
export function tipoPagamentoAtletaProfissional(tipoContrato: AtletaRow["tipo_contrato"]): string {
  switch (tipoContrato) {
    case "definitivo":
      return "Salário";
    case "amador":
      return "Ajuda de custo";
    case "emprestimo":
      return "Empréstimo";
    default:
      return "Sem contrato";
  }
}

/** Total de um contrato — soma das 5 rubricas (Salário CTPS, Direito de Imagem, Bonificação,
 * Auxílio Moradia, Outros). Mesma conta usada na Base (`lib/futebol/financeiro-base.ts`). */
function totalContrato(
  c: Pick<
    AtletaContratoRow,
    "salario_ctps" | "direito_imagem" | "bonificacao" | "auxilio_moradia" | "outros"
  >,
): number {
  return c.salario_ctps + c.direito_imagem + c.bonificacao + c.auxilio_moradia + c.outros;
}

/** Monta um mapa atleta_id -> total do contrato vigente, a partir da lista de contratos vigentes
 * (já filtrados por `vigente = true` na query, no máximo um por atleta). */
export function mapaContratoVigentePorAtleta(contratosVigentes: AtletaContratoRow[]): Map<string, number> {
  return new Map(contratosVigentes.map((c) => [c.atleta_id, totalContrato(c)]));
}

/**
 * Custo "mensal" de um atleta do Profissional pra fins da aba "Geral" — o total do contrato
 * vigente (soma das 5 rubricas), ou 0 quando não há contrato cadastrado. Diferente da Base, não há
 * fallback (`valor_ajuda_custo` não existe no Profissional) — ver docs/superpowers/specs/
 * 2026-10-16-financeiro-contrato-design.md.
 */
export function custoAtletaProfissional(
  atleta: Pick<AtletaRow, "id">,
  contratoPorAtleta: Map<string, number>,
): number {
  return contratoPorAtleta.get(atleta.id) ?? 0;
}

export interface GeralProfissionalResumo {
  custoComissao: number;
  custoAtletas: number;
  totalGeral: number;
}

/**
 * Cálculo da aba "Geral" de `/financeiro` (Profissional) e do PDF que a espelha — paralelo a
 * `calcularGeralBase` (Base), mas mais simples: sem fallback de valor (não existe
 * `valor_ajuda_custo` no Profissional), sem quebra "por categoria" (o Profissional não tem
 * categorias de idade) e sem despesas avulsas (ficam só na aba "Jogos", por decisão explícita — ver
 * a spec). Ver docs/superpowers/specs/2026-10-16-financeiro-contrato-design.md.
 *
 * `comissao` e `atletas` devem vir com todo mundo cadastrado (mesmo sem salário/contrato) — a soma
 * ignora quem está com o valor nulo/ausente.
 */
export function calcularGeralProfissional(
  comissao: ComissaoTecnicaRow[],
  atletas: AtletaRow[],
  contratosVigentes: AtletaContratoRow[],
): GeralProfissionalResumo {
  const contratoPorAtleta = mapaContratoVigentePorAtleta(contratosVigentes);

  const custoComissao = comissao.reduce((soma, c) => soma + (c.valor_salario ?? 0), 0);
  const custoAtletas = atletas.reduce(
    (soma, a) => soma + custoAtletaProfissional(a, contratoPorAtleta),
    0,
  );

  return { custoComissao, custoAtletas, totalGeral: custoComissao + custoAtletas };
}
