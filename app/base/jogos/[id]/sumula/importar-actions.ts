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
import type { AtletaRow, CompeticaoBaseRow, CompeticaoJogoBaseRow, SumulaEventoTipo, SumulaTempo } from "@/lib/supabase/types";

/**
 * Espelha app/jogos/[id]/sumula/importar-actions.ts (Profissional) para o Futebol de Base — ver
 * docs/superpowers/specs/2026-10-03-importacao-sumula-base-design.md e docs/superpowers/specs/
 * 2026-10-26-importacao-sumula-auto-convocacao-design.md (sugestão de Convocação a partir da
 * súmula). A leitura/parsing do PDF (lib/fpf/sumula-pdf.ts) e a sugestão de vínculo de atleta
 * (lib/fpf/atleta-match.ts) são genéricas e reaproveitadas sem alteração — só as tabelas-fonte
 * mudam (_base), e a Base também pré-preenche `numero_camisa` na Convocação sugerida a partir do
 * número que a súmula traz pra cada jogador (Profissional não tem esse campo — a numeração lá é
 * fixa por atleta, não por convocação).
 *
 * Suporte a 3º tempo e a pênaltis (ver docs/superpowers/specs/2026-10-21-competicoes-formato-
 * partida-design.md): a busca do formato de partida (vínculo com `competicoes_base`) espelha
 * exatamente a mesma consulta de app/base/jogos/[id]/sumula/page.tsx — se um dia os dois
 * precisarem de mais lógica em comum vale extrair um helper, mas por enquanto é só essas duas
 * queries, então mantemos cada arquivo independente (padrão já usado no resto do módulo de Jogos).
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
  /** Só preenchida quando `temTerceiroTempo` é true — ver docs/superpowers/specs/2026-10-21-
   * competicoes-formato-partida-design.md. */
  duracaoTerceiroTempoSugerida: number | null;
  /** Jogo vinculado a uma competição com `numero_tempos = 3` (Sub-11/12/13/14) — mostra o campo
   * de duração do 3º tempo e os eventos lançados nele. */
  temTerceiroTempo: boolean;
  /** Placar da disputa de pênaltis trazido pela súmula ("Resultado Pênalti: A X B"), na convenção
   * mandante × visitante — `null` quando o jogo não foi a pênaltis ou a súmula não traz esse
   * campo. A tela converte pra Juventus/adversário usando `mandante`, igual já faz com o placar. */
  penaltisMandante: number | null;
  penaltisVisitante: number | null;
  linhasDuracaoEncontradas: string[];
  eventos: PreviaEventoImportadoBase[];
  linkPdf: string;
  /** Ver `ConvocacaoSugeridaPrevia` (mesma ideia do Profissional) — só preenchida quando esse jogo
   * ainda não tem Convocação salva. */
  convocacaoSugerida: ConvocacaoSugeridaPreviaBase | null;
}

/** Ver `JogadorConvocacaoSugerido` (Profissional) — aqui também carrega `numeroPdf`, usado pra
 * pré-preencher `numero_camisa` (só existe na Base, numerado por convocação, não por atleta). */
export interface JogadorConvocacaoSugeridoBase {
  nomePdf: string;
  numeroPdf: number;
  atletaId: string | null;
}

export interface ConvocacaoSugeridaPreviaBase {
  titulares: JogadorConvocacaoSugeridoBase[];
  reservas: JogadorConvocacaoSugeridoBase[];
}

export interface PreviaImportacaoResultadoBase {
  erro?: string;
  dados?: PreviaImportacaoSumulaBase;
}

function paraAtletaParaMatch(a: AtletaRow): AtletaParaMatch {
  return { id: a.id, nome_completo: a.nome_completo, numero_fpf: a.numero_fpf };
}

/** Busca e faz o parsing do PDF, e sugere o vínculo de cada evento do lado do Juventus — com quem
 * já está convocado nesse jogo da Base quando existe Convocação, ou com o elenco inteiro da
 * categoria (mais a própria sugestão de Convocação) quando ainda não existe. Não grava nada no
 * banco ainda — só devolve a prévia pra revisão. */
