import { createClient } from "@/lib/supabase/server";
import { getCategoriasBasePermitidas } from "@/lib/auth/role";
import type {
  AtletaRow,
  ComissaoTecnicaRow,
  ConvocacaoAtletaRow,
  ConvocacaoRow,
  ConvocacaoComissaoRow,
  JogoRow,
} from "@/lib/supabase/types";

/**
 * Espelha `app/jogos/[id]/operacao-data.ts` para o Futebol de Base — helper compartilhado pelas
 * abas de Rooming List e Ônibus (Credenciamento fica fora de escopo pro Futebol de Base, ver a
 * spec). Staff Operacional não participa da convocação — Recibo busca o staff ativo direto do
 * cadastro, sem depender de convocação.
 */
export interface ConvocadosJogoBase {
  jogo: JogoRow;
  convocacao: ConvocacaoRow | null;
  atletas: AtletaRow[];
  comissao: ComissaoTecnicaRow[];
}

export async function getJogoBaseEConvocados(jogoId: string): Promise<ConvocadosJogoBase | null> {
  const supabase = createClient();

  const [{ data: jogoData }, { data: convocacaoData }] = await Promise.all([
    supabase.from("jogos").select("*").eq("id", jogoId).single(),
    supabase.from("convocacoes").select("*").eq("jogo_id", jogoId).maybeSingle(),
  ]);

  if (!jogoData) return null;
  const jogo = jogoData as JogoRow;

  const categoriasPermitidas = await getCategoriasBasePermitidas(supabase);
  // `jogo.categoria` é `CategoriaBase | "profissional"` (tabela `jogos` agora é compartilhada com o
  // Profissional — ver a unificação de Jogos/Convocação), mas `categoriasPermitidas` só contém
  // categorias da Base. O cast pra `string[]` é só pra satisfazer o tipo do `.includes` — se vier
  // "profissional" aqui, a comparação segue batendo `false` normalmente, igual antes.
  if (!(categoriasPermitidas as string[]).includes(jogo.categoria)) return null;

  const convocacao = convocacaoData as ConvocacaoRow | null;

  if (!convocacao) return { jogo, convocacao: null, atletas: [], comissao: [] };

  const [{ data: caData }, { data: ccData }] = await Promise.all([
    supabase.from("convocacao_atletas").select("*").eq("convocacao_id", convocacao.id),
    supabase
      .from("convocacao_comissao")
      .select("*, pessoa:comissao_tecnica(*)")
      .eq("convocacao_id", convocacao.id),
  ]);

  const convocacaoAtletaIds = ((caData ?? []) as ConvocacaoAtletaRow[]).map((c) => c.atleta_id);
  const comissao = ((ccData ?? []) as (ConvocacaoComissaoRow & { pessoa: ComissaoTecnicaRow | null })[])
    .map((c) => c.pessoa)
    .filter((p): p is ComissaoTecnicaRow => Boolean(p));

  let atletas: AtletaRow[] = [];
  if (convocacaoAtletaIds.length > 0) {
    const { data: atletasData } = await supabase.from("atletas").select("*").in("id", convocacaoAtletaIds);
    atletas = (atletasData ?? []) as AtletaRow[];
  }

  return { jogo, convocacao, atletas, comissao };
}
