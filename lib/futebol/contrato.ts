// Import relativo (não o alias "@/...") — mesmo motivo de `lib/futebol/financeiro.ts`: o alias não
// resolve no vitest pra um import de valor (em runtime), só pra `import type`.
import { RUBRICA_CONTRATO_LABEL } from "../validation/schemas";
import type { AtletaContratoEvolucaoSalarialRow, RubricaContrato } from "../supabase/types";
import { diasEntre } from "./calendario";

/**
 * Extensões do Contrato do Atleta (contagem de dias restantes, evolução salarial, selo de status)
 * — ver docs/superpowers/specs/2026-11-04-contrato-atleta-extensoes-design.md. Em cima do
 * sub-sistema já existente desde 0137_atleta_contrato.sql (`atleta_contratos`,
 * `components/contrato-secao.tsx`).
 */

export interface DiasRestantesContrato {
  dias: number;
  meses: number;
}

/** `null` quando `vigenciaFim` é nulo (contrato sem prazo definido) ou já passou — não faz sentido
 * mostrar "faltam -12 dias" num contrato vencido (isso já é coberto pelo selo de status). */
export function diasRestantesContrato(vigenciaFim: string | null, hojeStr: string): DiasRestantesContrato | null {
  if (!vigenciaFim) return null;
  const dias = diasEntre(hojeStr, vigenciaFim);
  if (dias < 0) return null;
  return { dias, meses: Math.round(dias / 30) };
}

/** Sugestão de vigência fim pro contrato de "Formação" — a data imediatamente anterior àquela em
 * que o atleta completa 20 (vinte) anos de idade, mesma regra escrita no texto do próprio modelo
 * padrão do Contrato de Formação (Cláusula 1.1). Pedido do Mateus em 09/11/2026 (ver
 * docs/superpowers/specs/2026-11-09-contrato-formacao-design.md) — só pré-preenche o campo de
 * vigência fim em `ContratoForm` quando "Formação" é selecionado; continua editável normalmente
 * (não é recalculada nem imposta de volta no banco depois de salva). Aritmética em UTC (em vez de
 * `Date` local) pra não sofrer o mesmo bug de fuso já visto em `formatCarimbo`. */
