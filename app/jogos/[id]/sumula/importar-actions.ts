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
import type { AtletaRow, SumulaEventoTipo, SumulaTempo } from "@/lib/supabase/types";

/**
 * Importação de súmula em PDF pra aba Súmula do jogo (ver
 * docs/superpowers/specs/2026-08-04-integracao-fpf-design.md, seção "Fluxo: importar súmula" —
 * adicionada como resposta ao bloqueio de IP do domínio principal da FPF: o usuário cola o link
 * do PDF da súmula oficial, publicada num domínio diferente (`conteudo.fpf.org.br`), a gente lê
 * e sugere o preenchimento, ele revisa e confirma.
 *
 * Quando o jogo JÁ tem uma Convocação salva, ela continua sendo a fonte de verdade de quem jogou
 * (nunca é sobrescrita por essa importação) — o universo de candidatos ao vínculo de cada
 * gol/cartão/substituição é só esse grupo já convocado.
 *
 * Quando o jogo AINDA NÃO tem Convocação, a importação agora também sugere uma (ver
 * docs/superpowers/specs/2026-10-26-importacao-sumula-auto-convocacao-design.md): uma primeira
 * versão dessa ideia comparava contra o elenco inteiro com o matcher só por nome e foi abandonada
 * (muito "sem sugestão", virava bagunça — comentário histórico removido daqui). A retomada usa a
 * relação completa de jogadores que a própria súmula já traz (titular/reserva, ver
 * `SumulaPdfJogador` em lib/fpf/sumula-pdf.ts) e o matcher por número de registro FPF, bem mais
 * preciso — e, de qualquer forma, passa pela revisão do usuário antes de qualquer coisa ser salva
 * (ver `convocacaoSugerida` abaixo e `importar-sumula-form.tsx`).
 *
 * Só o time do Juventus tem os eventos vinculados a um atleta nosso — gols do adversário também
 * são importados, mas sem vínculo (só o nome como veio da súmula, ver `nome_adversario` em
 * `sumula_eventos`), já que esses jogadores não existem no nosso cadastro.
 */

const NOME_JUVENTUS_PARCIAL = "juventus";

function ehLadoJuventus(equipe: string): boolean {
  return equipe.toLowerCase().includes(NOME_JUVENTUS_PARCIAL);
}

/** Pra quem esse gol realmente conta — normalmente é o lado de quem marcou (`gol.equipe`), mas um
 * gol contra ("CT") é sempre ao contrário: um jogador do Paulista fazendo gol contra é um gol A
 * FAVOR do Juventus, não um "gol do adversário". Bug real visto em produção: um "CT" marcado por
 * um jogador do time adversário estava sendo contado como gol do adversário, invertendo o placar
 * sugerido (3x1 virava 2x2). Essa função centraliza essa inversão pra não repetir a lógica em cada
 * lugar que precisa saber "de quem" é o gol (contagem de placar sugerido e a lista de eventos). */
function golFavoreceJuventus(gol: { equipe: string; tipo: SumulaPdfEventoTipoGol }): boolean {
  const marcadoPeloJuventus = ehLadoJuventus(gol.equipe);
  return gol.tipo === "contra" ? !marcadoPeloJuventus : marcadoPeloJuventus;
}

export interface PreviaEventoImportado {
  tipo: SumulaEventoTipo;
  minuto: number;
  tempo: SumulaTempo;
  descricao: string;
  atletaId: string | null;
  atletaEntrouId: string | null;
  nomeAdversario: string | null;
  /** true só no caso de gol contra de um jogador ADVERSÁRIO que favorece o Juventus — pra tela de
   * revisão não rotular como "Gol (adversário)" (que soa como gol do time deles) mesmo tendo
   * `nomeAdversario` preenchido (precisa desse campo porque quem marcou não é atleta nosso). */
  contraFavoreceJuventus: boolean;
}

