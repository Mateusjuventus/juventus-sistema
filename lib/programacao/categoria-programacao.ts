import { categoriaBaseLabel, ehCategoriaBaseValida, type CategoriaBase } from "@/lib/auth/categorias-base";

/**
 * Categoria da Programação Semanal — as 7 categorias da Base (`CategoriaBase`, usadas também por
 * Atletas/Jogos/Comissão Técnica) mais `"profissional"`, um "grupo" único que representa o time
 * Profissional inteiro (ver docs/superpowers/specs/2026-10-05-programacao-profissional-design.md).
 * `CategoriaBase` em si NÃO muda — continua só as 7 categorias da Base, lido por módulos que não
 * têm nada a ver com Programação. Este tipo existe só pros arquivos do módulo de Programação
 * (`lib/programacao/*`, `components/programacao/*`), que precisam aceitar também o Profissional.
 */
export type CategoriaProgramacao = CategoriaBase | "profissional";

export function categoriaProgramacaoLabel(valor: CategoriaProgramacao): string {
  return valor === "profissional" ? "Futebol Profissional" : categoriaBaseLabel(valor);
}

export function ehCategoriaProgramacaoValida(valor: string): valor is CategoriaProgramacao {
  return valor === "profissional" || ehCategoriaBaseValida(valor);
}
