import type { createClient } from "@/lib/supabase/server";
import { SETOR_COMISSAO_TECNICA_OPTIONS } from "@/lib/validation/schemas";

/**
 * Sugestões do campo Setor da Comissão Técnica/Diretoria (`SuggestionField` em
 * `app/comissao-tecnica/comissao-form.tsx`) — os 5 rótulos fixos de sempre, mais qualquer Setor
 * "criado na hora" (texto livre desde 14/11/2026, pedido do Mateus) que já exista em outro
 * cadastro, pra quem já criou um aparecer sugerido da próxima vez em vez de ter que redigitar do
 * zero. Chamada por `app/comissao-tecnica/novo/page.tsx` e `app/comissao-tecnica/[id]/page.tsx`.
 */
export async function buscarSugestoesSetor(supabase: ReturnType<typeof createClient>): Promise<string[]> {
  const slugsConhecidos = new Set(SETOR_COMISSAO_TECNICA_OPTIONS.map((o) => o.value));
  const { data } = await supabase.from("comissao_tecnica").select("setor").not("setor", "is", null);
  const setoresCustom = Array.from(
    new Set(
      (data ?? [])
        .map((linha) => linha.setor as string | null)
        .filter((s): s is string => !!s && !slugsConhecidos.has(s)),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  return [...SETOR_COMISSAO_TECNICA_OPTIONS.map((o) => o.label), ...setoresCustom];
}