export interface PreviaImportacaoSumula {
  competicao: string | null;
  rodada: string | null;
  data: string | null;
  /** Placar bruto extraído da súmula, na ordem mandante/visitante DA PARTIDA (não sabemos aqui se
   * o Juventus foi mandante ou visitante) — o cliente, que já tem o jogo carregado, decide qual é
   * qual. Quando não foi possível extrair o placar do texto, cai pra contagem de linhas de gol
   * encontradas (menos confiável, mas melhor que nada). */
  placarMandante: number | null;
  placarVisitante: number | null;
  golsJuventusContagem: number;
  golsAdversarioContagem: number;
  /** Duração sugerida de cada tempo (45min regulamentar + acréscimo, quando a súmula informa o
   * campo "Acréscimo: X min") — pré-preenche o placar/duração da Súmula. Cai pro que já estava
   * salvo (ou 45min) quando a súmula não tem esse campo. */
  duracaoPrimeiroTempoSugerida: number;
  duracaoSegundoTempoSugerida: number;
  /** Diagnóstico: linhas do PDF que mencionam "1º/2º Tempo" ou "Acréscimo" — mostrado na revisão
   * só quando o acréscimo não foi reconhecido automaticamente, pra o usuário poder conferir o que
   * a súmula realmente diz (ver nota em lib/fpf/sumula-pdf.ts sobre a falta de confirmação
   * byte-a-byte do formato real). */
  linhasDuracaoEncontradas: string[];
  eventos: PreviaEventoImportado[];
  linkPdf: string;
  /** Convocação sugerida a partir da relação completa de jogadores da súmula (titular/reserva),
   * usando o mesmo matcher por nome/registro FPF dos demais eventos — só preenchida quando esse
   * jogo AINDA NÃO tem uma Convocação salva (ver comentário no topo do arquivo). Quando o jogo já
   * tem Convocação, vem `null` e a tela não mostra essa seção — a Convocação existente nunca é
   * sobrescrita por essa importação. */
  convocacaoSugerida: ConvocacaoSugeridaPrevia | null;
}

/** Uma linha da relação de jogadores da súmula (titular ou reserva), já com a sugestão de vínculo
 * — mesma ideia de `PreviaEventoImportado.atletaId`, mas pra montar a Convocação em vez de um
 * evento. `atletaId: null` quando o matcher não achou um atleta nosso com confiança suficiente
 * (ver `sugerirAtleta`); a tela de revisão deixa escolher manualmente nesse caso. */
export interface JogadorConvocacaoSugerido {
  nomePdf: string;
  numeroPdf: number;
  atletaId: string | null;
}

export interface ConvocacaoSugeridaPrevia {
  titulares: JogadorConvocacaoSugerido[];
  reservas: JogadorConvocacaoSugerido[];
}

export interface PreviaImportacaoResultado {
  erro?: string;
  dados?: PreviaImportacaoSumula;
}

function paraAtletaParaMatch(a: AtletaRow): AtletaParaMatch {
  return { id: a.id, nome_completo: a.nome_completo, numero_fpf: a.numero_fpf };
}

/** Busca e faz o parsing do PDF, e sugere o vínculo de cada evento do lado do Juventus — com quem
 * já está convocado nesse jogo quando existe Convocação, ou com o elenco inteiro (mais a própria
 * sugestão de Convocação) quando ainda não existe. Não grava nada no banco ainda — só devolve a
 * prévia pra revisão. */
