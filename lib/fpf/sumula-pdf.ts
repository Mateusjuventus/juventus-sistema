/**
 * Leitura e parsing de súmulas oficiais em PDF publicadas pela FPF (domínio `conteudo.fpf.org.br`
 * — diferente do domínio `futebolpaulista.com.br/Handlers/*` usado pelo resto da integração, que
 * está bloqueando chamadas vindas do nosso servidor (ver docs/superpowers/specs/2026-08-04-integracao-fpf-design.md,
 * seção sobre o bloqueio de IP). O usuário cola o link do PDF (ex: o campo `LinkSumula` de um jogo,
 * ou o link que a própria FPF mostra na Tabela) na aba Súmula do jogo, e a gente faz o resto.
 *
 * O texto de uma súmula é 100% extraível (não é PDF escaneado/imagem) — confirmado analisando
 * súmulas reais publicadas. A estrutura abaixo (rótulos, formato de cada linha) foi levantada
 * analisando o conteúdo de súmulas reais de diferentes competições (Copa São Paulo, Campeonato
 * Paulista), então é consistente entre competições — mas como não conseguimos capturar o texto
 * bruto byte-a-byte (nosso ambiente de desenvolvimento não tem acesso de rede a esse domínio pra
 * testar localmente), o parser é DELIBERADAMENTE tolerante: cada linha que não bate com o padrão
 * esperado é simplesmente ignorada (contabilizada em `avisos`) em vez de quebrar o import inteiro.
 * O lançamento manual de eventos (aba Súmula, formulário já existente) continua sempre disponível
 * como caminho alternativo pra qualquer coisa que o parser não reconheça.
 */

import { extractText, getDocumentProxy } from "unpdf";

export class SumulaPdfError extends Error {
  constructor(
    message: string,
    readonly causa?: unknown,
  ) {
    super(message);
    this.name = "SumulaPdfError";
  }
}

/** Baixa o PDF e devolve o texto extraído (todas as páginas concatenadas). */
export async function baixarTextoSumulaPdf(url: string): Promise<string> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JuventusSAF-Sistema/1.0)" },
    });
  } catch (erro) {
    throw new SumulaPdfError("Não foi possível baixar o PDF (falha de rede). Confira o link.", erro);
  }
  if (!resposta.ok) {
    throw new SumulaPdfError(
      `Não foi possível baixar o PDF (o link respondeu HTTP ${resposta.status}). Confira se o link está correto e público.`,
    );
  }
  const contentType = resposta.headers.get("content-type") ?? "";
  const buffer = await resposta.arrayBuffer();
  if (!contentType.includes("pdf") && buffer.byteLength < 200) {
    throw new SumulaPdfError("O link não parece apontar pra um PDF válido.");
  }

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } catch (erro) {
    throw new SumulaPdfError("Não foi possível ler o conteúdo do PDF. Ele pode estar corrompido ou num formato inesperado.", erro);
  }
}

export type SumulaPdfEventoTipoGol = "normal" | "penalti" | "contra" | "falta";
const TIPO_GOL_POR_SIGLA: Record<string, SumulaPdfEventoTipoGol> = {
  NR: "normal",
  PN: "penalti",
  CT: "contra",
  FT: "falta",
};

export interface SumulaPdfJogador {
  numero: number;
  nome: string;
  titular: boolean;
  registroFpf: string | null;
  /** Parte numérica de `registroFpf` (antes da "/ano"), pra comparar com `atletas.numero_fpf`. */
  registroFpfNumero: number | null;
}

/** "terceiro" só existe nos jogos da Base vinculados a uma competição com `numero_tempos = 3`
 * (Sub-11/12/13/14 — ver docs/superpowers/specs/2026-10-21-competicoes-formato-partida-design.md);
 * no Profissional (e no resto da Base) a súmula nunca traz "3T". */
export type SumulaPdfTempo = "primeiro" | "segundo" | "terceiro";

export interface SumulaPdfGol {
  equipe: string;
  numero: number;
  nome: string;
  tipo: SumulaPdfEventoTipoGol;
  minuto: number;
  tempo: SumulaPdfTempo;
}

