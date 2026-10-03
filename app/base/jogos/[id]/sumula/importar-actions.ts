"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  baixarTextoSumulaPdf,
  converterMinutoPdfParaRelativo,
  parsearSumulaPdf,
  SumulaPdfError,
  type SumulaPdfDados,
  type SumulaPdfEventoTipoGol,
} from "@/lib/fpf/sumula-pdf";
import { sugerirAtleta, type AtletaParaMatch } from "@/lib/fpf/atleta-match";
import type { AtletaBaseRow, SumulaEventoTipo, SumulaTempo } from "@/lib/supabase/types";

/**
 * Espelha app/jogos/[id]/sumula/importar-actions.ts (Profissional) para o Futebol de Base — ver
 * docs/superpowers/specs/2026-10-03-importacao-sumula-base-design.md. A leitura/parsing do PDF
 * (lib/fpf/sumula-pdf.ts) e a sugestão de vínculo de atleta (lib/fpf/atleta-match.ts) são
 * genéricas e reaproveitadas sem alteração — só as tabelas-fonte mudam (_base).
 */

const NOME_JUVENTUS_PARCIAL = "juventus";

function ehLadoJuventus(equipe: string): boolean {
  return equipe.toLowerCase().includes(NOME_JUVENTUS_PARCIAL);
}

/** Ver comentário da função homônima no Profissional — mesma lógica, gol contra sempre inverte de
 * quem favorece. */
function golFavoreceJuventus(gol: { equipe: string; tipo: SumulaPdfEventoTipoGol }): boolean {
  const marcadoPeloJuventus = ehLadoJuventus(gol.equipe);
  return gol.tipo === "contra" ? !marcadoPeloJuventus : marcadoPeloJuventus;
}

export interface PreviaEventoImportadoBase {
  tipo: SumulaEventoTipo;
  minuto: number;
  tempo: SumulaTempo;
  descricao: string;
  atletaId: string | null;
  atletaEntrouId: string | null;
  nomeAdversario: string | null;
  contraFavoreceJuventus: boolean;
}

export interface PreviaImportacaoSumulaBase {
  competicao: string | null;
  rodada: string | null;
  data: string | null;
  placarMandante: number | null;
  placarVisitante: number | null;
  golsJuventusContagem: number;
  golsAdversarioContagem: number;
  duracaoPrimeiroTempoSugerida: number;
  duracaoSegundoTempoSugerida: number;
  linhasDuracaoEncontradas: string[];
  eventos: PreviaEventoImportadoBase[];
  linkPdf: string;
}

export interface PreviaImportacaoResultadoBase {
  erro?: string;
  dados?: PreviaImportacaoSumulaBase;
}

function paraAtletaParaMatch(a: AtletaBaseRow): AtletaParaMatch {
  return { id: a.id, nome_completo: a.nome_completo, numero_fpf: a.numero_fpf };
}

/** Busca e faz o parsing do PDF, e sugere o vínculo de cada evento do lado do Juventus com quem já
 * está convocado nesse jogo da Base. Não grava nada no banco ainda — só devolve a prévia pra
 * revisão. Exige que a Convocação do jogo já esteja salva (é o universo de candidatos ao vínculo). */
