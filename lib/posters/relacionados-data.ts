import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type { AtletaRow, ConvocacaoAtletaRow, ConvocacaoRow, JogoRow } from "@/lib/supabase/types";
import { buildConfrontoTexto } from "./jogo-texto";

export interface RelacionadosData {
  jogo: JogoRow;
  adversarioLogoUrl: string | null;
  confrontoTexto: string;
  dadosJogoTexto: string;
  colunaEsquerda: string[];
  colunaDireita: string[];
}

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function diaDaSemana(dataIso: string): string {
  // "T12:00:00" evita problema de fuso puxando pro dia anterior ao interpretar "YYYY-MM-DD" como
  // UTC meia-noite.
  const data = new Date(`${dataIso}T12:00:00`);
  return DIAS_SEMANA[data.getDay()];
}

export function formatDataBr(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatHorario(horario: string | null): string | null {
  if (!horario) return null;
  return horario.slice(0, 5).replace(":", "h");
}

/**
 * Busca tudo que o pôster de Relacionados precisa: dados do jogo, escudo do adversário e a lista
 * de atletas convocados (só atletas — comissão técnica e staff não entram nesse pôster, decisão
 * tomada com o Mateus), mostrados pelo apelido (ou nome completo, se ele ainda não tiver apelido
 * cadastrado). Devolve `null` quando o jogo não existe ou ainda não tem convocação salva.
 */
export async function buildRelacionadosData(jogoId: string): Promise<RelacionadosData | null> {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos").select("*").eq("id", jogoId).single();
  if (!jogoData) return null;
  const jogo = jogoData as JogoRow;

  const { data: convocacaoData } = await supabase
    .from("convocacoes")
    .select("*")
    .eq("jogo_id", jogoId)
    .maybeSingle();
  if (!convocacaoData) return null;
  const convocacao = convocacaoData as ConvocacaoRow;

  const [{ data: caData }, adversarioLogoUrl] = await Promise.all([
    supabase.from("convocacao_atletas").select("*, atleta:atletas(*)").eq("convocacao_id", convocacao.id),
    getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
  ]);

  const convocados = (caData ?? []) as (ConvocacaoAtletaRow & { atleta: AtletaRow })[];
  const nomes = convocados
    .map((c) => c.atleta)
    .sort((a, b) => (a.numero_camisa ?? 999) - (b.numero_camisa ?? 999))
    .map((atleta) => (atleta.apelido?.trim() || atleta.nome_completo).toUpperCase());

  const meio = Math.ceil(nomes.length / 2);

  const partesDados = [diaDaSemana(jogo.data_jogo)];
  let linha2 = formatDataBr(jogo.data_jogo);
  const horarioFormatado = formatHorario(jogo.horario);
  if (horarioFormatado) linha2 += ` às ${horarioFormatado}`;
  if (jogo.rodada_fase) linha2 += ` - ${jogo.rodada_fase}`;
  partesDados.push(linha2);
  if (jogo.local_estadio) partesDados.push(jogo.local_estadio);

  return {
    jogo,
    adversarioLogoUrl,
    confrontoTexto: buildConfrontoTexto(jogo),
    dadosJogoTexto: partesDados.join(" | "),
    colunaEsquerda: nomes.slice(0, meio),
    colunaDireita: nomes.slice(meio),
  };
}
