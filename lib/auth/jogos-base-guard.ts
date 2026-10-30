import type { createClient } from "@/lib/supabase/server";
import { getCategoriasBasePermitidas } from "@/lib/auth/role";
import type { JogoRow } from "@/lib/supabase/types";

/**
 * Busca um jogo do Futebol de Base por id e já aplica o filtro de categoria do usuário logado —
 * ver docs/superpowers/specs/2026-09-13-acesso-por-categoria-comissao-tecnica-design.md. Substitui
 * o padrão repetido `supabase.from("jogos").select("*").eq("id", id).single()` que cada subpágina
 * de `app/base/jogos/[id]/*` fazia sozinha (desde a unificação de Jogos/Convocação de 30/10/2026,
 * ver 0157_unificacao_jogos.sql, é a mesma tabela `jogos` do Profissional). Retorna `null` tanto se
 * o jogo não existe quanto se a categoria dele está fora do que esse usuário pode ver — de
 * propósito a mesma resposta nos dois casos, pra não revelar que o jogo existe mas é de outra
 * categoria. O chamador decide como reagir (`notFound()` em páginas, uma resposta 404 em rotas de
 * arquivo).
 */
export async function verificarAcessoJogoBase(
  supabase: ReturnType<typeof createClient>,
  jogoId: string,
): Promise<JogoRow | null> {
  const [{ data }, categoriasPermitidas] = await Promise.all([
    supabase.from("jogos").select("*").eq("id", jogoId).single(),
    getCategoriasBasePermitidas(supabase),
  ]);
  if (!data) return null;
  const jogo = data as JogoRow;
  if (!(categoriasPermitidas as string[]).includes(jogo.categoria)) return null;
  return jogo;
}