export async function buscarPreviaImportacaoSumula(
  jogoId: string,
  linkPdf: string,
): Promise<PreviaImportacaoResultado> {
  const url = linkPdf.trim();
  if (!url) return { erro: "Cole o link do PDF da súmula." };
  if (!/^https?:\/\//i.test(url)) return { erro: "O link precisa começar com http:// ou https://." };

  const supabase = createClient();
  const { data: convocacao } = await supabase
    .from("convocacoes")
    .select("id")
    .eq("jogo_id", jogoId)
    .maybeSingle();

  // Elenco completo — universo de candidatos ao vínculo quando ainda não existe Convocação pra
  // esse jogo, e também a base pra montar a sugestão de Convocação em si (ver
  // `convocacaoSugerida` mais abaixo).
  const { data: atletasCompletosData } = await supabase
    .from("atletas")
    .select("id, nome_completo, numero_fpf")
    .eq("categoria", "profissional");
  const atletasCompletos = ((atletasCompletosData ?? []) as AtletaRow[]).map(paraAtletaParaMatch);

  // Uma Convocação "existe" mas sem nenhum atleta selecionado (linha órfã em `convocacoes`, sem
  // `convocacao_atletas`) não carrega nenhuma informação real pra proteger — trata exatamente
  // igual a "não existe Convocação" pra fins de sugestão automática (senão a importação ficava
  // bloqueada à toa, por exemplo depois de limpar uma Convocação errada pra testar de novo).
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
    // Sem Convocação (ou com Convocação vazia): usa o elenco inteiro como universo de candidatos
    // ao vínculo dos eventos (era bloqueado antes — ver comentário no topo do arquivo) — liberado
    // agora porque a sugestão de Convocação abaixo, que usa esse mesmo elenco com o matcher de
    // maior precisão, passa pela revisão do usuário antes de qualquer coisa ser salva.
    convocados = atletasCompletos;
  }

  let dadosPdf: SumulaPdfDados;
  try {
    const texto = await baixarTextoSumulaPdf(url);
    dadosPdf = parsearSumulaPdf(texto);
  } catch (erro) {
    const mensagem = erro instanceof SumulaPdfError ? erro.message : "Erro inesperado ao ler o PDF.";
    return { erro: mensagem };
  }

  // Duração real de cada tempo: usa o acréscimo que a própria súmula informa (45min regulamentar +
  // acréscimo) quando disponível — senão cai pro que já estava salvo pra esse jogo, ou 45min como
  // padrão. Usa a duração do 1º tempo assim resolvida (não só o padrão) pra converter o "relógio
  // corrido" da súmula (ex: "79:00 2T") pro minuto relativo que a nossa Súmula guarda internamente
  // (ver `converterMinutoPdfParaRelativo` em lib/fpf/sumula-pdf.ts) — os dois cálculos precisam
  // usar a MESMA duração, senão o minuto salvo fica inconsistente com a duração salva.
  const { data: sumulaExistente } = await supabase
    .from("sumulas")
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

  // Cruza pelo nome da relação de jogadores (parseada internamente, mas não exposta na revisão —
  // ver comentário no topo do arquivo) só pra pegar o número de registro FPF, quando disponível,
  // e melhorar a precisão do vínculo por nome.
  const registroPorNomeNormalizado = new Map(
    dadosPdf.jogadores.map((j) => [j.nome.toLowerCase().trim(), j.registroFpfNumero]),
  );
  function sugerirPorNome(nome: string): string | null {
    const registro = registroPorNomeNormalizado.get(nome.toLowerCase().trim()) ?? null;
    return sugerirAtleta(nome, registro, convocados).atletaId;
  }

  // Convocação sugerida a partir da relação completa de jogadores da súmula — só quando o jogo
  // ainda não tem Convocação salva (ver `PreviaImportacaoSumula.convocacaoSugerida`). Usa sempre o
  // elenco completo (nesse caso `convocados` já é o próprio elenco completo, mas isso deixa
  // explícito) e o matcher de maior precisão disponível — número de registro FPF, quando a súmula
  // traz (ver `sugerirAtleta`).
  const convocacaoSugerida: ConvocacaoSugeridaPrevia | null = convocacaoTemAtletas
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

  const eventos: PreviaEventoImportado[] = [];

  for (const gol of dadosPdf.gols) {
    const minutoRelativo = converterMinutoPdfParaRelativo(gol.minuto, gol.tempo, duracaoPrimeiroTempo);
    const marcadoPeloJuventus = ehLadoJuventus(gol.equipe);
    const favoreceJuventus = golFavoreceJuventus(gol);

    if (marcadoPeloJuventus && gol.tipo === "contra") {
      // Gol contra de um jogador NOSSO favorece o adversário — não é um "gol" nosso, e não dá pra
      // vincular ao atleta que marcou (ia contar errado como gol dele na Artilharia). Fica de fora
      // da importação automática; lança manualmente se precisar registrar o placar certo.
      continue;
    }

    if (!favoreceJuventus) {
      // Gol do adversário (marcado normalmente por eles) — importa sem vínculo de atleta, só com
      // o nome como veio da súmula.
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
      // Gol contra de um jogador DO ADVERSÁRIO — favorece o Juventus, mas quem marcou não é
      // atleta nosso (não dá pra vincular). Ainda assim precisa contar pro nosso placar, então
      // importa como um "gol nosso" sem atleta vinculado, deixando claro na descrição que foi
      // contra do adversário — bug real visto em produção: isso estava caindo no branco de "gol
      // do adversário" e invertendo o placar sugerido.
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
    // No layout de tabela em que nome e equipe vêm colados (ver `nomeComEquipe` em
    // lib/fpf/sumula-pdf.ts), tira o nome do clube do fim antes de tentar casar com o elenco —
    // senão "Fulano de Tal Juventus SAF" atrapalharia a sugestão por nome.
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

  // Usa golFavoreceJuventus (não só o lado que marcou) pra não repetir o bug do placar invertido
  // quando um gol contra do adversário favorece o Juventus (ou vice-versa).
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
      convocacaoSugerida,
    },
  };
}

