import { createClient } from "@/lib/supabase/server";
import { notificarSignerConfiguravel } from "@/lib/notificacoes/actions";
import type { ConfiguracaoFinanceiroBaseRow, ConfiguracaoFinanceiroRow } from "@/lib/supabase/types";

function formatDataBr(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Avisa (sino + push) quem precisa assinar o Orçamento/Despesas de um jogo — chamada a partir de
 * `createGasto`/`createGastoBase` na primeira vez que o bloco de assinatura correspondente fica
 * visível na tela: Orçamento no primeiro gasto lançado, Despesas no primeiro gasto com valor JÁ
 * efetuado (mesma regra de gate que `lib/assinaturas/pendencias.ts` usa pra decidir o que listar em
 * "Documentos Pendentes"). Notifica os dois papéis configurados (assinatura1 e assinatura2) — se
 * nenhum estiver vinculado a uma pessoa específica, cai no fallback de avisar todo master.
 */
export async function notificarAssinantesFinanceiro(params: {
  tabelaConfig: "configuracoes_financeiro" | "configuracoes_financeiro_base";
  jogoId: string;
  adversarioNome: string;
  dataJogo: string;
  bloco: "Orçamento" | "Despesas";
  link: string;
}): Promise<void> {
  const supabase = createClient();
  const { data: configData } = await supabase.from(params.tabelaConfig).select("*").limit(1).maybeSingle();
  const config = configData as (ConfiguracaoFinanceiroRow | ConfiguracaoFinanceiroBaseRow) | null;
  if (!config) return;

  const mensagem = `Financeiro — vs. ${params.adversarioNome}, ${formatDataBr(params.dataJogo)} (${params.bloco}) está esperando sua assinatura.`;
  // Dedupe: se os dois papéis apontam pra mesma coisa (mesma pessoa vinculada, ou os dois sem
  // vínculo — que cai no mesmo fallback "todo master") evita mandar o aviso repetido.
  const alvos = new Set([config.assinatura1_usuario_id ?? null, config.assinatura2_usuario_id ?? null]);
  await Promise.all(
    [...alvos].map((usuarioVinculado) =>
      notificarSignerConfiguravel({
        usuarioVinculado,
        tipo: "assinatura_pendente",
        mensagem,
        link: params.link,
      }),
    ),
  );
}
