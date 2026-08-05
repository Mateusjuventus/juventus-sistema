"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { baixarTextoSumulaPdf, parsearSumulaPdf, SumulaPdfError, type SumulaPdfDados } from "@/lib/fpf/sumula-pdf";
import { sugerirAtleta, type AtletaParaMatch, type ConfiancaMatch } from "@/lib/fpf/atleta-match";
import type { AtletaRow, SumulaEventoTipo, SumulaTempo } from "@/lib/supabase/types";

/**
 * Importação de súmula em PDF pra aba Súmula do jogo (ver
 * docs/superpowers/specs/2026-08-04-integracao-fpf-design.md, seção "Fluxo: importar súmula" —
 * adicionada como resposta ao bloqueio de IP do domínio principal da FPF: o usuário cola o link
 * do PDF da súmula oficial, publicada num domínio diferente (`conteudo.fpf.org.br`), a gente lê
 * e sugere o preenchimento, ele revisa e confirma.
 *
 * Dois passos, dois server actions:
 * 1. `buscarPreviaImportacaoSumula` — só lê e sugere, não grava nada.
 * 2. `confirmarImportacaoSumula` — grava o que o usuário confirmou/corrigiu na revisão.
 *
 * Só filtra e sugere vínculo pra eventos e jogadores do lado do Juventus — os dados do time
 * adversário aparecem no PDF mas não interessam ao nosso banco.
 */

const NOME_JUVENTUS_PARCIAL = "juventus";

export interface PreviaJogadorImportado {
  numero: number;
  nome: string;
  titular: boolean;
  registroFpfNumero: number | null;
  atletaSugeridoId: string | null;
  confianca: ConfiancaMatch;
}

export interface PreviaEventoImportado {
  tipo: SumulaEventoTipo;
  minuto: number;
  tempo: SumulaTempo;
  descricao: string;
  atletaId: string | null;
  atletaEntrouId: string | null;
}

export interface PreviaImportacaoSumula {
  competicao: string | null;
  rodada: string | null;
  data: string | null;
  placarMandante: number | null;
  placarVisitante: number | null;
  mandante: boolean;
  jogadores: PreviaJogadorImportado[];
  eventos: PreviaEventoImportado[];
  avisos: string[];
  linkPdf: string;
}

export interface PreviaImportacaoResultado {
  erro?: string;
  dados?: PreviaImportacaoSumula;
}

function paraAtletaParaMatch(a: AtletaRow): AtletaParaMatch {
  return { id: a.id, nome_completo: a.nome_completo, numero_fpf: a.numero_fpf };
}

function ehLadoJuventus(equipe: string): boolean {
  return equipe.toLowerCase().includes(NOME_JUVENTUS_PARCIAL);
}

/** Busca e faz o parsing do PDF, sugere vínculo de cada jogador/evento do lado do Juventus com o
 * elenco cadastrado. Não grava nada no banco ainda — só devolve a prévia pra revisão. */