export async function buscarPreviaImportacaoSumulaBase(
  jogoId: string,
  linkPdf: string,
): Promise<PreviaImportacaoResultadoBase> {
  const url = linkPdf.trim();
  if (!url) return { erro: "Cole o link do PDF da súmula." };
  if (!/^https?:\/\//i.test(url)) return { erro: "O link precisa começar com http:// ou https://." };

  const supabase = createClient();
  const { data: convocacao } = await supabase
    .from("convocacoes")
    .select("id")
    .eq("jogo_id", jogoId)
    .maybeSingle();

  // Precisa da categoria do jogo pra filtrar o elenco completo (atletas_base tem todas as
  // categorias juntas) — mesma consulta de app/base/jogos/[id]/sumula/page.tsx.
  const { data: jogoBaseData } = await supabase.from("jogos").select("categoria").eq("id", jogoId).maybeSingle();
  const categoria = (jogoBaseData?.categoria as string | undefined) ?? null;

  // Elenco completo DA CATEGORIA — universo de candidatos ao vínculo quando ainda não existe
  // Convocação pra esse jogo, e também a base pra montar a sugestão de Convocação em si (ver
  // `convocacaoSugerida` mais abaixo).
  const { data: atletasCompletosData } = categoria
    ? await supabase.from("atletas").select("id, nome_completo, numero_fpf").eq("categoria", categoria)
    : { data: [] as AtletaRow[] };
  const atletasCompletos = ((atletasCompletosData ?? []) as AtletaRow[]).map(paraAtletaParaMatch);

  // Uma Convocação "existe" mas sem nenhum atleta selecionado (linha órfã em `convocacoes`,
  // sem `convocacao_atletas_base`) não carrega nenhuma informação real pra proteger — trata
  // exatamente igual a "não existe Convocação" pra fins de sugestão automática (senão a
  // importação ficava bloqueada à toa, por exemplo depois de limpar uma Convocação errada pra
  // testar de novo).
  let idsConvocadosExistentes: string[] = [];
  if (convocacao) {
    const { data: caData } = await supabase
      .from("convocacao_atletas")
      .select("atleta_id")
      .eq("convocacao_id", convocacao.id);
    idsConvocadosExistentes = (caData ?? []).map((r) => r.atleta_id as string);
  }
  const convocacaoTemAtletas = idsConvocadosExistentes.length > 0;

  let convocados: AtletaParaMatch[];
  if (convocacaoTemAtletas) {
    convocados = atletasCompletos.filter((a) => idsConvocadosExistentes.includes(a.id));
  } else {
    // Sem Convocação (ou com Convocação vazia): usa o elenco inteiro da categoria como universo de
    // candidatos ao vínculo dos eventos (era bloqueado antes — ver comentário no topo do arquivo)
    // — liberado agora porque a sugestão de Convocação abaixo, que usa esse mesmo elenco com o
    // matcher de maior precisão, passa pela revisão do usuário antes de qualquer coisa ser salva.
    convocados = atletasCompletos;
  }

  // Formato de partida (3º tempo, duração de cada tempo) — mesma consulta de
  // app/base/jogos/[id]/sumula/page.tsx. A maioria dos jogos não está vinculada a nenhuma
  // competição com essas regras: nesse caso segue tudo exatamente como antes (2 tempos de 45min).
  const { data: vinculoData } = await supabase
    .from("competicao_jogos_base")
    .select("competicao_id")
    .eq("jogo_id", jogoId)
    .maybeSingle();
  let competicaoFormato: CompeticaoBaseRow | null = null;
  if (vinculoData) {
    const { data: competicaoData } = await supabase
      .from("competicoes_base")
      .select("*")
      .eq("id", (vinculoData as Pick<CompeticaoJogoBaseRow, "competicao_id">).competicao_id)
      .maybeSingle();
    competicaoFormato = competicaoData as CompeticaoBaseRow | null;
  }
  const temTerceiroTempo = competicaoFormato?.numero_tempos === 3;
  const duracaoPadraoTempo1 = competicaoFormato?.duracao_tempo_1_minutos ?? 45;
  const duracaoPadraoTempo2 = competicaoFormato?.duracao_tempo_2_minutos ?? 45;
  const duracaoPadraoTempo3 = competicaoFormato?.duracao_tempo_3_minutos ?? 45;

  let dadosPdf: SumulaPdfDados;
  try {
    const texto = await baixarTextoSumulaPdf(url);
    dadosPdf = parsearSumulaPdf(texto, {
      tempo1: duracaoPadraoTempo1,
      tempo2: duracaoPadraoTempo2,
      tempo3: duracaoPadraoTempo3,
    });
  } catch (erro) {
    const mensagem = erro instanceof SumulaPdfError ? erro.message : "Erro inesperado ao ler o PDF.";
    return { erro: mensagem };
  }

  const { data: sumulaExistente } = await supabase
    .from("sumulas")
    .select("duracao_primeiro_tempo, duracao_segundo_tempo, duracao_terceiro_tempo")
    .eq("jogo_id", jogoId)
    .maybeSingle();
  const duracaoPrimeiroTempo =
    dadosPdf.acrescimoPrimeiroTempo != null
      ? duracaoPadraoTempo1 + dadosPdf.acrescimoPrimeiroTempo
      : (sumulaExistente?.duracao_primeiro_tempo ?? duracaoPadraoTempo1);
  const duracaoSegundoTempo =
    dadosPdf.acrescimoSegundoTempo != null
      ? duracaoPadraoTempo2 + dadosPdf.acrescimoSegundoTempo
      : (sumulaExistente?.duracao_segundo_tempo ?? duracaoPadraoTempo2);
  const duracaoTerceiroTempo = !temTerceiroTempo
    ? null
    : dadosPdf.acrescimoTerceiroTempo != null
      ? duracaoPadraoTempo3 + dadosPdf.acrescimoTerceiroTempo
      : (sumulaExistente?.duracao_terceiro_tempo ?? duracaoPadraoTempo3);

  const registroPorNomeNormalizado = new Map(
    dadosPdf.jogadores.map((j) => [j.nome.toLowerCase().trim(), j.registroFpfNumero]),
  );
  function sugerirPorNome(nome: string): string | null {
    const registro = registroPorNomeNormalizado.get(nome.toLowerCase().trim()) ?? null;
    return sugerirAtleta(nome, registro, convocados).atletaId;
  }

  // Convocação sugerida a partir da relação completa de jogadores da súmula — só quando o jogo
  // ainda não tem Convocação salva (ver `PreviaImportacaoSumulaBase.convocacaoSugerida`). Mesma
  // lógica do Profissional (ver comentário lá) — aqui `numeroPdf` também pré-preenche
  // `numero_camisa` na confirmação.
  const convocacaoSugerida: ConvocacaoSugeridaPreviaBase | null = convocacaoTemAtletas
    ? null
    : {
        titulares: dadosPdf.jogadores
          .filter((j) => j.titular)
          .map((j) => ({
            nomePdf: j.nome,
            numeroPdf: j.numero,
            atletaId: sugerirAtleta(j.nome, j.registroFpfNumero, atletasCompletos).atletaId,
          })),
        reservas: dadosPdf.jogadores
          .filter((j) => !j.titular)
          .map((j) => ({
            nomePdf: j.nome,
            numeroPdf: j.numero,
            atletaId: sugerirAtleta(j.nome, j.registroFpfNumero, atletasCompletos).atletaId,
          })),
      };

  const eventos: PreviaEventoImportadoBase[] = [];

  for (const gol of dadosPdf.gols) {
    const minutoRelativo = converterMinutoPdfParaRelativo(gol.minuto, gol.tempo, duracaoPrimeiroTempo, duracaoSegundoTempo);
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
      minuto: converterMinutoPdfParaRelativo(cartao.minuto, cartao.tempo, duracaoPrimeiroTempo, duracaoSegundoTempo),
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
      minuto: converterMinutoPdfParaRelativo(sub.minuto, sub.tempo, duracaoPrimeiroTempo, duracaoSegundoTempo),
      tempo: sub.tempo,
      descricao: `Saiu ${sub.nomeSaiu}, entrou ${sub.nomeEntrou}`,
      atletaId: sugerirPorNome(sub.nomeSaiu),
      atletaEntrouId: sugerirPorNome(sub.nomeEntrou),
      nomeAdversario: null,
      contraFavoreceJuventus: false,
    });
  }

  // Comparador antigo (`a.tempo === "primeiro" ? -1 : 1`) só dava conta de 2 tempos — não é
  // simétrico com 3 (comparar "segundo" com "terceiro" ia e voltava dependendo da ordem dos
  // argumentos). `ORDEM_TEMPO` resolve isso pros três casos de uma vez.
  const ORDEM_TEMPO: Record<SumulaTempo, number> = { primeiro: 0, segundo: 1, terceiro: 2 };
  eventos.sort((a, b) => (a.tempo === b.tempo ? a.minuto - b.minuto : ORDEM_TEMPO[a.tempo] - ORDEM_TEMPO[b.tempo]));

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
      duracaoTerceiroTempoSugerida: duracaoTerceiroTempo,
      temTerceiroTempo,
      penaltisMandante: dadosPdf.penaltisMandante,
      penaltisVisitante: dadosPdf.penaltisVisitante,
      linhasDuracaoEncontradas: dadosPdf.linhasDuracaoEncontradas,
      eventos,
      linkPdf: url,
      convocacaoSugerida,
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

