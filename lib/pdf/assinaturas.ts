import type { createClient } from "@/lib/supabase/server";
import type { ConfiguracaoFinanceiroRow } from "@/lib/supabase/types";
import type { AssinaturaInfo } from "./logistica-shared";

const PADRAO_ASSINATURA_1: AssinaturaInfo = { nome: "Mateus dos Santos", cargo: "Supervisor de Futebol" };
const PADRAO_ASSINATURA_2: AssinaturaInfo = { nome: "Pedro Machado", cargo: "Gerente de Futebol" };

/**
 * Busca as duas assinaturas configuradas em /financeiro/configuracoes (tabela singleton
 * configuracoes_financeiro), usadas nos PDFs do Financeiro. Cai para os valores padrão se a linha
 * ainda não existir (ex: migração 0010 ainda não aplicada).
 */
export async function getAssinaturasFinanceiro(
  supabase: ReturnType<typeof createClient>,
): Promise<{ assinatura1: AssinaturaInfo; assinatura2: AssinaturaInfo }> {
  const { data } = await supabase.from("configuracoes_financeiro").select("*").limit(1).maybeSingle();
  const config = data as ConfiguracaoFinanceiroRow | null;

  return {
    assinatura1: config
      ? { nome: config.assinatura1_nome, cargo: config.assinatura1_cargo }
      : PADRAO_ASSINATURA_1,
    assinatura2: config
      ? { nome: config.assinatura2_nome, cargo: config.assinatura2_cargo }
      : PADRAO_ASSINATURA_2,
  };
}
