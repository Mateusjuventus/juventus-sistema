import { CATEGORIAS_BASE, type CategoriaBase } from "../auth/categorias-base";
import type {
  AtletaBaseContratoRow,
  AtletaBaseRow,
  ComissaoTecnicaBaseRow,
  DespesaAvulsaBaseComCategoriaRow,
} from "../supabase/types";

/** Valor "efetivo" de uma despesa avulsa da Base — o que já foi de fato pago, ou o previsto
 * enquanto isso não acontece. Mesmo raciocínio usado em `gastos_jogo`/`despesas_avulsas`. */
export function valorDespesaBase(
  d: Pick<DespesaAvulsaBaseComCategoriaRow, "valor_efetuado" | "valor_previsto">,
): number {
  return d.valor_efetuado ?? d.valor_previsto;
}

/** Total de um contrato — soma das 5 rubricas (Salário CTPS, Direito de Imagem, Bonificação,
 * Auxílio Moradia, Outros). Mesma conta usada no Profissional (`lib/futebol/financeiro.ts`). */
function totalContrato(
  c: Pick<
    AtletaBaseContratoRow,
    "salario_ctps" | "direito_imagem" | "bonificacao" | "auxilio_moradia" | "outros"
  >,
): number {
  return c.salario_ctps + c.direito_imagem + c.bonificacao + c.auxilio_moradia + c.outros;
}

/** Monta um mapa atleta_id -> total do contrato vigente, a partir da lista de contratos vigentes
 * (já filtrados por `vigente = true` na query, no máximo um por atleta). */
export function mapaContratoVigentePorAtleta(
  contratosVigentes: AtletaBaseContratoRow[],
): Map<string, number> {
  return new Map(contratosVigentes.map((c) => [c.atleta_id, totalContrato(c)]));
}

/**
 * Custo "mensal" de um atleta da Base pra fins do Gasto Geral — o total do contrato vigente (soma
 * das 5 rubricas) quando existe um cadastrado; `valor_ajuda_custo` só como fallback, pra quem ainda
 * não tem nenhum contrato cadastrado (ver docs/superpowers/specs/2026-10-16-financeiro-contrato-
 * design.md). Antes dessa mudança era sempre `valor_ajuda_custo`, para todo mundo — ver nota em
 * `tipoPagamentoAtletaBase` sobre o rótulo (que não muda com esta conta).
 */
export function custoAtletaBase(
  atleta: Pick<AtletaBaseRow, "id" | "valor_ajuda_custo">,
  contratoPorAtleta: Map<string, number>,
): number {
  return contratoPorAtleta.get(atleta.id) ?? atleta.valor_ajuda_custo ?? 0;
}

/**
 * Rótulo do tipo de pagamento de um atleta no Gasto Geral da Base, a partir do tipo de contrato
 * (ver `ATLETA_BASE_TIPO_CONTRATO_OPTIONS` em `lib/validation/schemas.ts`). O mesmo campo
 * `valor_ajuda_custo` guarda valores de natureza diferente conforme o contrato: contrato
 * profissional "Definitivo" é Salário; contrato de formação "Amador" é Ajuda de custo (o flag
 * `possui_contrato_formacao` não muda esse rótulo — Amador é sempre Ajuda de custo). Empréstimo
 * tem rótulo próprio. Quem não tem `tipo_contrato` definido (ou está em "Iniciação", que ainda não
 * tem vínculo formal) aparece como "Sem contrato" — sinaliza no relatório que falta formalizar,
 * em vez de esconder.
 */
export function tipoPagamentoAtletaBase(tipoContrato: AtletaBaseRow["tipo_contrato"]): string {
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
 * `comissao` e `atletas` devem vir com todo mundo cadastrado (mesmo sem salário/contrato) — as
 * listagens nominais mostram todo mundo agora (com "—" pra quem não tem valor), só a soma ignora
 * quem está com o valor nulo. `contratosVigentes` são só os contratos com `vigente = true` (no
 * máximo um por atleta, já filtrado na query) — ver `custoAtletaBase`/`mapaContratoVigentePorAtleta`
 * pra como o total de cada atleta é calculado a partir disso (contrato vigente, com
 * `valor_ajuda_custo` como fallback pra quem não tem contrato — ver docs/superpowers/specs/
 * 2026-10-16-financeiro-contrato-design.md). O rótulo de cada atleta (Salário/Ajuda de
 * custo/Empréstimo/Sem contrato) continua vindo do tipo de contrato — ver `tipoPagamentoAtletaBase`
 * — e não muda com esta conta.
 *
 * Quando uma pessoa da Comissão Técnica atua em mais de uma categoria, o salário dela é dividido
 * igualmente entre as categorias marcadas só nesta quebra "por categoria" — na listagem nominal
 * continua aparecendo o valor cheio, ela recebe isso por inteiro.
 */
export function calcularGeralBase(
  comissao: ComissaoTecnicaBaseRow[],
  atletas: AtletaBaseRow[],
  despesas: DespesaAvulsaBaseComCategoriaRow[],
  contratosVigentes: AtletaBaseContratoRow[],
): GeralBaseResumo {
  const contratoPorAtleta = mapaContratoVigentePorAtleta(contratosVigentes);

  const custoComissao = comissao.reduce((soma, c) => soma + (c.valor_salario ?? 0), 0);
  const custoAtletas = atletas.reduce((soma, a) => soma + custoAtletaBase(a, contratoPorAtleta), 0);
  const custoMensalFixo = custoComissao + custoAtletas;

  const despesasTotal = despesas.reduce((soma, d) => soma + valorDespesaBase(d), 0);
  const totalGeral = custoMensalFixo + despesasTotal;

  const linhasCategoria: LinhaCategoriaGeralBase[] = [
    ...CATEGORIAS_BASE.map((cat) => {
      const salarios = comissao
        .filter((c) => c.categorias.includes(cat.value))
        .reduce((soma, c) => soma + (c.valor_salario ?? 0) / c.categorias.length, 0);
      const ajudas = atletas
        .filter((a) => a.categoria === cat.value)
        .reduce((soma, a) => soma + custoAtletaBase(a, contratoPorAtleta), 0);
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
