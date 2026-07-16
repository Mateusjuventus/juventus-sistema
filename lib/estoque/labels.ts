import type { EstoqueCategoria } from "@/lib/supabase/types";

/**
 * Rótulos de campo que mudam conforme a categoria — o Médico não usa "tamanho" (P/M/G) como o
 * Esportivo, e sim unidade de medida (Caixa/Unidade/Pacote); o "nome" do item também é chamado de
 * "Descrição" no Médico. O dado guardado no banco é o mesmo (mesmas colunas `nome`/`tamanhos`), só
 * o texto mostrado na tela muda.
 */
export function labelNomeItem(categoria: EstoqueCategoria): string {
  return categoria === "medico" ? "Descrição" : "Nome do item";
}

export function labelUnidade(categoria: EstoqueCategoria): string {
  return categoria === "medico" ? "Unidade" : "Tamanho";
}

export function placeholderUnidade(categoria: EstoqueCategoria): string {
  return categoria === "medico" ? "Ex: Caixa, Unidade ou Pacote" : "Ex: M ou Único";
}

export function labelUnidadesSection(categoria: EstoqueCategoria): string {
  return categoria === "medico" ? "Unidades e quantidades" : "Tamanhos e quantidades";
}

export function exemploUnidadesSection(categoria: EstoqueCategoria): string {
  return categoria === "medico"
    ? "Ex: Caixa, Unidade, Pacote... Adicione uma linha por unidade de medida que esse item tem."
    : "Ex: P, M, G, Único... Adicione uma linha por tamanho/variação que esse item tem.";
}