export async function buscarPreviaImportacaoSumulaBase(
  jogoId: string,
  linkPdf: string,
): Promise<PreviaImportacaoResultadoBase> {
  const url = linkPdf.trim();
  if (!url) return { erro: "Cole o link do PDF da súmula." };
  if (!/^https?:\/\//i.test(url)) return { erro: "O link precisa começar com http:// ou https://." };

  const supabase = createClient();
  const { data: convocacao } = await supabase
    .from("convocacoes_base")
    .select("id")
    .eq("jogo_id", jogoId)
    .maybeSingle();
  if (!convocacao) {
    return { erro: "Salve a Convocação desse jogo primeiro — a importação usa os atletas já convocados pra vincular os eventos." };
  }

  const { data: caData } = await supabase
    .from("convocacao_atletas_base")
    .select("atleta_id")
    .eq("convocacao_id", convocacao.id);
  const idsConvocados = (caData ?? []).map((r) => r.atleta_id as string);
  if (idsConvocados.length === 0) {
    return { erro: "A convocação desse jogo ainda não tem nenhum atleta selecionado." };
  }

  const { data: atletasData } = await supabase
    .from("atletas_base")
    .select("id, nome_completo, numero_fpf")
    .in("id", idsConvocados);
  const convocados = ((atletasData ?? []) as AtletaBaseRow[]).map(paraAtletaParaMatch);

  let dadosPdf: SumulaPdfDados;
  try {
    const texto = await baixarTextoSumulaPdf(url);
    dadosPdf = parsearSumulaPdf(texto);
  } catch (erro) {
    const mensagem = erro instanceof SumulaPdfError ? erro.message : "Erro inesperado ao ler o PDF.";
    return { erro: mensagem };
  }

  const { data: sumulaExistente } = await supabase
    .from("sumulas_base")
    .select("duracao_primeiro_tempo, duracao_segundo_tempo")
    .eq("jogo_id", jogoId)
    .maybeSingle();
  const duracaoPrimeiroTempo =
    dadosPdf.acrescimoPrimeiroTempo != null
      ? 45 + dadosPdf.acrescimoPrimeiroTempo
      : (sumulaExistente?.duracao_primeiro_tempo ?? 45);
  const duracaoSegundoTempo =
    dadosPdf.acrescimoSegundoTempo != null
      ? 45 + dadosPdf.acrescimoSegundoTempo
      : (sumulaExistente?.duracao_segundo_tempo ?? 45);

  const registroPorNomeNormalizado = new Map(
    dadosPdf.jogadores.map((j) => [j.nome.toLowerCase().trim(), j.registroFpfNumero]),
  );
  function sugerirPorNome(nome: string): string | null {
    const registro = registroPorNomeNormalizado.get(nome.toLowerCase().trim()) ?? null;
    return sugerirAtleta(nome, registro, convocados).atletaId;
  }

  const eventos: PreviaEventoImportadoBase[] = [];

  for (const gol of dadosPdf.gols) {
    const minutoRelativo = converterMinutoPdfParaRelativo(gol.minuto, gol.tempo, duracaoPrimeiroTempo);
    const marcadoPeloJuventus = ehLadoJuventus(gol.equipe);
    const favoreceJuventus = golFavoreceJuventus(gol);

    if (marcadoPeloJuventus && gol.tipo === "contra") {
      continue;
    }

    if (!favoreceJuventus) {
      eventos.push({
        tipo: "gol",
        minuto: minutoRelativo,
        tempo: gol.tempo,
        descricao: `Gol do adversário — ${gol.nome}`,
        atletaId: null,
        atletaEntrouId: null,
        nomeAdversario: gol.nome,
        contraFavoreceJuventus: false,
      });
      continue;
    }

    if (!marcadoPeloJuventus) {
      eventos.push({
        tipo: "gol",
        minuto: minutoRelativo,
        tempo: gol.tempo,
        descricao: `Gol contra do adversário (a favor) — ${gol.nome}`,
        atletaId: null,
        atletaEntrouId: null,
        nomeAdversario: gol.nome,
        contraFavoreceJuventus: true,
      });
      continue;
    }

    eventos.push({
      tipo: "gol",
      minuto: minutoRelativo,
      tempo: gol.tempo,
      descricao: `Gol${gol.tipo === "penalti" ? " (pênalti)" : gol.tipo === "falta" ? " (falta)" : ""} — ${gol.nome}`,
      atletaId: sugerirPorNome(gol.nome),
      atletaEntrouId: null,
      nomeAdversario: null,
      contraFavoreceJuventus: false,
    });
  }

  for (const cartao of dadosPdf.cartoes) {
    if (!ehLadoJuventus(cartao.equipe)) continue;
    const nomeCartao = cartao.nomeComEquipe
      ? cartao.nome.replace(/\s*juventus\b.*$/i, "").trim() || cartao.nome
      : cartao.nome;
    eventos.push({
      tipo: cartao.cor === "amarelo" ? "cartao_amarelo" : "cartao_vermelho",
      minuto: converterMinutoPdfParaRelativo(cartao.minuto, cartao.tempo, duracaoPrimeiroTempo),
      tempo: cartao.tempo,
      descricao: `Cartão ${cartao.cor} — ${nomeCartao}`,
      atletaId: sugerirPorNome(nomeCartao),
      atletaEntrouId: null,
      nomeAdversario: null,
      contraFavoreceJuventus: false,
    });
  }

  for (const sub of dadosPdf.substituicoes) {
    if (!ehLadoJuventus(sub.equipe)) continue;
    eventos.push({
      tipo: "substituicao",
      minuto: converterMinutoPdfParaRelativo(sub.minuto, sub.tempo, duracaoPrimeiroTempo),
      tempo: sub.tempo,
      descricao: `Saiu ${sub.nomeSaiu}, entrou ${sub.nomeEntrou}`,
      atletaId: sugerirPorNome(sub.nomeSaiu),
      atletaEntrouId: sugerirPorNome(sub.nomeEntrou),
      nomeAdversario: null,
      contraFavoreceJuventus: false,
    });
  }

  eventos.sort((a, b) => (a.tempo === b.tempo ? a.minuto - b.minuto : a.tempo === "primeiro" ? -1 : 1));

  const golsJuventusPdf = dadosPdf.gols.filter((g) => golFavoreceJuventus(g)).length;
  const golsAdversarioPdf = dadosPdf.gols.filter((g) => !golFavoreceJuventus(g)).length;

  return {
    dados: {
      competicao: dadosPdf.competicao,
      rodada: dadosPdf.rodada,
      data: dadosPdf.data,
      placarMandante: dadosPdf.placarMandante,
      placarVisitante: dadosPdf.placarVisitante,
      golsJuventusContagem: golsJuventusPdf,
      golsAdversarioContagem: golsAdversarioPdf,
      duracaoPrimeiroTempoSugerida: duracaoPrimeiroTempo,
      duracaoSegundoTempoSugerida: duracaoSegundoTempo,
      linhasDuracaoEncontradas: dadosPdf.linhasDuracaoEncontradas,
      eventos,
      linkPdf: url,
    },
  };
}

export interface ConfirmacaoEventoBase {
  tipo: SumulaEventoTipo;
  minuto: number;
  tempo: SumulaTempo;
  atletaId: string | null;
  atletaEntrouId: string | null;
  nomeAdversario: string | null;
  incluido: boolean;
  contraFavoreceJuventus: boolean;
}

export interface ConfirmarImportacaoInputBase {
  jogoId: string;
  linkPdf: string;
  golsPro: number | null;
  golsContra: number | null;
  duracaoPrimeiroTempo: number;
  duracaoSegundoTempo: number;
  eventos: ConfirmacaoEventoBase[];
}

export interface ConfirmarImportacaoResultadoBase {
  erro?: string;
  sucesso?: boolean;
  eventosImportados?: number;
}

/** Grava o que foi confirmado na revisão. Substitui os eventos da súmula desse jogo pelos dados
 * confirmados a partir do PDF — não mexe na Convocação, que continua sendo mantida separadamente
 * pelo usuário. */
export async function confirmarImportacaoSumulaBase(
  input: ConfirmarImportacaoInputBase,
): Promise<ConfirmarImportacaoResultadoBase> {
  if (!input.jogoId) return { erro: "Jogo não identificado. Recarregue a página e tente novamente." };

  const supabase = createClient();

  const { error: jogoError } = await supabase
    .from("jogos_base")
    .update({
      ...(input.golsPro != null ? { gols_pro: input.golsPro } : {}),
      ...(input.golsContra != null ? { gols_contra: input.golsContra } : {}),
      fpf_link_sumula: input.linkPdf,
    })
    .eq("id", input.jogoId);
  if (jogoError) return { erro: "Não foi possível atualizar o placar do jogo." };

  const { data: sumula, error: sumulaError } = await supabase
    .from("sumulas_base")
    .upsert(
      {
        jogo_id: input.jogoId,
        duracao_primeiro_tempo: input.duracaoPrimeiroTempo,
        duracao_segundo_tempo: input.duracaoSegundoTempo,
      },
      { onConflict: "jogo_id" },
    )
    .select("id")
    .single();
  if (sumulaError || !sumula) return { erro: "Não foi possível salvar a súmula." };

  await supabase.from("sumula_eventos_base").delete().eq("sumula_id", sumula.id);

  const eventosParaGravar = input.eventos.filter(
    (e) => e.incluido && (e.atletaId != null || e.nomeAdversario != null),
  );
  if (eventosParaGravar.length > 0) {
    const { error: eventosError } = await supabase.from("sumula_eventos_base").insert(
      eventosParaGravar.map((e, i) => ({
        sumula_id: sumula.id,
        tipo: e.tipo,
        tempo: e.tempo,
        minuto: e.minuto,
        atleta_id: e.atletaId,
        atleta_entrou_id: e.tipo === "substituicao" ? e.atletaEntrouId : null,
        atleta_assistencia_id: null,
        nome_adversario: e.nomeAdversario,
        gol_contra_favor_juventus: e.contraFavoreceJuventus,
        ordem: i,
      })),
    );
    if (eventosError) return { erro: "Não foi possível salvar os eventos da súmula." };
  }

  revalidatePath(`/base/jogos/${input.jogoId}/sumula`);
  revalidatePath(`/base/jogos/${input.jogoId}`);
  revalidatePath("/base/jogos");

  return { sucesso: true, eventosImportados: eventosParaGravar.length };
}
