import { createClient } from "@/lib/supabase/server";
import type {
  AtletaRow,
  ComissaoTecnicaRow,
  ConvocacaoAtletaRow,
  ConvocacaoComissaoRow,
  ConvocacaoRow,
  ConvocacaoStaffRow,
  JogoRow,
  StaffOperacionalComFuncaoRow,
} from "@/lib/supabase/types";

/**
 * Helper compartilhado pelas abas de Rooming List, Ônibus, Credenciamento e Recibo de Pagamento
 * (o que antes era "Logística de Jogo" + "Operação de Jogo", agora unificado como abas dentro do
 * próprio jogo). Todas essas abas partem de quem foi convocado — ver
 * docs/superpowers/specs/2026-07-09-convocacao-presskit-logistica-design.md.
 */
export interface ConvocadosJogo {
  jogo: JogoRow;
  convocacao: ConvocacaoRow | null;
  atletas: AtletaRow[];
  comissao: ComissaoTecnicaRow[];
  staff: StaffOperacionalComFuncaoRow[];
}

export async function getJogoEConvocados(jogoId: string): Promise<ConvocadosJogo | null> {
  const supabase = createClient();

  const [{ data: jogoData }, { data: convocacaoData }] = await Promise.all([
    supabase.from("jogos").select("*").eq("id", jogoId).single(),
    supabase.from("convocacoes").select("*").eq("jogo_id", jogoId).maybeSingle(),
  ]);

  if (!jogoData) return null;
  const jogo = jogoData as JogoRow;
  const convocacao = convocacaoData as ConvocacaoRow | null;

  if (!convocacao) return { jogo, convocacao: null, atletas: [], comissao: [], staff: [] };

  const [{ data: caData }, { data: ccData }, { data: csData }] = await Promise.all([
    supabase.from("convocacao_atletas").select("*").eq("convocacao_id", convocacao.id),
    supabase
      .from("convocacao_comissao")
      .select("*, pessoa:comissao_tecnica(*)")
      .eq("convocacao_id", convocacao.id),
    supabase
      .from("convocacao_staff")
      .select("*, pessoa:staff_operacional(*, funcao:staff_funcoes_catalogo(nome))")
      .eq("convocacao_id", convocacao.id),
  ]);

  const convocacaoAtletaIds = ((caData ?? []) as ConvocacaoAtletaRow[]).map((c) => c.atleta_id);
  const comissao = ((ccData ?? []) as (ConvocacaoComissaoRow & { pessoa: ComissaoTecnicaRow | null })[])
    .map((c) => c.pessoa)
    .filter((p): p is ComissaoTecnicaRow => Boolean(p));
  const staff = ((csData ?? []) as (ConvocacaoStaffRow & { pessoa: StaffOperacionalComFuncaoRow | null })[])
    .map((c) => c.pessoa)
    .filter((p): p is StaffOperacionalComFuncaoRow => Boolean(p));

  let atletas: AtletaRow[] = [];
  if (convocacaoAtletaIds.length > 0) {
    const { data: atletasData } = await supabase.from("atletas").select("*").in("id", convocacaoAtletaIds);
    atletas = (atletasData ?? []) as AtletaRow[];
  }

  return { jogo, convocacao, atletas, comissao, staff };
}
