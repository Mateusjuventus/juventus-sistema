import { TAREFA_CATEGORIAS } from "@/lib/validation/schemas";

/** Todas as chaves de categoria de Tarefas — mesma fonte usada no formulário/listagem de tarefas
 * (`lib/validation/schemas.ts`), só reexportada como lista simples de valores pra validar o que
 * vem do formulário de permissões (`app/usuarios`). */
export const TODAS_TAREFA_CATEGORIAS: string[] = TAREFA_CATEGORIAS.map((c) => c.value);

export function ehTarefaCategoriaValida(valor: string): boolean {
  return TODAS_TAREFA_CATEGORIAS.includes(valor);
}
