import { ESTOQUE_CATEGORIAS } from "@/lib/validation/schemas";
import type { EstoqueCategoria } from "@/lib/supabase/types";

/** Confere se o parâmetro da URL (params.categoria) é "esportivo" ou "medico" — usado em toda
 * página/rota que recebe esse parâmetro, pra rejeitar qualquer outro valor com notFound()/404. */
export function parseCategoria(value: string): EstoqueCategoria | null {
  return ESTOQUE_CATEGORIAS.some((c) => c.value === value) ? (value as EstoqueCategoria) : null;
}
