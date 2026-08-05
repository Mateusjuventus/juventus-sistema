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

export interface SumulaPdfGol {
  equipe: string;
  numero: number;
  nome: string;
  tipo: SumulaPdfEventoTipoGol;
  minuto: number;
  tempo: "primeiro" | "segundo";
}

export interface SumulaPdfCartao {
  equipe: string;
  numero: number;
  nome: string;
  cor: "amarelo" | "vermelho";
  minuto: number;
  tempo: "primeiro" | "segundo";
}

export interface SumulaPdfSubstituicao {
  equipe: string;
  numeroSaiu: number;
  nomeSaiu: string;
  numeroEntrou: number;
  nomeEntrou: string;
  minuto: number;
  tempo: "primeiro" | "segundo";
}

export interface SumulaPdfDados {
  competicao: string | null;
  rodada: string | null;
  data: string | null;
  estadio: string | null;
  placarMandante: number | null;
  placarVisitante: number | null;
  jogadores: SumulaPdfJogador[];
  gols: SumulaPdfGol[];
  cartoes: SumulaPdfCartao[];
  substituicoes: SumulaPdfSubstituicao[];
  /** Linhas que pareciam pertencer a alguma seção reconhecida mas não bateram com o padrão
   * esperado — mostrado ao usuário como "N linhas não reconhecidas" pra ele saber que pode
   * precisar completar manualmente. */
  avisos: string[];
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

const TEMPO_SIGLA: Record<string, "primeiro" | "segundo"> = { "1T": "primeiro", "2T": "segundo" };

/** "Nº Nome Completo T/R P/A Registro" — ex: "1 Giovanni Martinez Montanari T A 661239/26" */
const RE_JOGADOR = /^(\d{1,3})\s+(.+?)\s+(T|R)\s+(A|P)\s+(\d+)\/(\d{2,4})$/;

/** "Equipe Nº Nome - (Apelido) Tipo MM:SS 1T/2T" (apelido opcional) */
const RE_GOL_COM_APELIDO =
  /^(.+?)\s+(\d{1,3})\s+(.+?)\s+-\s+\([^)]*\)\s+(NR|PN|CT|FT)\s+(\d{1,3}):(\d{2})\s+(1T|2T)$/;
const RE_GOL_SEM_APELIDO = /^(.+?)\s+(\d{1,3})\s+(.+?)\s+(NR|PN|CT|FT)\s+(\d{1,3}):(\d{2})\s+(1T|2T)$/;

/** "Equipe Nº Nome MM:SS 1T/2T" */
const RE_CARTAO = /^(.+?)\s+(\d{1,3})\s+(.+?)\s+(\d{1,3}):(\d{2})\s+(1T|2T)$/;

/** "Equipe Nº Saiu Nº Entrou MM:SS 1T/2T" */
const RE_SUBSTITUICAO = /^(.+?)\s+(\d{1,3})\s+(.+?)\s+(\d{1,3})\s+(.+?)\s+(\d{1,3}):(\d{2})\s+(1T|2T)$/;

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
export function parsearSumulaPdf(texto: string): SumulaPdfDados {
  const linhas = normalizarLinhas(texto);
  const avisos: string[] = [];

  const competicao = campoRotulado(linhas, /Campeonato:?\s*(.+)/i);
  const rodada = campoRotulado(linhas, /Rodada:?\s*(.+)/i);
  const data = campoRotulado(linhas, /^Data:?\s*(\d{2}\/\d{2}\/\d{4})/i);
  const estadio = campoRotulado(linhas, /Est[aá]dio:?\s*(.+)/i);

  let placarMandante: number | null = null;
  let placarVisitante: number | null = null;
  for (const linha of linhas) {
    const m = linha.match(/Resultado\s*(?:2[ºo]?\s*Tempo)?:?\s*(\d{1,2})\s*[Xx]\s*(\d{1,2})/);
    if (m) {
      placarMandante = Number(m[1]);
      placarVisitante = Number(m[2]);
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

  for (const linha of linhas) {
    if (/advert[êe]ncias/i.test(linha)) {
      secaoCartaoAtual = "amarelo";
      continue;
    }
    if (/expuls[õo]es/i.test(linha)) {
      secaoCartaoAtual = "vermelho";
      continue;
    }
    if (/^(gols?|substitui[çc][õo]es|comiss[ãa]o t[ée]cnica|rela[çc][ãa]o de jogadores)\b/i.test(linha)) {
      secaoCartaoAtual = null;
    }

    const mJogador = linha.match(RE_JOGADOR);
    if (mJogador) {
      const [, numero, nome, tr, , registroNumero, registroAno] = mJogador;
      jogadores.push({
        numero: Number(numero),
        nome: nome.trim(),
        titular: tr === "T",
        registroFpf: `${registroNumero}/${registroAno}`,
        registroFpfNumero: Number(registroNumero),
      });
      continue;
    }

    const mGol = linha.match(RE_GOL_COM_APELIDO) ?? linha.match(RE_GOL_SEM_APELIDO);
    if (mGol) {
      const [, equipe, numero, nome, tipoSigla, minuto, , tempoSigla] = mGol;
      gols.push({
        equipe: equipe.trim(),
        numero: Number(numero),
        nome: nome.trim(),
        tipo: TIPO_GOL_POR_SIGLA[tipoSigla] ?? "normal",
        minuto: Number(minuto),
        tempo: TEMPO_SIGLA[tempoSigla],
      });
      continue;
    }

    const mSub = linha.match(RE_SUBSTITUICAO);
    if (mSub) {
      const [, equipe, numeroSaiu, nomeSaiu, numeroEntrou, nomeEntrou, minuto, , tempoSigla] = mSub;
      substituicoes.push({
        equipe: equipe.trim(),
        numeroSaiu: Number(numeroSaiu),
        nomeSaiu: nomeSaiu.trim(),
        numeroEntrou: Number(numeroEntrou),
        nomeEntrou: nomeEntrou.trim(),
        minuto: Number(minuto),
        tempo: TEMPO_SIGLA[tempoSigla],
      });
      continue;
    }

    // Cartão só depois de gol/substituição (padrões mais específicos), pra não capturar essas
    // linhas por engano — RE_CARTAO é o mais genérico dos três (só "equipe nº nome mm:ss tempo").
    const mCartao = linha.match(RE_CARTAO);
    if (mCartao && secaoCartaoAtual) {
      const [, equipe, numero, nome, minuto, , tempoSigla] = mCartao;
      cartoes.push({
        equipe: equipe.trim(),
        numero: Number(numero),
        nome: nome.trim(),
        cor: secaoCartaoAtual,
        minuto: Number(minuto),
        tempo: TEMPO_SIGLA[tempoSigla],
      });
      continue;
    }

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
    jogadores,
    gols,
    cartoes,
    substituicoes,
    avisos,
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
  tempo: "primeiro" | "segundo",
  duracaoPrimeiroTempo: number,
): number {
  if (tempo === "primeiro") return minutoPdf;
  return Math.max(0, minutoPdf - duracaoPrimeiroTempo);
}
