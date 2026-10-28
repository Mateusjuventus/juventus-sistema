import { createClient } from "@/lib/supabase/server";
import { notificarSignerConfiguravel } from "@/lib/notificacoes/actions";
import type { CategoriaBase } from "@/lib/auth/categorias-base";
import type { ConfiguracaoFinanceiroBaseRow, ConfiguracaoFinanceiroRow } from "@/lib/supabase/types";

function formatDataBr(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Quem avisar pela Assinatura 1 (Supervisor) de um jogo da Base — todo usuário vinculado
 * (`perfis.comissao_tecnica_id`, já unificado — ver docs/superpowers/specs/2026-10-28-unificacao-
 * comissao-tecnica-design.md) a um registro da Comissão Técnica com função "Supervisor" e essa
 * categoria entre as dela (mesma regra de `resolverEhSupervisorDaCategoriaBase` em
 * `lib/auth/role.ts`, só que achando todos os elegíveis em vez de checar um só) — ver
 * docs/superpowers/specs/2026-10-27-assinatura-financeiro-base-por-supervisor-design.md. Sem
 * ninguém configurado pra essa categoria ainda, devolve `[null]` — mesmo fallback de "avisar todo
 * master" que um papel configurável sem vínculo já usa.
 */
async function buscarSupervisoresDaCategoriaBase(
  supabase: ReturnType<typeof createClient>,
  categoria: CategoriaBase,
): Promise<(string | null)[]> {
  const { data: comissao } = await supabase
    .from("comissao_tecnica")
    .select("id")
    .ilike("funcao", "%supervisor%")
    .contains("categorias", [categoria]);
  const idsComissao = (comissao ?? []).map((c) => c.id as string);
  if (idsComissao.length === 0) return [null];

  const { data: perfisVinculados } = await supabase.from("perfis").select("id").in("comissao_tecnica_id", idsComissao);
  const ids = (perfisVinculados ?? []).map((p) => p.id as string);
  return ids.length > 0 ? ids : [null];
}

/**
 * Avisa (sino + push) quem precisa assinar o Orçamento/Despesas de um jogo — chamada a partir de
 * `createGasto`/`createGastoBase` na primeira vez que o bloco de assinatura correspondente fica
 * visível na tela: Orçamento no primeiro gasto lançado, Despesas no primeiro gasto com valor JÁ
 * efetuado (mesma regra de gate que `lib/assinaturas/pendencias.ts` usa pra decidir o que listar em
 * "Documentos Pendentes"). Assinatura 2 continua um vínculo fixo configurado (igual nos dois
 * departamentos). Assinatura 1: no Profissional continua o vínculo fixo configurado; na Base
 * depende da categoria do jogo — por isso `categoria` é obrigatório pra `configuracoes_financeiro_
 * base` (ver docs/superpowers/specs/2026-10-27-assinatura-financeiro-base-por-supervisor-design.md).
 */
export async function notificarAssinantesFinanceiro(params: {
  tabelaConfig: "configuracoes_financeiro" | "configuracoes_financeiro_base";
  jogoId: string;
  categoria?: CategoriaBase;
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

  const alvosAssinatura1: (string | null)[] =
    params.tabelaConfig === "configuracoes_financeiro_base"
      ? params.categoria
        ? await buscarSupervisoresDaCategoriaBase(supabase, params.categoria)
        : [null]
      : [(config as ConfiguracaoFinanceiroRow).assinatura1_usuario_id ?? null];

  // Dedupe: se mais de um alvo apontar pra mesma coisa (mesma pessoa, ou os dois caindo no mesmo
  // fallback "todo master") evita mandar o aviso repetido.
  const alvos = new Set([...alvosAssinatura1, config.assinatura2_usuario_id ?? null]);
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