export interface SumulaPdfCartao {
  equipe: string;
  numero: number;
  nome: string;
  cor: "amarelo" | "vermelho";
  minuto: number;
  tempo: SumulaPdfTempo;
  /** true quando a linha veio no layout "Tempo Sigla Nº Nome Equipe" e não deu pra separar nome e
   * equipe (ver RE_CARTAO_TEMPO_PRIMEIRO): nesse caso `nome` e `equipe` trazem os dois juntos, e
   * quem consome deve casar por continência em vez de igualdade. */
  nomeComEquipe?: boolean;
}

export interface SumulaPdfSubstituicao {
  equipe: string;
  numeroSaiu: number;
  nomeSaiu: string;
  numeroEntrou: number;
  nomeEntrou: string;
  minuto: number;
  tempo: SumulaPdfTempo;
}

/** Duração padrão (min) de cada tempo, usada só pra resolver o relógio corrido de um evento que
 * vier no formato curto de acréscimo ("+N", ver `MINUTO_ALTERNATIVAS`) — ex: "+2 2T" só vira um
 * minuto absoluto somando ao fim regulamentar do(s) tempo(s) anterior(es), e esse fim depende da
 * duração real da competição (45min no Profissional/Base padrão, 17min no Sub-11/12, 20min no
 * Sub-13/14 — ver docs/superpowers/specs/2026-10-21-competicoes-formato-partida-design.md).
 * `tempo3` só importa quando a súmula é de um jogo de 3 tempos. Default: 45/45/45 (todo o
 * Profissional e a maioria da Base), igual ao comportamento de antes desta função existir. */
export interface SumulaPdfDuracoesTempo {
  tempo1: number;
  tempo2: number;
  tempo3: number;
}

const DURACOES_PADRAO: SumulaPdfDuracoesTempo = { tempo1: 45, tempo2: 45, tempo3: 45 };

export interface SumulaPdfDados {
  competicao: string | null;
  rodada: string | null;
  data: string | null;
  estadio: string | null;
  placarMandante: number | null;
  placarVisitante: number | null;
  /** Minutos de acréscimo de cada tempo, do campo "Acréscimo: X min" da súmula — usado pra
   * sugerir a duração real de cada tempo (duração padrão + acréscimo) na importação, em vez de
   * deixar sempre no padrão. `null` quando não achou esse campo. */
  acrescimoPrimeiroTempo: number | null;
  acrescimoSegundoTempo: number | null;
  /** Só relevante em jogos de 3 tempos (Sub-11/12/13/14) — `null` em todo o resto. */
  acrescimoTerceiroTempo: number | null;
  /** Placar da disputa de pênaltis ("Resultado Pênalti: A X B"), quando a súmula trouxer esse
   * campo — `null` quando o jogo não foi a pênaltis ou a súmula não traz esse dado. Mesma
   * convenção de `placarMandante`/`placarVisitante` (mandante × visitante). */
  penaltisMandante: number | null;
  penaltisVisitante: number | null;
  jogadores: SumulaPdfJogador[];
  gols: SumulaPdfGol[];
  cartoes: SumulaPdfCartao[];
  substituicoes: SumulaPdfSubstituicao[];
  /** Linhas que pareciam pertencer a alguma seção reconhecida mas não bateram com o padrão
   * esperado — mostrado ao usuário como "N linhas não reconhecidas" pra ele saber que pode
   * precisar completar manualmente. */
  avisos: string[];
  /** Diagnóstico: toda linha do PDF que menciona "1º/2º/3º Tempo" ou "Acréscimo", mesmo que não
   * tenha batido com o padrão esperado — como não temos o texto byte-a-byte confirmado de uma
   * súmula real (ver nota no topo do arquivo), isso é exposto na tela de revisão pra o usuário
   * poder copiar e mandar de volta se o acréscimo não for reconhecido automaticamente. */
  linhasDuracaoEncontradas: string[];
}

function normalizarLinhas(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);
}

function campoRotulado(linhas: string[], rotulo: RegExp): string | null {
  for (const linha of linhas) {
    const m = linha.match(rotulo);
    if (m) return m[1].trim();
  }
  return null;
}

const TEMPO_SIGLA: Record<string, SumulaPdfTempo> = { "1T": "primeiro", "2T": "segundo", "3T": "terceiro" };

