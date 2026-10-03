import type { createClient } from "@/lib/supabase/server";
import { getCategoriasBasePermitidas } from "@/lib/auth/role";
import { carregarCompeticaoBase, type CompeticaoBaseCarregada } from "@/lib/futebol/competicao-query-base";

/**
 * Carrega uma competição da Base por id e já aplica o filtro de categoria do usuário logado —
 * mesmo espírito de `verificarAcessoJogoBase` (`lib/auth/jogos-base-guard.ts`), aplicado aqui às
 * ~20 telas de `/base/competicoes/[id]/*`. Retorna `null` tanto se a competição não existe quanto
 * se a categoria dela está fora do que esse usuário pode ver — mesma resposta nos dois casos, pra
 * não revelar que a competição existe mas é de outra categoria. O chamador decide como reagir
 * (`notFound()` em páginas, uma resposta 404 em rotas de arquivo).
 */
export async function verificarAcessoCompeticaoBase(
  supabase: ReturnType<typeof createClient>,
  competicaoId: string,
): Promise<CompeticaoBaseCarregada | null> {
  const [carregada, categoriasPermitidas] = await Promise.all([
    carregarCompeticaoBase(supabase, competicaoId),
    getCategoriasBasePermitidas(supabase),
  ]);
  if (!carregada || !categoriasPermitidas.includes(carregada.competicao.categoria)) return null;
  return carregada;
}
