import type { EstoqueCategoria } from "@/lib/supabase/types";

/**
 * Rótulos de campo que mudam conforme a ramificação do Estoque. O dado guardado no banco é o mesmo
 * nas três (as colunas `nome`/`tamanhos` não mudam) — só o texto na tela muda, porque cada uma
 * pensa a mesma informação de um jeito:
 *
 * - **Esportivo** trabalha com TAMANHO (P/M/G/Único) — é uniforme.
 * - **Medicação** trabalha com UNIDADE de medida (Caixa/Unidade/Pacote) e chama o nome do item de
 *   "Descrição", que é como a receita/nota fiscal se refere ao medicamento.
 * - **Materiais** também é por UNIDADE (cone, bola, garrafa não têm tamanho), mas o item tem nome
 *   próprio, não descrição.
 *
 * São Records e não `if categoria === "medico"` de propósito: com três ramificações, o ternário
 * fazia Materiais herdar silenciosamente o texto do Esportivo (e falar em "tamanho" de cone).
 */

const NOME_ITEM: Record<EstoqueCategoria, string> = {
  esportivo: "Nome do item",
  medico: "Descrição",
  materiais: "Nome do item",
};

const UNIDADE: Record<EstoqueCategoria, string> = {
  esportivo: "Tamanho",
  medico: "Unidade",
  materiais: "Unidade",
};

const PLACEHOLDER_UNIDADE: Record<EstoqueCategoria, string> = {
  esportivo: "Ex: M ou Único",
  medico: "Ex: Caixa, Unidade ou Pacote",
  materiais: "Ex: Unidade, Caixa ou Par",
};

const SECAO_UNIDADES: Record<EstoqueCategoria, string> = {
  esportivo: "Tamanhos e quantidades",
  medico: "Unidades e quantidades",
  materiais: "Unidades e quantidades",
};

const EXEMPLO_SECAO: Record<EstoqueCategoria, string> = {
  esportivo: "Ex: P, M, G, Único... Adicione uma linha por tamanho/variação que esse item tem.",
  medico: "Ex: Caixa, Unidade, Pacote... Adicione uma linha por unidade de medida que esse item tem.",
  materiais: "Ex: Unidade, Caixa, Par, Jogo... Adicione uma linha por unidade de medida que esse item tem.",
};

/** Exemplo de item, usado como placeholder do campo de nome. */
const EXEMPLO_ITEM: Record<EstoqueCategoria, string> = {
  esportivo: "Ex: Camiseta Polo",
  medico: "Ex: Dipirona 500mg comprimido",
  materiais: "Ex: Cone de treino",
};

export function labelNomeItem(categoria: EstoqueCategoria): string {
  return NOME_ITEM[categoria];
}

export function labelUnidade(categoria: EstoqueCategoria): string {
  return UNIDADE[categoria];
}

export function placeholderUnidade(categoria: EstoqueCategoria): string {
  return PLACEHOLDER_UNIDADE[categoria];
}

export function labelUnidadesSection(categoria: EstoqueCategoria): string {
  return SECAO_UNIDADES[categoria];
}

export function exemploUnidadesSection(categoria: EstoqueCategoria): string {
  return EXEMPLO_SECAO[categoria];
}

export function placeholderNomeItem(categoria: EstoqueCategoria): string {
  return EXEMPLO_ITEM[categoria];
}

/** "o tamanho" / "a unidade" — usado no meio de frase, onde o artigo precisa concordar. */
export function artigoUnidade(categoria: EstoqueCategoria): string {
  return categoria === "esportivo" ? "o tamanho" : "a unidade";
}

/** Só Medicação usa dosagem/concentração ("500mg") — nem uniforme nem cone têm isso. */
export function usaCampoMg(categoria: EstoqueCategoria): boolean {
  return categoria === "medico";
}