/** Casa UM jogador dentro da linha — "Nº Nome Completo T/R P/A Registro/Ano", ex: "1 Giovanni
 * Martinez Montanari T A 661239/26". Sem âncoras de início/fim de linha e usada com `matchAll`
 * (flag "g") porque a tabela de escalação real traz os dois times LADO A LADO na mesma linha de
 * texto — ver comentário no loop principal sobre `dentroSecaoJogadores`. */
const RE_JOGADOR = /(\d{1,3})\s+(.+?)\s+(T|R)\s+(A|P)\s+(\d+)\/(\d{2,4})/g;

// O minuto de um evento normalmente vem como "MM:SS" — mas um evento no acréscimo pode vir como
// "+N" (ex: "+2 2T" = 2º minuto do acréscimo do 2º tempo), sem nunca termos confirmado o formato
// exato byte-a-byte (ver observação no topo do arquivo). Cada padrão abaixo aceita as duas formas
// como alternativas dentro do mesmo grupo, resolvidas por `resolverMinutoBruto`.
const MINUTO_ALTERNATIVAS = "(?:(\\d{1,3}):(\\d{2})|\\+\\s*(\\d{1,2}))";

/** "Equipe Nº Nome - (Apelido) Tipo MM:SS 1T/2T/3T" (apelido opcional; "3T" só nos jogos de 3
 * tempos — Sub-11/12/13/14, ver `SumulaPdfTempo`). */
const RE_GOL_COM_APELIDO = new RegExp(
  `^(.+?)\\s+(\\d{1,3})\\s+(.+?)\\s+-\\s+\\([^)]*\\)\\s+(NR|PN|CT|FT)\\s+${MINUTO_ALTERNATIVAS}\\s+(1T|2T|3T)$`,
);
const RE_GOL_SEM_APELIDO = new RegExp(
  `^(.+?)\\s+(\\d{1,3})\\s+(.+?)\\s+(NR|PN|CT|FT)\\s+${MINUTO_ALTERNATIVAS}\\s+(1T|2T|3T)$`,
);

/** "Equipe Nº Nome MM:SS 1T/2T/3T" */
const RE_CARTAO = new RegExp(`^(.+?)\\s+(\\d{1,3})\\s+(.+?)\\s+${MINUTO_ALTERNATIVAS}\\s+(1T|2T|3T)$`);

/**
 * Layout ALTERNATIVO das tabelas de Advertências/Expulsões, visto numa súmula real da Copa
 * Paulista (São Caetano x São José): as colunas vêm na ordem "Tempo | Sigla | Nº | Nome | Equipe",
 * ex.: "05:00 1T 1 Daniel Lamberti São Caetano". O tempo pode ser "-" e a sigla "AJ" (antes do
 * jogo) quando a expulsão acontece fora das duas etapas — foi assim que uma expulsão real deixou
 * de ser contabilizada, porque só existia o padrão com a equipe na frente.
 *
 * Como o extrator de PDF colapsa os espaços entre colunas (ver `normalizarLinhas`), não dá pra
 * separar "Nome" de "Equipe" com segurança nessa ordem — o resto da linha fica junto em
 * `nome`/`equipe`, e quem consome resolve por continência (ver `nomeComEquipe`).
 */
const RE_CARTAO_TEMPO_PRIMEIRO = new RegExp(
  `^(?:${MINUTO_ALTERNATIVAS}|(-))\\s+(1T|2T|3T|AJ|AP|IN)\\s+(\\d{1,3})\\s+(.+)$`,
);

/** "Equipe Nº Saiu Nº Entrou MM:SS 1T/2T/3T" */
const RE_SUBSTITUICAO = new RegExp(
  `^(.+?)\\s+(\\d{1,3})\\s+(.+?)\\s+(\\d{1,3})\\s+(.+?)\\s+${MINUTO_ALTERNATIVAS}\\s+(1T|2T|3T)$`,
);

/** Resolve o minuto bruto (relógio corrido do jogo) a partir das duas formas possíveis vindas do
 * regex — "MM:SS" direto, ou "+N" de acréscimo (nesse caso soma ao fim regulamentar do(s)
 * tempo(s) anterior(es): `duracoes.tempo1` pro 1º tempo, `tempo1+tempo2` pro 2º, etc — ver
 * `SumulaPdfDuracoesTempo`; com a duração padrão (45min) isso dá exatamente "45+2", "90+3", a
 * convenção clássica de futebol). */