/** Ver `ConfirmacaoJogadorConvocacao` (Profissional) — aqui também carrega `numeroCamisa`, usado
 * pra pré-preencher `convocacao_atletas_base.numero_camisa` com o número que a súmula trouxer pra
 * esse jogador (o usuário pode revisar depois na própria tela de Convocação). */
export interface ConfirmacaoJogadorConvocacaoBase {
  atletaId: string | null;
  status: "titular" | "reserva";
  numeroCamisa: number | null;
}

export interface ConfirmarImportacaoInputBase {
  jogoId: string;
  linkPdf: string;
  golsPro: number | null;
  golsContra: number | null;
  duracaoPrimeiroTempo: number;
  duracaoSegundoTempo: number;
  /** Só enviado quando o jogo tem 3º tempo (ver `PreviaImportacaoSumulaBase.temTerceiroTempo`). */
  duracaoTerceiroTempo: number | null;
  /** Placar da disputa de pênaltis, já convertido pra Juventus/adversário (ver
   * `PreviaImportacaoSumulaBase.penaltisMandante`/`penaltisVisitante`) — `null` quando o jogo não
   * foi a pênaltis. */
  penaltisPro: number | null;
  penaltisContra: number | null;
  eventos: ConfirmacaoEventoBase[];
  /** Convocação revisada a partir de `PreviaImportacaoSumulaBase.convocacaoSugerida` — só enviada
   * quando o jogo ainda não tinha Convocação salva no momento da prévia. `null`/ausente quando já
   * existia uma (nesse caso ela nunca é tocada por essa importação). */
  novaConvocacao?: ConfirmacaoJogadorConvocacaoBase[] | null;
}

