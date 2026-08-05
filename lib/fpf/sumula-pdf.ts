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
  /** Minutos de acréscimo de cada tempo, do campo "Acréscimo: X min" da súmula — usado pra
   * sugerir a duração real de cada tempo (45 + acréscimo) na importação, em vez de deixar sempre
   * no padrão de 45min. `null` quando não achou esse campo. */
  acrescimoPrimeiroTempo: number | null;
  acrescimoSegundoTempo: number | null;
  jogadores: SumulaPdfJogador[];
  gols: SumulaPdfGol[];
  cartoes: SumulaPdfCartao[];
  substituicoes: SumulaPdfSubstituicao[];
  /** Linhas que pareciam pertencer a alguma seção reconhecida mas não bateram com o padrão
   * esperado — mostrado ao usuário como "N linhas não reconhecidas" pra ele saber que pode
   * precisar completar manualmente. */
  avisos: string[];
  /** Diagnóstico: toda linha do PDF que menciona "1º/2º Tempo" ou "Acréscimo", mesmo que não
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

const TEMPO_SIGLA: Record<string, "primeiro" | "segundo"> = { "1T": "primeiro", "2T": "segundo" };

/** "Nº Nome Completo T/R P/A Registro" — ex: "1 Giovanni Martinez Montanari T A 661239/26" */
const RE_JOGADOR = /^(\d{1,3})\s+(.+?)\s+(T|R)\s+(A|P)\s+(\d+)\/(\d{2,4})$/;

// O minuto de um evento normalmente vem como "MM:SS" — mas um evento no acréscimo pode vir como
// "+N" (ex: "+2 2T" = 2º minuto do acréscimo do 2º tempo), sem nunca termos confirmado o formato
// exato byte-a-byte (ver observação no topo do arquivo). Cada padrão abaixo aceita as duas formas
// como alternativas dentro do mesmo grupo, resolvidas por `resolverMinutoBruto`.
const MINUTO_ALTERNATIVAS = "(?:(\\d{1,3}):(\\d{2})|\\+\\s