function resolverMinutoBruto(
  minutoNormal: string | undefined,
  minutoAcrescimo: string | undefined,
  tempo: SumulaPdfTempo,
  duracoes: SumulaPdfDuracoesTempo,
): number {
  if (minutoNormal != null) return Number(minutoNormal);
  const base =
    tempo === "primeiro"
      ? duracoes.tempo1
      : tempo === "segundo"
        ? duracoes.tempo1 + duracoes.tempo2
        : duracoes.tempo1 + duracoes.tempo2 + duracoes.tempo3;
  return base + Number(minutoAcrescimo);
}

function ehCabecalhoOuVazio(linha: string): boolean {
  return (
    /^n[ºo]\s/i.test(linha) ||
    /^equipe\s/i.test(linha) ||
    /não houve/i.test(linha) ||
    linha.length < 4
  );
}

/**
 * Faz o parsing do texto extraído do PDF. Escaneia o documento inteiro linha a linha e tenta
 * casar cada linha com os padrões conhecidos de cada seção — em vez de tentar delimitar seções
 * por título (que não conseguimos confirmar o texto exato), cada padrão já é específico o
 * suficiente (quantidade de campos, MM:SS, 1T/2T, siglas de gol) pra não ter ambiguidade entre
 * si. Linhas de escalação não têm coluna de equipe (times aparecem agrupados por seção no PDF,
 * mas sem marcação por linha) — por isso o vínculo com atleta é feito depois, comparando contra
 * o elenco cadastrado (ver `lib/fpf/atleta-match.ts`), e não por "lado" do jogo.
 */