export interface ConfirmarImportacaoResultadoBase {
  erro?: string;
  sucesso?: boolean;
  eventosImportados?: number;
}

/** Grava o que foi confirmado na revisão. Substitui os eventos da súmula desse jogo pelos dados
 * confirmados a partir do PDF. Quando `input.novaConvocacao` vem preenchida (jogo ainda não tinha
 * Convocação no momento da prévia — ver `PreviaImportacaoSumulaBase.convocacaoSugerida`), também
 * cria a Convocação com o que foi revisado (incluindo `numero_camisa` quando a súmula trouxer);
 * quando o jogo já tinha uma, ela nunca é tocada por essa importação. */
export async function confirmarImportacaoSumulaBase(
  input: ConfirmarImportacaoInputBase,
): Promise<ConfirmarImportacaoResultadoBase> {
  if (!input.jogoId) return { erro: "Jogo não identificado. Recarregue a página e tente novamente." };

  const supabase = createClient();

  let convocacaoCriada = false;
  if (input.novaConvocacao && input.novaConvocacao.length > 0) {
    const { data: convocacaoExistente } = await supabase
      .from("convocacoes")
      .select("id")
      .eq("jogo_id", input.jogoId)
      .maybeSingle();
    // Defensivo: só preenche se a Convocação realmente não tem nenhum atleta ainda — nunca
    // sobrescreve uma que já tenha sido salva (com atleta selecionado) manualmente nesse
    // meio-tempo (ver "Manter como está" na spec). Uma linha "órfã" em `convocacoes` sem
    // nenhum `convocacao_atletas_base` (ex.: sobrou de uma limpeza manual pra testar de novo)
    // conta como vazia — não é um motivo pra bloquear, por isso usa upsert (não insert) pra
    // reaproveitar essa linha em vez de falhar por conflito de `jogo_id`.
    let convocacaoTemAtletas = false;
    if (convocacaoExistente) {
      const { count } = await supabase
        .from("convocacao_atletas")
        .select("atleta_id", { count: "exact", head: true })
        .eq("convocacao_id", convocacaoExistente.id);
      convocacaoTemAtletas = (count ?? 0) > 0;
    }
    if (!convocacaoTemAtletas) {
      const { data: novaConv, error: convError } = await supabase
        .from("convocacoes")
        .upsert({ jogo_id: input.jogoId }, { onConflict: "jogo_id" })
        .select("id")
        .single();
      if (!convError && novaConv) {
        const atletasValidos = input.novaConvocacao.filter((a) => a.atletaId != null);
        if (atletasValidos.length > 0) {
          await supabase.from("convocacao_atletas").insert(
            atletasValidos.map((a) => ({
              convocacao_id: novaConv.id,
              atleta_id: a.atletaId as string,
              status: a.status,
              numero_camisa: a.numeroCamisa,
            })),
          );
        }
        convocacaoCriada = true;
      }
    }
  }

  const { error: jogoError } = await supabase
    .from("jogos")
    .update({
      ...(input.golsPro != null ? { gols_pro: input.golsPro } : {}),
      ...(input.golsContra != null ? { gols_contra: input.golsContra } : {}),
      penaltis_pro: input.penaltisPro,
      penaltis_contra: input.penaltisContra,
      fpf_link_sumula: input.linkPdf,
    })
    .eq("id", input.jogoId);
  if (jogoError) return { erro: "Não foi possível atualizar o placar do jogo." };

  const { data: sumula, error: sumulaError } = await supabase
    .from("sumulas")
    .upsert(
      {
        jogo_id: input.jogoId,
        duracao_primeiro_tempo: input.duracaoPrimeiroTempo,
        duracao_segundo_tempo: input.duracaoSegundoTempo,
        duracao_terceiro_tempo: input.duracaoTerceiroTempo,
      },
      { onConflict: "jogo_id" },
    )
    .select("id")
    .single();
  if (sumulaError || !sumula) return { erro: "Não foi possível salvar a súmula." };

  await supabase.from("sumula_eventos").delete().eq("sumula_id", sumula.id);

  const eventosParaGravar = input.eventos.filter(
    (e) => e.incluido && (e.atletaId != null || e.nomeAdversario != null),
  );
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
  if (convocacaoCriada) {
    revalidatePath(`/base/jogos/${input.jogoId}/convocacao`);
    revalidatePath(`/treinador/jogos/${input.jogoId}/convocacao`);
  }

  return { sucesso: true, eventosImportados: eventosParaGravar.length };
}