export function dataFimFormacao(dataNascimento: string): string {
  const [anoStr, mesStr, diaStr] = dataNascimento.split("-");
  const data = new Date(Date.UTC(Number(anoStr) + 20, Number(mesStr) - 1, Number(diaStr)));
  data.setUTCDate(data.getUTCDate() - 1);
  const yyyy = data.getUTCFullYear();
  const mm = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(data.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Atleta já é maior de idade HOJE (18 anos completos ou mais) — usada na hora de GERAR o PDF do
 * Contrato de Formação pra decidir qual dos dois modelos usar (ver docs/superpowers/specs/
 * 2026-11-11-contrato-formacao-fase2-design.md): calculada pela idade atual, não pela idade no
 * momento em que o contrato foi criado — se o atleta completar 18 anos durante a vigência do
 * mesmo contrato, o PDF passa a usar o modelo de maior automaticamente, sem precisar editar nada.
 * Aritmética em UTC (mesmo motivo de `dataFimFormacao`, acima). */
export function atletaMaiorIdade(dataNascimento: string, hojeStr: string): boolean {
  const [anoNasc, mesNasc, diaNasc] = dataNascimento.split("-").map(Number);
  const [anoHoje, mesHoje, diaHoje] = hojeStr.split("-").map(Number);
  let idade = anoHoje - anoNasc;
  if (mesHoje < mesNasc || (mesHoje === mesNasc && diaHoje < diaNasc)) idade -= 1;
  return idade >= 18;
}

export type StatusContrato = "ativo" | "vencido" | "sem_contrato";

export interface StatusContratoInfo {
  status: StatusContrato;
  label: string;
}

/** Selo "Contrato Ativo"/"Contrato Vencido"/"Sem contrato" na ficha do atleta — `vigente` é o
 * contrato vigente do atleta (`undefined` quando não existe nenhum). Sem `vigencia_fim` conta
 * como "sem prazo definido", nunca vencido. */
export function statusContrato(
  vigente: { vigencia_fim: string | null } | undefined,
  hojeStr: string,
): StatusContratoInfo {
  if (!vigente) return { status: "sem_contrato", label: "Sem contrato" };
  if (vigente.vigencia_fim && vigente.vigencia_fim < hojeStr) {
    return { status: "vencido", label: "Contrato Vencido" };
  }
  return { status: "ativo", label: "Contrato Ativo" };
}

/** Só os tipos de contrato com remuneração formal (CLT/empréstimo) mostram as rubricas (Salário
 * CTPS/Direito de imagem/Bonificação/Auxílio moradia/Outros) e o Valor total — "Amador",
 * "Iniciação" e "Formação" são vínculos sem contrato de trabalho formal, então essas rubricas
 * sempre aparecem zeradas pra eles e só poluem a tela (pedido do Mateus em 04/11/2026, ao ver um
 * card de "Amador" cheio de "R$ 0,00": "não precisa aparecer essas informações, isso só aparecer
 * ao selecionar definitivo ou empréstimo"). Ajuda de custo da Base continua em
 * `atletas.valor_ajuda_custo`, fora do Contrato — não é afetada por esta função. */
export function contratoTemRemuneracaoFormal(tipoContrato: string): boolean {
  return tipoContrato === "definitivo" || tipoContrato === "emprestimo";
}

/** Conjunto DIFERENTE do de `contratoTemRemuneracaoFormal` (inclui "formacao") — decide se a
 * seção "Dados de Pagamento" (PF/PJ + Empresa de Imagem/CNPJ, campos do cadastro do atleta, sem
 * vínculo com o Contrato em si) aparece no formulário. Pedido do Mateus em 05/11/2026, ao definir
 * o escopo da nova seção — ver docs/superpowers/specs/2026-11-04-atletas-desativacao-transicao-
 * pagamento-design.md. Aceita `null`/`undefined` (atleta sem nenhum contrato ainda, ex. recém
 * cadastrado) como "não mostra". */
export function atletaTemDadosPagamento(tipoContrato: string | null | undefined): boolean {
  return tipoContrato === "definitivo" || tipoContrato === "formacao" || tipoContrato === "emprestimo";
}

/** Valor efetivo de uma rubrica na data de hoje: a evolução salarial mais recente já aplicável
 * (data <= hoje) pra essa rubrica, ou o valor gravado no próprio contrato quando não há nenhuma —
 * mesmo princípio do Valor Total do contrato (calculado na hora de exibir, nunca gravado). Usado
 * tanto no `ContratoCard` quanto no cálculo do Financeiro. */
export function valorEfetivoRubrica(
  valorContrato: number,
  evolucoes: AtletaContratoEvolucaoSalarialRow[],
  rubrica: RubricaContrato,
  hojeStr: string,
): number {
  const aplicaveis = evolucoes
    .filter((e) => e.rubrica === rubrica && e.data_vigencia <= hojeStr)
    .sort((a, b) => (a.data_vigencia < b.data_vigencia ? 1 : -1));
  return aplicaveis[0]?.novo_valor ?? valorContrato;
}

/** Contrato "vazio" — sem nenhuma data de vigência e sem nenhum valor de remuneração lançado (só
 * sobrou o tipo). É o formato que o backfill da migração original (0137_atleta_contrato.sql) cria
 * pra quem já tinha `tipo_contrato` preenchido no cadastro antes desta tela existir, mas nenhuma
 * data nem rubrica — na prática não é um contrato de verdade, só um marcador. Pedido do Mateus em
 * 04/11/2026, depois de ver um desses na tela: "não faz sentido ter ali esse contrato se não tem
 * tipo e nem data nenhuma" — por isso esse tipo de registro é tratado como "Sem contrato" (ver
 * `statusContrato`) em vez de aparecer como o contrato vigente. Continua existindo no banco (não é
 * apagado) e seria substituído normalmente ao lançar um "Novo contrato" de verdade. */
export function contratoVazio(contrato: {
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  salario_ctps: number;
  direito_imagem: number;
  bonificacao: number;
  auxilio_moradia: number;
  outros: number;
}): boolean {
  return (
    !contrato.vigencia_inicio &&
    !contrato.vigencia_fim &&
    contrato.salario_ctps === 0 &&
    contrato.direito_imagem === 0 &&
    contrato.bonificacao === 0 &&
    contrato.auxilio_moradia === 0 &&
    contrato.outros === 0
  );
}

export interface ParteDireitoEconomico {
  nome: string;
  pct: number;
}

/** As partes de direito econômico do contrato que de fato têm percentual lançado (0%/vazio não
 * entra) — centraliza a lista que tanto `DireitosEconomicos` (components/contrato-secao.tsx)
 * quanto a Ficha do atleta (PDF) precisam montar a partir das mesmas 4 colunas. */
export function direitosEconomicos(contrato: {
  direito_economico_juventus_pct: number | null;
  direito_economico_atleta_pct: number | null;
  direito_economico_terceiro_nome: string | null;
  direito_economico_terceiro_pct: number | null;
}): ParteDireitoEconomico[] {
  const partes: ParteDireitoEconomico[] = [];
  if (contrato.direito_economico_juventus_pct) {
    partes.push({ nome: "Juventus", pct: contrato.direito_economico_juventus_pct });
  }
  if (contrato.direito_economico_atleta_pct) {
    partes.push({ nome: "Atleta", pct: contrato.direito_economico_atleta_pct });
  }
  if (contrato.direito_economico_terceiro_pct && contrato.direito_economico_terceiro_nome) {
    partes.push({ nome: contrato.direito_economico_terceiro_nome, pct: contrato.direito_economico_terceiro_pct });
  }
  return partes;
}

export interface AvisoEvolucaoSalarial {
  rubricaLabel: string;
  novoValor: number;
  diasRestantes: number;
  data: string;
}

/** Evoluções salariais com data futura (ainda não aplicadas), mais próxima primeiro — vira o
 * aviso "Evolução salarial em N dias" na ficha do atleta. Escrita de um jeito reaproveitável (só
 * recebe uma lista de evoluções solta) pra o Dashboard geral poder chamar de novo mais tarde,
 * juntando de vários atletas de uma vez. */
export function evolucoesProximas(
  evolucoes: AtletaContratoEvolucaoSalarialRow[],
  hojeStr: string,
): AvisoEvolucaoSalarial[] {
  return evolucoes
    .filter((e) => e.data_vigencia > hojeStr)
    .map((e) => ({
      rubricaLabel: RUBRICA_CONTRATO_LABEL[e.rubrica] ?? e.rubrica,
      novoValor: e.novo_valor,
      diasRestantes: diasEntre(hojeStr, e.data_vigencia),
      data: e.data_vigencia,
    }))
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}