export function parsearSumulaPdf(texto: string, duracoesPadrao?: Partial<SumulaPdfDuracoesTempo>): SumulaPdfDados {
  const duracoes: SumulaPdfDuracoesTempo = {
    tempo1: duracoesPadrao?.tempo1 ?? DURACOES_PADRAO.tempo1,
    tempo2: duracoesPadrao?.tempo2 ?? DURACOES_PADRAO.tempo2,
    tempo3: duracoesPadrao?.tempo3 ?? DURACOES_PADRAO.tempo3,
  };
  const linhas = normalizarLinhas(texto);
  const avisos: string[] = [];

  const competicao = campoRotulado(linhas, /Campeonato:?\s*(.+)/i);
  const rodada = campoRotulado(linhas, /Rodada:?\s*(.+)/i);
  const data = campoRotulado(linhas, /^Data:?\s*(\d{2}\/\d{2}\/\d{4})/i);
  const estadio = campoRotulado(linhas, /Est[aá]dio:?\s*(.+)/i);

  // "Jogo: Ibrachina FC X Juventus SAF" — nomes dos dois times, na ordem mandante X visitante.
  // Precisa estar no INÍCIO da linha e ter " X " no meio pra não casar com o outro "Jogo:" do
  // cabeçalho, que é o número da partida ("...CEAF Jogo: 282 / 2026", sem " X " e não no início da
  // linha). Usada só pra saber qual coluna da tabela de Relação de Jogadores (ver mais abaixo) é a
  // nossa — a MESMA ordem mandante/visitante dessa linha é a ordem das duas colunas da tabela.
  let mandanteNome: string | null = null;
  let visitanteNome: string | null = null;
  const RE_JOGO_TIMES = /^Jogo:\s*(.+?)\s+X\s+(.+)$/i;
  for (const linha of linhas) {
    const mTimes = linha.match(RE_JOGO_TIMES);
    if (mTimes) {
      mandanteNome = mTimes[1].trim();
      visitanteNome = mTimes[2].trim();
      break;
    }
  }
  // `null` quando não deu pra identificar os dois nomes, ou quando nenhum/os dois batem com
  // "juventus" (formato inesperado) — nesse caso a filtragem por time da Relação de Jogadores (ver
  // `dentroSecaoJogadores` mais abaixo) fica desligada, mantendo o comportamento antigo de trazer
  // os jogadores dos dois lados e confiar só no vínculo por nome/registro feito depois.
  const ladoJuventusEhMandante: boolean | null =
    mandanteNome != null && visitanteNome != null
      ? mandanteNome.toLowerCase().includes("juventus")
        ? true
        : visitanteNome.toLowerCase().includes("juventus")
          ? false
          : null
      : null;

  // CONFIRMADO numa súmula real: "Resultado do 1º Tempo: 0 X 0 Resultado do 2º Tempo: 0 X 1" — as
  // duas colunas (1º/2º Tempo) numa linha só, igual ao caso do acréscimo acima. O regex precisa da
  // palavra "do" entre "Resultado" e o tempo (antes só aceitava "Resultado 2º Tempo", sem "do", e
  // por isso nunca batia com o formato real — ficava sempre null, mascarado pela sugestão de
  // placar por contagem de gols na tela de importação). Usa matchAll pra pegar todas as ocorrências
  // e fica com a ÚLTIMA (o "Resultado do Nº Tempo" é o placar final/cumulativo da partida, vem
  // depois dos parciais de cada tempo anterior) — o grupo de tempo não precisa distinguir 1º/2º/3º
  // porque é só um filtro opcional pra não casar em outro lugar; qualquer "Resultado ... : A X B"
  // serve (inclusive "Resultado do 3º Tempo", que já é cumulativo nos jogos de 3 tempos).
  let placarMandante: number | null = null;
  let placarVisitante: number | null = null;
  const RE_RESULTADO = /Resultado\s*(?:do\s*)?(?:[123][ºo]?\s*Tempo)?:?\s*(\d{1,2})\s*[Xx]\s*(\d{1,2})/gi;
  for (const linha of linhas) {
    for (const m of linha.matchAll(RE_RESULTADO)) {
      placarMandante = Number(m[1]);
      placarVisitante = Number(m[2]);
    }
  }

  // "Resultado Pênalti: 12 X 13" (disputa de pênaltis, jogos de mata-mata que empataram) — rótulo
  // tolerante a variações de grafia ("Pênalti"/"Penalti"/"Pênaltis"/"Penaltis"). Mesma convenção
  // mandante × visitante do placar normal.
  let penaltisMandante: number | null = null;
  let penaltisVisitante: number | null = null;
  const RE_RESULTADO_PENALTI = /Resultado\s*P[êe]nalt\w*:?\s*(\d{1,2})\s*[Xx]\s*(\d{1,2})/gi;
  for (const linha of linhas) {
    for (const m of linha.matchAll(RE_RESULTADO_PENALTI)) {
      penaltisMandante = Number(m[1]);
      penaltisVisitante = Number(m[2]);
    }
  }

  const jogadores: SumulaPdfJogador[] = [];
  const gols: SumulaPdfGol[] = [];
  const cartoes: SumulaPdfCartao[] = [];
  const substituicoes: SumulaPdfSubstituicao[] = [];

  // A linha de cartão (RE_CARTAO) tem o mesmo formato pra amarelo e vermelho — "Advertências" e
  // "Expulsões" são seções separadas no documento, então rastreamos qual seção estamos
  // atravessando pra saber a cor certa de cada cartão encontrado.
  let secaoCartaoAtual: "amarelo" | "vermelho" | null = null;
  // CONFIRMADO numa súmula real (Paulista SUB17, Ibrachina FC x Juventus SAF): a tabela de
  // "Relação de Jogadores" também vem com os dois times lado a lado, igual à seção de horários —
  // ver comentário completo mais abaixo, perto de onde essa flag é usada.
  let dentroSecaoJogadores = false;

  // CONFIRMADO numa súmula real (Copa Paulista, jogo Primavera SAF x Juventus SAF): a seção de
  // horários é uma tabela de duas colunas (1º Tempo | 2º Tempo lado a lado), e o extrator de PDF
  // concatena as duas colunas numa linha só, ex:
  //   "Término 1º Tempo: 16:49 Acrésc: 4 min Término 2º Tempo: 17:54 Acrésc: 5 min"
  // — ou seja, os DOIS campos de acréscimo (1º e 2º tempo) podem aparecer na MESMA linha. Pegar só
  // a primeira ocorrência por linha (jeito antigo) sempre acertava o 1º tempo e perdia o 2º. Por
  // isso a leitura abaixo varre a linha inteira token por token (marcador de tempo OU acréscimo,
  // na ordem em que aparecem) e associa cada acréscimo ao tempo mencionado mais recentemente antes
  // dele — funciona tanto pra essa linha com os dois tempos juntos quanto pro caso de cada tempo
  // vir numa linha separada. O rótulo real confirmado é "Acrésc:" (abreviado, sem "io" no final),
  // mas o regex aceita variações plausíveis ("Acréscimo", "Acréscimos", com/sem unidade) também.
  let ultimoTempoMencionado: SumulaPdfTempo | null = null;
  let acrescimoPrimeiroTempo: number | null = null;
  let acrescimoSegundoTempo: number | null = null;
  let acrescimoTerceiroTempo: number | null = null;
  const linhasDuracaoEncontradas: string[] = [];
  const RE_TEMPO_INDICADOR = /([123][ºo])\s*Tempo/i;
  const RE_ACRESCIMO_ROTULO = /Acr[ée]sc\p{L}*/iu;
  // Casa OU um marcador de tempo OU um rótulo de acréscimo com número — usado com matchAll (flag
  // "g") pra pegar TODAS as ocorrências de cada um numa linha, na ordem em que aparecem. O
  // "(?!\s*[ºo])" depois do número evita confundir o acréscimo com o próprio ordinal de um tempo
  // vizinho (ex: em "Acréscimo 2º Tempo", sem valor nenhum ainda, não deixa o "2" de "2º" virar o
  // valor do acréscimo por engano).
  const RE_TOKEN_TEMPO_OU_ACRESCIMO = /([123][ºo])\s*Tempo|Acr[ée]sc\p{L}*\.?:?\s*(\d{1,2})(?!\s*[ºo])/giu;

  for (const linha of linhas) {
    if (RE_TEMPO_INDICADOR.test(linha) || RE_ACRESCIMO_ROTULO.test(linha)) linhasDuracaoEncontradas.push(linha);

    for (const token of linha.matchAll(RE_TOKEN_TEMPO_OU_ACRESCIMO)) {
      if (token[1] != null) {
        ultimoTempoMencionado = token[1].startsWith("1") ? "primeiro" : token[1].startsWith("2") ? "segundo" : "terceiro";
      } else if (token[2] != null && ultimoTempoMencionado) {
        const valor = Number(token[2]);
        if (ultimoTempoMencionado === "primeiro") acrescimoPrimeiroTempo = valor;
        else if (ultimoTempoMencionado === "segundo") acrescimoSegundoTempo = valor;
        else acrescimoTerceiroTempo = valor;
      }
    }

    // "Relação de Jogadores" é uma tabela com os dois times LADO A LADO — o extrator de PDF
    // concatena as duas colunas numa linha só (mesmo fenômeno de "Término 1º/2º Tempo" acima, e
    // confirmado numa súmula real: Paulista SUB17, Ibrachina FC x Juventus SAF), então cada linha
    // real da tabela pode trazer 1 OU 2 jogadores (ex.: "1 Fulano de Tal T A 615497/25 1 Beltrano
    // da Silva T A 661231/26"). A tabela não marca o time de cada jogador por coluna (ver
    // `SumulaPdfJogador`/`jogadores` acima) — então, como já era o caso antes dessa correção, cada
    // jogador encontrado é extraído sem time atribuído, e o vínculo com o nosso lado é feito
    // depois, comparando contra o elenco cadastrado (ver lib/fpf/atleta-match.ts). Só ativa dentro
    // da seção (do título da tabela até a legenda "T = Titular | R = Reserva...") pra não arriscar
    // casar esse padrão em outro lugar do documento.
    if (/rela[çc][ãa]o de jogadores/i.test(linha)) {
      dentroSecaoJogadores = true;
      secaoCartaoAtual = null;
      continue;
    }

    if (/advert[êe]ncias/i.test(linha)) {
      secaoCartaoAtual = "amarelo";
      continue;
    }
    if (/expuls[õo]es/i.test(linha)) {
      secaoCartaoAtual = "vermelho";
      continue;
    }
    // Cada entrada das tabelas novas traz uma etiqueta "Cartão Amarelo"/"Cartão Vermelho" logo
    // abaixo — serve de reforço pra cor quando o título da seção não foi reconhecido.
    if (/^cart[ãa]o vermelho\b/i.test(linha)) {
      secaoCartaoAtual = "vermelho";
      continue;
    }
    if (/^cart[ãa]o amarelo\b/i.test(linha)) {
      secaoCartaoAtual = "amarelo";
      continue;
    }
    if (/^(gols?|substitui[çc][õo]es|comiss[ãa]o t[ée]cnica)\b/i.test(linha) || /^T\s*=\s*Titular/i.test(linha)) {
      secaoCartaoAtual = null;
      dentroSecaoJogadores = false;
    }

    if (dentroSecaoJogadores) {
      const jogadoresDaLinha = [...linha.matchAll(RE_JOGADOR)];
      if (jogadoresDaLinha.length > 0) {
        // A coluna da ESQUERDA é o mandante, a da DIREITA o visitante — mesma ordem de "Jogo: A X
        // B" (ver `ladoJuventusEhMandante` no topo da função). Só filtra pro nosso lado quando dá
        // pra saber com certeza qual coluna é a nossa E a linha realmente trouxe os dois jogadores
        // esperados (uma linha com só 1 pode ser um time com elenco mais curto que o outro —
        // melhor manter do que arriscar descartar à toa); fora isso, mantém os dois lados, como
        // já era o comportamento antes dessa melhoria.
        const jogadoresDoNossoLado =
          ladoJuventusEhMandante != null && jogadoresDaLinha.length === 2
            ? [jogadoresDaLinha[ladoJuventusEhMandante ? 0 : 1]]
            : jogadoresDaLinha;
        for (const m of jogadoresDoNossoLado) {
          const [, numero, nome, tr, , registroNumero, registroAno] = m;
          jogadores.push({
            numero: Number(numero),
            nome: nome.trim(),
            titular: tr === "T",
            registroFpf: `${registroNumero}/${registroAno}`,
            registroFpfNumero: Number(registroNumero),
          });
        }
        continue;
      }
    }

    const mGol = linha.match(RE_GOL_COM_APELIDO) ?? linha.match(RE_GOL_SEM_APELIDO);
    if (mGol) {
      const [, equipe, numero, nome, tipoSigla, minutoNormal, , minutoAcrescimo, tempoSigla] = mGol;
      const tempo = TEMPO_SIGLA[tempoSigla];
      gols.push({
        equipe: equipe.trim(),
        numero: Number(numero),
        nome: nome.trim(),
        tipo: TIPO_GOL_POR_SIGLA[tipoSigla] ?? "normal",
        minuto: resolverMinutoBruto(minutoNormal, minutoAcrescimo, tempo, duracoes),
        tempo,
      });
      continue;
    }

    const mSub = linha.match(RE_SUBSTITUICAO);
    if (mSub) {
      const [, equipe, numeroSaiu, nomeSaiu, numeroEntrou, nomeEntrou, minutoNormal, , minutoAcrescimo, tempoSigla] =
        mSub;
      const tempo = TEMPO_SIGLA[tempoSigla];
      substituicoes.push({
        equipe: equipe.trim(),
        numeroSaiu: Number(numeroSaiu),
        nomeSaiu: nomeSaiu.trim(),
        numeroEntrou: Number(numeroEntrou),
        nomeEntrou: nomeEntrou.trim(),
        minuto: resolverMinutoBruto(minutoNormal, minutoAcrescimo, tempo, duracoes),
        tempo,
      });
      continue;
    }

    // Cartão só depois de gol/substituição (padrões mais específicos), pra não capturar essas
    // linhas por engano — RE_CARTAO é o mais genérico dos três (só "equipe nº nome mm:ss tempo").
    const mCartao = linha.match(RE_CARTAO);
    if (mCartao && secaoCartaoAtual) {
      const [, equipe, numero, nome, minutoNormal, , minutoAcrescimo, tempoSigla] = mCartao;
      const tempo = TEMPO_SIGLA[tempoSigla];
      cartoes.push({
        equipe: equipe.trim(),
        numero: Number(numero),
        nome: nome.trim(),
        cor: secaoCartaoAtual,
        minuto: resolverMinutoBruto(minutoNormal, minutoAcrescimo, tempo, duracoes),
        tempo,
      });
      continue;
    }

    // Layout alternativo (tempo na frente) — ver RE_CARTAO_TEMPO_PRIMEIRO. Só dentro da seção de
    // cartões, pra não capturar linha de outra tabela por engano.
    const mCartaoTempoPrimeiro = linha.match(RE_CARTAO_TEMPO_PRIMEIRO);
    if (mCartaoTempoPrimeiro && secaoCartaoAtual) {
      const [, minutoNormal, , minutoAcrescimo, semTempo, sigla, numero, nomeEEquipe] = mCartaoTempoPrimeiro;
      // "AJ" (antes do jogo), "AP" (após a partida), "IN" (intervalo) e o traço no lugar do
      // relógio: eventos fora das três etapas entram como minuto 0 do 1º tempo, que é o mais
      // próximo que a nossa Súmula representa.
      const tempo: SumulaPdfTempo = sigla === "3T" ? "terceiro" : sigla === "2T" ? "segundo" : "primeiro";
      const minuto = semTempo || (sigla !== "1T" && sigla !== "2T" && sigla !== "3T")
        ? 0
        : resolverMinutoBruto(minutoNormal, minutoAcrescimo, tempo, duracoes);
      const texto = nomeEEquipe.trim();
      cartoes.push({
        equipe: texto,
        numero: Number(numero),
        nome: texto,
        cor: secaoCartaoAtual,
        minuto,
        tempo,
        nomeComEquipe: true,
      });
      continue;
    }

    // O motivo da expulsão vem numa linha própria logo abaixo da entrada ("Motivo: Expulso
    // por..."); é texto descritivo esperado, não uma linha perdida.
    if (/^motivo:/i.test(linha)) continue;

    if (!ehCabecalhoOuVazio(linha) && (secaoCartaoAtual || /cart[ãa]o|expuls[ãa]o/i.test(linha))) {
      avisos.push(`Linha não reconhecida na seção de cartões: "${linha}"`);
    }
  }

  return {
    competicao,
    rodada,
    data,
    estadio,
    placarMandante,
    placarVisitante,
    acrescimoPrimeiroTempo,
    acrescimoSegundoTempo,
    acrescimoTerceiroTempo,
    penaltisMandante,
    penaltisVisitante,
    jogadores,
    gols,
    cartoes,
    substituicoes,
    avisos,
    linhasDuracaoEncontradas,
  };
}