export async function buscarPreviaImportacaoSumula(
  _jogoId: string,
  linkPdf: string,
): Promise<PreviaImportacaoResultado> {
  const url = linkPdf.trim();
  if (!url) return { erro: "Cole o link do PDF da súmula." };
  if (!/^https?:\/\//i.test(url)) return { erro: "O link precisa começar com http:// ou https://." };

  let dadosPdf: SumulaPdfDados;
  try {
    const texto = await baixarTextoSumulaPdf(url);
    dadosPdf = parsearSumulaPdf(texto);
  } catch (erro) {
    const mensagem = erro instanceof SumulaPdfError ? erro.message : "Erro inesperado ao ler o PDF.";
    return { erro: mensagem };
  }

  const supabase = createClient();
  const { data: atletasData } = await supabase.from("atletas").select("id, nome_completo, numero_fpf");
  const atletas = ((atletasData ?? []) as AtletaRow[]).map(paraAtletaParaMatch);

  const avisos = [...dadosPdf.avisos];

  const jogadores: PreviaJogadorImportado[] = [];
  for (const jogador of dadosPdf.jogadores) {
    const sugestao = sugerirAtleta(jogador.nome, jogador.registroFpfNumero, atletas);
    // Descarta silenciosamente jogadores sem nenhuma correspondência plausível — quase sempre são
    // o elenco do time adversário, que também aparece na relação de jogadores do PDF (ver
    // comentário em lib/fpf/sumula-pdf.ts sobre não conseguirmos separar por time nessa seção).
    if (sugestao.confianca === "nenhuma" && sugestao.pontuacao < 0.15) continue;
    jogadores.push({
      numero: jogador.numero,
      nome: jogador.nome,
      titular: jogador.titular,
      registroFpfNumero: jogador.registroFpfNumero,
      atletaSugeridoId: sugestao.atletaId,
      confianca: sugestao.confianca,
    });
  }

  const registroPorNomeNormalizado = new Map(
    dadosPdf.jogadores.map((j) => [j.nome.toLowerCase().trim(), j.registroFpfNumero]),
  );
  function sugerirPorNome(nome: string): string | null {
    const registro = registroPorNomeNormalizado.get(nome.toLowerCase().trim()) ?? null;
    return sugerirAtleta(nome, registro, atletas).atletaId;
  }

  const eventos: PreviaEventoImportado[] = [];

  for (const gol of dadosPdf.gols) {
    if (!ehLadoJuventus(gol.equipe)) continue;
    if (gol.tipo === "contra") {
      avisos.push(
        `Gol contra de ${gol.nome} (${gol.minuto}') não foi importado automaticamente — lance manualmente se necessário, pra não registrar errado quem marcou a favor.`,
      );
      continue;
    }
    eventos.push({
      tipo: "gol",
      minuto: gol.minuto,
      tempo: gol.tempo,
      descricao: `Gol${gol.tipo === "penalti" ? " (pênalti)" : gol.tipo === "falta" ? " (falta)" : ""} — ${gol.nome}`,
      atletaId: sugerirPorNome(gol.nome),
      atletaEntrouId: null,
    });
  }

  for (const cartao of dadosPdf.cartoes) {
    if (!ehLadoJuventus(cartao.equipe)) continue;
    eventos.push({
      tipo: cartao.cor === "amarelo" ? "cartao_amarelo" : "cartao_vermelho",
      minuto: cartao.minuto,
      tempo: cartao.tempo,
      descricao: `Cartão ${cartao.cor} — ${cartao.nome}`,
      atletaId: sugerirPorNome(cartao.nome),
      atletaEntrouId: null,
    });
  }

  for (const sub of dadosPdf.substituicoes) {
    if (!ehLadoJuventus(sub.equipe)) continue;
    eventos.push({
      tipo: "substituicao",
      minuto: sub.minuto,
      tempo: sub.tempo,
      descricao: `Saiu ${sub.nomeSaiu}, entrou ${sub.nomeEntrou}`,
      atletaId: sugerirPorNome(sub.nomeSaiu),
      atletaEntrouId: sugerirPorNome(sub.nomeEntrou),
    });
  }

  eventos.sort((a, b) => (a.tempo === b.tempo ? a.minuto - b.minuto : a.tempo === "primeiro" ? -1 : 1));

  return {
    dados: {
      competicao: dadosPdf.competicao,
      rodada: dadosPdf.rodada,
      data: dadosPdf.data,
      placarMandante: dadosPdf.placarMandante,
      placarVisitante: dadosPdf.placarVisitante,
      mandante: false, // preenchido pelo cliente a partir do jogo já carregado na página
      jogadores,
      eventos,
      avisos,
      linkPdf: url,
    },
  };
}

export interface ConfirmacaoJogador {
  numero: number;
  nome: string;
  titular: boolean;
  atletaId: string | null;
}

export interface ConfirmacaoEvento {
  tipo: SumulaEventoTipo;
  minuto: number;
  tempo: SumulaTempo;
  atletaId: string | null;
  atletaEntrouId: string | null;
}

export interface ConfirmarImportacaoInput {
  jogoId: string;
  linkPdf: string;
  golsPro: number | null;
  golsContra: number | null;
  jogadores: ConfirmacaoJogador[];
  eventos: ConfirmacaoEvento[];
}

export interface ConfirmarImportacaoResultado {
  erro?: string;
  sucesso?: boolean;
  jogadoresImportados?: number;
  eventosImportados?: number;
}

/** Grava o que foi confirmado na revisão. Substitui a convocação e os eventos da súmula desse
 * jogo pelos dados vindos do PDF (a súmula oficial é tratada como fonte de verdade de quem
 * jogou) — jogadores/eventos sem vínculo confirmado (atletaId null) são simplesmente ignorados. */
export async function confirmarImportacaoSumula(
  input: ConfirmarImportacaoInput,
): Promise<ConfirmarImportacaoResultado> {
  if (!input.jogoId) return { erro: "Jogo não identificado. Recarregue a página e tente novamente." };

  const supabase = createClient();

  const { error: jogoError } = await supabase
    .from("jogos")
    .update({
      ...(input.golsPro != null ? { gols_pro: input.golsPro } : {}),
      ...(input.golsContra != null ? { gols_contra: input.golsContra } : {}),
      fpf_link_sumula: input.linkPdf,
    })
    .eq("id", input.jogoId);
  if (jogoError) return { erro: "Não foi possível atualizar o placar do jogo." };

  const jogadoresVinculados = input.jogadores.filter(
    (j): j is ConfirmacaoJogador & { atletaId: string } => j.atletaId != null,
  );

  const { data: convocacao, error: convocacaoError } = await supabase
    .from("convocacoes")
    .upsert({ jogo_id: input.jogoId }, { onConflict: "jogo_id" })
    .select("id")
    .single();
  if (convocacaoError || !convocacao) return { erro: "Não foi possível salvar a convocação a partir da súmula." };

  await supabase.from("convocacao_atletas").delete().eq("convocacao_id", convocacao.id);
  if (jogadoresVinculados.length > 0) {
    const { error: caError } = await supabase.from("convocacao_atletas").insert(
      jogadoresVinculados.map((j) => ({
        convocacao_id: convocacao.id,
        atleta_id: j.atletaId,
        status: j.titular ? "titular" : "reserva",
      })),
    );
    if (caError) return { erro: "Não foi possível salvar a escalação a partir da súmula." };
  }

  const { data: sumula, error: sumulaError } = await supabase
    .from("sumulas")
    .upsert({ jogo_id: input.jogoId }, { onConflict: "jogo_id" })
    .select("id")
    .single();
  if (sumulaError || !sumula) return { erro: "Não foi possível salvar a súmula." };

  await supabase.from("sumula_eventos").delete().eq("sumula_id", sumula.id);

  const eventosParaGravar = input.eventos.filter((e) => e.atletaId != null);
  if (eventosParaGravar.length > 0) {
    const { error: eventosError } = await supabase.from("sumula_eventos").insert(
      eventosParaGravar.map((e, i) => ({
        sumula_id: sumula.id,
        tipo: e.tipo,
        tempo: e.tempo,
        minuto: e.minuto,
        atleta_id: e.atletaId,
        atleta_entrou_id: e.tipo === "substituicao" ? e.atletaEntrouId : null,
        atleta_assistencia_id: null,
        ordem: i,
      })),
    );
    if (eventosError) return { erro: "Não foi possível salvar os eventos da súmula." };
  }

  revalidatePath(`/jogos/${input.jogoId}/sumula`);
  revalidatePath(`/jogos/${input.jogoId}/convocacao`);
  revalidatePath(`/jogos/${input.jogoId}`);
  revalidatePath(`/jogos/${input.jogoId}/fpf`);

  return {
    sucesso: true,
    jogadoresImportados: jogadoresVinculados.length,
    eventosImportados: eventosParaGravar.length,
  };
}