export interface ConfirmacaoEvento {
  tipo: SumulaEventoTipo;
  minuto: number;
  tempo: SumulaTempo;
  atletaId: string | null;
  atletaEntrouId: string | null;
  nomeAdversario: string | null;
  incluido: boolean;
  /** Além de rotular certo na tela de revisão (ver `PreviaEventoImportado`), `confirmarImportacaoSumula`
   * grava esse valor em `sumula_eventos.gol_contra_favor_juventus` — sem isso, depois de salvo, um
   * gol contra do adversário (a favor) ficava indistinguível de um gol normal do adversário na aba
   * Súmula (bug real de produção: os dois apareciam como "Gol adversário"). */
  contraFavoreceJuventus: boolean;
}

/** Uma linha revisada da Convocação sugerida (ver `ConvocacaoSugeridaPrevia`) — `atletaId: null`
 * significa "não vincular esse nome" (igual a `SeletorAtleta` nos eventos), e nesse caso a linha
 * simplesmente não entra na Convocação criada. */
export interface ConfirmacaoJogadorConvocacao {
  atletaId: string | null;
  status: "titular" | "reserva";
}

export interface ConfirmarImportacaoInput {
  jogoId: string;
  linkPdf: string;
  golsPro: number | null;
  golsContra: number | null;
  duracaoPrimeiroTempo: number;
  duracaoSegundoTempo: number;
  eventos: ConfirmacaoEvento[];
  /** Convocação revisada a partir de `PreviaImportacaoSumula.convocacaoSugerida` — só enviada
   * quando o jogo ainda não tinha Convocação salva no momento da prévia. `null`/ausente quando já
   * existia uma (nesse caso ela nunca é tocada por essa importação). */
  novaConvocacao?: ConfirmacaoJogadorConvocacao[] | null;
}

export interface ConfirmarImportacaoResultado {
  erro?: string;
  sucesso?: boolean;
  eventosImportados?: number;
}

/** Grava o que foi confirmado na revisão. Substitui os eventos da súmula desse jogo pelos dados
 * confirmados a partir do PDF (a súmula oficial é tratada como fonte de verdade dessa parte).
 * Quando `input.novaConvocacao` vem preenchida (jogo ainda não tinha Convocação no momento da
 * prévia — ver `PreviaImportacaoSumula.convocacaoSugerida`), também cria a Convocação com o que
 * foi revisado; quando o jogo já tinha uma, ela nunca é tocada por essa importação. */
export async function confirmarImportacaoSumula(
  input: ConfirmarImportacaoInput,
): Promise<ConfirmarImportacaoResultado> {
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
    // meio-tempo (ver "Manter como está" na spec). Uma linha "órfã" em `convocacoes` sem nenhum
    // `convocacao_atletas` (ex.: sobrou de uma limpeza manual pra testar de novo) conta como vazia
    // — não é um motivo pra bloquear, por isso usa upsert (não insert) pra reaproveitar essa linha
    // em vez de falhar por conflito de `jogo_id`.
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

  revalidatePath(`/jogos/${input.jogoId}/sumula`);
  revalidatePath(`/jogos/${input.jogoId}`);
  revalidatePath(`/jogos/${input.jogoId}/fpf`);
  revalidatePath("/jogos");
  if (convocacaoCriada) revalidatePath(`/jogos/${input.jogoId}/convocacao`);

  return { sucesso: true, eventosImportados: eventosParaGravar.length };
}
