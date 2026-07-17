import { ESTOQUE_CATEGORIAS } from "@/lib/validation/schemas";

/** As duas ramificações do módulo Estoque (Esportivo / Médico) — mesma fonte usada no cadastro de
 * Estoque (`lib/validation/schemas.ts`), reexportada como lista simples de valores pra validar o
 * que vem do formulário de permissões (`app/usuarios`) e pro bloqueio no middleware. Diferente de
 * `lib/auth/tarefas-categorias.ts`, isto é uma permissão de acesso de verdade, não só preferência
 * de exibição — ver `lib/supabase/middleware.ts`. */
export const TODAS_ESTOQUE_CATEGORIAS: string[] = ESTOQUE_CATEGORIAS.map((c) => c.value);

export function ehEstoqueCategoriaValida(valor: string): boolean {
  return TODAS_ESTOQUE_CATEGORIAS.includes(valor);
}
