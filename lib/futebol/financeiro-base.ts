import { CATEGORIAS_BASE, type CategoriaBase } from "../auth/categorias-base";
import type { AtletaBaseRow, ComissaoTecnicaBaseRow, DespesaAvulsaBaseComCategoriaRow } from "../supabase/types";

/** Valor "efetivo" de uma despesa avulsa da Base — o que já foi de fato pago, ou o previsto
 * enquanto isso não acontece. Mesmo raciocínio usado em `gastos_jogo`/`despesas_avulsas`. */
export function valorDespesaBase(
  d: Pick<DespesaAvulsaBaseComCategoriaRow, "valor_efetuado" | "valor_previsto">,
): number {
  return d.valor_efetuado ?? d.valor_previsto;
}

export interface LinhaCategoriaGeralBase {
  key: CategoriaBase | "geral";
  label: string;
  valor: number;
}

export interface GeralBaseResumo {
  custoComissao: number;
  custoAtletas: number;
  custoMensalFixo: number;
  despesasTotal: number;
  totalGeral: number;
  linhasCategoria: LinhaCategoriaGeralBase[];
}

/**
 * Cálculo do Gasto Geral da Base (aba "Geral da Base" de `/base/financeiro` e o PDF que a
 * espelha) — separado em função pura pra poder ser reaproveitado pelos dois sem duplicar a conta,
 * e testável sem precisar de Supabase. Ver docs/superpowers/specs/2026-08-19-financeiro-base-
 * design.md e docs/superpowers/specs/2026-08-19-comissao-tecnica-multi-categoria-design.md.
 *
 * `comissao` deve vir com todo mundo cadastrado (mesmo sem salário) — a listagem nominal mostra
 * todo mundo, só a soma ignora quem está com `valor_salario` nulo. `atletasComAjuda` deve vir JÁ
 * filtrado pra quem tem `valor_ajuda_custo > 0` (a listagem não mostra quem não recebe).
 *
 * Quando uma pessoa da Comissão Técnica atua em mais de uma categoria, o salário dela é dividido
 * igualmente entre as categorias marcadas só nesta quebra "por categoria" — na listagem nominal
 * continua aparecendo o valor cheio, ela recebe isso por inteiro.
 */
export function calcularGeralBase(
  comissao: ComissaoTecnicaBaseRow[],
  atletasComAjuda: AtletaBaseRow[],
  despesas: DespesaAvulsaBaseComCategoriaRow[],
): GeralBaseResumo {
  const custoComissao = comissao.reduce((soma, c) => soma + (c.valor_salario ?? 0), 0);
  const custoAtletas = atletasComAjuda.reduce((soma, a) => soma + (a.valor_ajuda_custo ?? 0), 0);
  const custoMensalFixo = custoComissao + custoAtletas;

  const despesasTotal = despesas.reduce((soma, d) => soma + valorDespesaBase(d), 0);
  const totalGeral = custoMensalFixo + despesasTotal;

  const linhasCategoria: LinhaCategoriaGeralBase[] = [
    ...CATEGORIAS_BASE.map((cat) => {
      const salarios = comissao
        .filter((c) => c.categorias.includes(cat.value))
        .reduce((soma, c) => soma + (c.valor_salario ?? 0) / c.categorias.length, 0);
      const ajudas = atletasComAjuda
        .filter((a) => a.categoria === cat.value)
        .reduce((soma, a) => soma + (a.valor_ajuda_custo ?? 0), 0);
      const despesasCat = despesas
        .filter((d) => d.categoria === cat.value)
        .reduce((soma, d) => soma + valorDespesaBase(d), 0);
      return { key: cat.value, label: cat.label, valor: salarios + ajudas + despesasCat };
    }),
    {
      key: "geral" as const,
      label: "Geral",
      valor: despesas.filter((d) => d.categoria === null).reduce((soma, d) => soma + valorDespesaBase(d), 0),
    },
  ];

  return { custoComissao, custoAtletas, custoMensalFixo, despesasTotal, totalGeral, linhasCategoria };
}
