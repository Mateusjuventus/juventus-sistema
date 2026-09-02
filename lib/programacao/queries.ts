import type { createClient } from "@/lib/supabase/server";
import type { CategoriaBase } from "@/lib/auth/categorias-base";
import type {
  ProgramacaoAtividadeRow,
  ProgramacaoSubatividadeRow,
  ProgramacaoCatalogoSubatividadeRow,
  JogoBaseRow,
} from "@/lib/supabase/types";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { somarDias } from "./semana";

/** Só os campos de `jogos_base` que a grade/exportação precisam pra mostrar o card do jogo (escudo,
 * adversário, horário, local, competição) — nunca duplicados em `programacao_atividades` (ver
 * spec, "Atividade de jogo não duplica dado"). `adversarioLogoUrl` já vem resolvida (signed URL,
 * 1h) pra quem chama não precisar do client do Supabase de novo. */
export type JogoResumoAtividade = Pick<
  JogoBaseRow,
  | "id"
  | "adversario_nome"
  | "adversario_logo_path"
  | "data_jogo"
  | "horario"
  | "local_estadio"
  | "mandante"
  | "competicao"
  | "rodada_fase"
> & { adversarioLogoUrl: string | null };

const CAMPOS_JOGO_RESUMO =
  "id, adversario_nome, adversario_logo_path, data_jogo, horario, local_estadio, mandante, competicao, rodada_fase";

async function resolverLogos(
  supabase: ReturnType<typeof createClient>,
  jogos: Omit<JogoResumoAtividade, "adversarioLogoUrl">[],
): Promise<JogoResumoAtividade[]> {
  const urls = await Promise.all(jogos.map((j) => getSignedPhotoUrl(supabase, j.adversario_logo_path)));
  return jogos.map((jogo, i) => ({ ...jogo, adversarioLogoUrl: urls[i] }));
}

export interface AtividadeComDetalhes extends ProgramacaoAtividadeRow {
  subatividades: ProgramacaoSubatividadeRow[];
  /** Só presente quando `tipo` é 'jogo_oficial'/'jogo_treino' e o jogo referenciado por `jogo_id`
   * ainda existe em `jogos_base`. */
  jogo: JogoResumoAtividade | null;
}

/**
 * Miolo compartilhado por `buscarSemana` e `buscarDia` — atividades de uma categoria num intervalo
 * de datas (inclusive nas duas pontas), com as subatividades já agrupadas por atividade e, quando
 * `tipo` é 'jogo_oficial'/'jogo_treino', os dados de verdade do jogo (nunca duplicados aqui).
 *
 * Não faz nenhuma checagem de permissão — quem chama (Server Component de `/treinador` ou `/base`,
 * Início da Base, ou uma Server Action como `copiarDiaProgramacao`) já resolveu `categoria` a
 * partir de `getCategoriasProgramacao()` antes de chegar aqui, do mesmo jeito que as demais telas
 * de categoria do sistema fazem hoje.
 */
async function buscarAtividadesComDetalhes(
  supabase: ReturnType<typeof createClient>,
  categoria: CategoriaBase,
  dataInicio: string,
  dataFim: string,
): Promise<AtividadeComDetalhes[]> {
  const { data: atividadesData } = await supabase
    .from("programacao_atividades")
    .select("*")
    .eq("categoria", categoria)
    .gte("data", dataInicio)
    .lte("data", dataFim)
    .order("data", { ascending: true })
    .order("horario_inicio", { ascending: true });
  const atividades = (atividadesData ?? []) as ProgramacaoAtividadeRow[];
  if (atividades.length === 0) return [];

  const atividadeIds = atividades.map((a) => a.id);
  const { data: subatividadesData } = await supabase
    .from("programacao_subatividades")
    .select("*")
    .in("atividade_id", atividadeIds)
    .order("created_at", { ascending: true });
  const subatividades = (subatividadesData ?? []) as ProgramacaoSubatividadeRow[];

  const jogoIds = [...new Set(atividades.map((a) => a.jogo_id).filter((id): id is string => Boolean(id)))];
  let jogos: JogoResumoAtividade[] = [];
  if (jogoIds.length > 0) {
    const { data: jogosData } = await supabase.from("jogos_base").select(CAMPOS_JOGO_RESUMO).in("id", jogoIds);
    jogos = await resolverLogos(supabase, (jogosData ?? []) as Omit<JogoResumoAtividade, "adversarioLogoUrl">[]);
  }

  return atividades.map((atividade) => ({
    ...atividade,
    subatividades: subatividades.filter((s) => s.atividade_id === atividade.id),
    jogo: atividade.jogo_id ? (jogos.find((j) => j.id === atividade.jogo_id) ?? null) : null,
  }));
}

/** Atividades de uma categoria numa semana (Segunda a Domingo, a partir de `dataInicioSemana` — ver
 * `inicioDaSemana` em `./semana`). */
export async function buscarSemana(
  supabase: ReturnType<typeof createClient>,
  categoria: CategoriaBase,
  dataInicioSemana: string,
): Promise<AtividadeComDetalhes[]> {
  return buscarAtividadesComDetalhes(supabase, categoria, dataInicioSemana, somarDias(dataInicioSemana, 6));
}

/** Atividades de UM dia só de uma categoria — usada por `copiarDiaProgramacao` (ver
 * `lib/programacao/actions.ts`), que só precisa do dia de origem, não da semana inteira. */
export async function buscarDia(
  supabase: ReturnType<typeof createClient>,
  categoria: CategoriaBase,
  data: string,
): Promise<AtividadeComDetalhes[]> {
  return buscarAtividadesComDetalhes(supabase, categoria, data, data);
}

/** Catálogo de subatividades reutilizáveis de uma categoria — alimenta o dropdown "Importar" do
 * formulário de Nova Subatividade (ver spec, "Catálogo não é modificado ao ser usado"). */
export async function buscarCatalogo(
  supabase: ReturnType<typeof createClient>,
  categoria: CategoriaBase,
): Promise<ProgramacaoCatalogoSubatividadeRow[]> {
  const { data } = await supabase
    .from("programacao_catalogo_subatividades")
    .select("*")
    .eq("categoria", categoria)
    .order("nome", { ascending: true });
  return (data ?? []) as ProgramacaoCatalogoSubatividadeRow[];
}

/** Jogos já cadastrados de uma categoria, pro seletor do formulário de Nova Atividade quando o tipo
 * é 'jogo_oficial'/'jogo_treino' — evita digitar de novo dados que já existem em `jogos_base`. */
export async function buscarJogosParaSelecao(
  supabase: ReturnType<typeof createClient>,
  categoria: CategoriaBase,
): Promise<JogoResumoAtividade[]> {
  const { data } = await supabase
    .from("jogos_base")
    .select(CAMPOS_JOGO_RESUMO)
    .eq("categoria", categoria)
    .order("data_jogo", { ascending: false });
  return resolverLogos(supabase, (data ?? []) as Omit<JogoResumoAtividade, "adversarioLogoUrl">[]);
}