/**
 * O `minuto` de um gol/cartão/substituição, do jeito que sai de `parsearSumulaPdf`, é o "relógio
 * corrido" oficial do jogo — o padrão de súmula usado no futebol brasileiro (o mesmo de "gol aos
 * 79 minutos" no rádio/TV): no 2º tempo o número já vem contando a partir de onde o 1º parou (ex:
 * "79:00 2T" com 1º tempo de 45min = aos 34 minutos do 2º tempo), a tag "1T"/"2T" só indica em
 * qual tempo aconteceu, não reinicia a contagem.
 *
 * Isso é DIFERENTE de como a nossa Súmula guarda o minuto internamente (`sumula_eventos.minuto`):
 * lá, o minuto de um evento do 2º tempo é relativo ao início do 2º tempo (ver
 * `lib/futebol/estatisticas-atleta.ts`, `calcularMinutoAbsoluto`) — convenção pensada pra
 * lançamento manual durante o jogo. Essa função faz a conversão do relógio corrido do PDF pro
 * formato interno, na importação.
 */
export function converterMinutoPdfParaRelativo(
  minutoPdf: number,
  tempo: SumulaPdfTempo,
  duracaoPrimeiroTempo: number,
  /** Só precisa ser informado quando `tempo === "terceiro"` (jogo de 3 tempos) — usado pra
   * deslocar o relógio corrido do 3º tempo, igual a `calcularMinutoAbsoluto` em
   * lib/futebol/estatisticas-atleta.ts. */
  duracaoSegundoTempo?: number,
): number {
  if (tempo === "primeiro") return minutoPdf;
  if (tempo === "segundo") return Math.max(0, minutoPdf - duracaoPrimeiroTempo);
  return Math.max(0, minutoPdf - duracaoPrimeiroTempo - (duracaoSegundoTempo ?? duracaoPrimeiroTempo));
}
