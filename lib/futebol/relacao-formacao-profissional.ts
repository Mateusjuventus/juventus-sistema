import type { AtletaContratoRow, AtletaContratoEvolucaoSalarialRow } from "@/lib/supabase/types";
import { atletaVisivelPorAtivo } from "./atletas-filtro";

/**
 * Lógica pura (sem Supabase) da Relação de Atletas (Formação e Profissional) pro Financeiro/
 * Controladoria — ver docs/superpowers/specs/2026-11-26-relacao-formacao-profissional-design.md.
 * Quem chama (página e rotas de PDF/Excel) busca `atletas`/`atleta_contratos`/`atleta_contrato_
 * evolucao_salarial`/exceções no Supabase e monta `AtletaParaRelacao[]`; este módulo só decide quem
 * entra, como agrupar e como calcular os totais — extraído puro pra poder ser testado sem bater no
 * banco nem renderizar PDF.
 */

/** Só os campos que este módulo realmente usa de `AtletaRow`, mais o contrato vigente já resolvido
 * (ou `null`, quando o atleta não tem nenhum contrato vigente lançado). */
export interface AtletaParaRelacao {
  id: string;
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  status: string;
  ativo: boolean;
  categoria: string;
  contratoVigente: AtletaContratoRow | null;
}

export type TipoExcecao = "incluir" | "excluir";

export interface ExcecaoRelacao {
  atletaId: string;
  tipo: TipoExcecao;
}

const TIPOS_CONTRATO_RELACAO = ["formacao", "definitivo", "emprestimo"] as const;

/** Critério automático (ver spec, "Decisões"): categoria de Base (não "profissional"), contrato
 * vigente de Formação/Definitivo/Empréstimo (Amador e Iniciação ficam de fora), status diferente de
 * "dispensado" (Relatório de Dispensa formal) e `ativo === true`. Reusa `atletaVisivelPorAtivo`
 * (mesma regra que já esconde atleta inativo em todo o resto do sistema) em vez de checar `ativo` à
 * mão aqui — mesmo padrão, não duplicado. */
export function atletaEhCandidatoAutomatico(atleta: AtletaParaRelacao): boolean {
  if (atleta.categoria === "profissional") return false;
  if (atleta.status === "dispensado") return false;
  if (!atletaVisivelPorAtivo(atleta.ativo, false)) return false;
  const tipo = atleta.contratoVigente?.tipo_contrato;
  return tipo != null && (TIPOS_CONTRATO_RELACAO as readonly string[]).includes(tipo);
}

/** `(candidatos automáticos ∪ exceções 'incluir') − exceções 'excluir'` — ver spec, "Mecanismo de
 * exceções". `todosOsAtletas` precisa cobrir todo atleta candidato a uma exceção 'incluir' (não só
 * os candidatos automáticos), já que o objetivo da exceção é incluir alguém que o automático não
 * pegaria (outra categoria, outro tipo de contrato, até dispensado/inativo). Uma exceção cujo
 * `atletaId` não bate com ninguém em `todosOsAtletas` simplesmente não tem efeito (não derruba nem
 * silenciosamente "inventa" um atleta). */
export function calcularListaFinal(todosOsAtletas: AtletaParaRelacao[], excecoes: ExcecaoRelacao[]): AtletaParaRelacao[] {
  const incluirIds = new Set(excecoes.filter((e) => e.tipo === "incluir").map((e) => e.atletaId));
  const excluirIds = new Set(excecoes.filter((e) => e.tipo === "excluir").map((e) => e.atletaId));
  return todosOsAtletas.filter((a) => (atletaEhCandidatoAutomatico(a) || incluirIds.has(a.id)) && !excluirIds.has(a.id));
}

export interface LinhaRelacao {
  atleta: AtletaParaRelacao;
  contrato: AtletaContratoRow;
  valorTotal: number;
}

function ehBlocoFormacao(contrato: AtletaContratoRow): boolean {
  return contrato.tipo_contrato === "formacao";
}

/** Soma as 5 rubricas — mesma conta que o formulário de Contrato já faz no client pra mostrar "Valor
 * total" (ver `ContratoForm`), replicada aqui em JS puro pro PDF/Excel. */
export function valorTotalContrato(c: AtletaContratoRow): number {
  return c.salario_ctps + c.direito_imagem + c.bonificacao + c.auxilio_moradia + c.outros;
}

/** Agrupa a lista final em Formação/Profissional, ordenado por nome dentro de cada bloco. Atletas
 * sem `contratoVigente` ficam de fora dos dois blocos (não tem rubrica nem tipo pra mostrar) — só
 * pode acontecer via uma exceção 'incluir' manual num atleta sem contrato vigente nenhum, já que
 * `atletaEhCandidatoAutomatico` nunca deixa passar quem não tem. Ver `atletasSemContratoParaAviso`
 * pra avisar esse caso na tela em vez de ele simplesmente sumir sem explicação. */
export function agruparPorBloco(lista: AtletaParaRelacao[]): { formacao: LinhaRelacao[]; profissional: LinhaRelacao[] } {
  const comContrato = lista.filter(
    (a): a is AtletaParaRelacao & { contratoVigente: AtletaContratoRow } => a.contratoVigente != null,
  );
  const linhas: LinhaRelacao[] = comContrato.map((a) => ({
    atleta: a,
    contrato: a.contratoVigente,
    valorTotal: valorTotalContrato(a.contratoVigente),
  }));
  const porNome = (a: LinhaRelacao, b: LinhaRelacao) => a.atleta.nomeCompleto.localeCompare(b.atleta.nomeCompleto, "pt-BR");
  return {
    formacao: linhas.filter((l) => ehBlocoFormacao(l.contrato)).sort(porNome),
    profissional: linhas.filter((l) => !ehBlocoFormacao(l.contrato)).sort(porNome),
  };
}

/** Atletas que entraram pela exceção 'incluir' mas não têm contrato vigente nenhum — ver nota de
 * `agruparPorBloco` acima. A tela mostra esta lista separada em vez de deixar esse atleta sumir da
 * relação sem explicação. */
export function atletasSemContratoParaAviso(lista: AtletaParaRelacao[]): AtletaParaRelacao[] {
  return lista.filter((a) => a.contratoVigente == null);
}

/** Mudanças futuras agendadas de qualquer rubrica pra um contrato, ordenadas por data — ver spec:
 * só mostrado no bloco Profissional. Mostra TODAS as mudanças futuras agendadas (não só a próxima),
 * uma por linha. */
export function evolucoesDoContrato(
  contratoId: string,
  todasEvolucoes: AtletaContratoEvolucaoSalarialRow[],
): AtletaContratoEvolucaoSalarialRow[] {
  return todasEvolucoes.filter((e) => e.contrato_id === contratoId).sort((a, b) => a.data_vigencia.localeCompare(b.data_vigencia));
}
