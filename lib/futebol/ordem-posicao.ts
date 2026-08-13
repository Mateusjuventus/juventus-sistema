/**
 * Ordem de exibição por posição em tática (Goleiro primeiro, depois defesa, meio-campo e ataque) —
 * usada onde a lista de atletas deve seguir a lógica de uma escalação em vez da numeração da
 * camisa (ex.: Presskit). `posicao` é texto livre no cadastro (ver `atletaSchema`), então a
 * comparação é por palavra-chave, não por um valor fixo — cobre variações comuns (ex.: "Lateral
 * Direito", "Lateral Esquerdo", "Meia-atacante") sem exigir que o cadastro use um enum.
 */

const GRUPOS_POSICAO: { rank: number; palavras: string[] }[] = [
  { rank: 0, palavras: ["goleiro", "goleira", "goalkeeper"] },
  { rank: 1, palavras: ["zagueiro", "zaga", "libero", "central"] },
  { rank: 2, palavras: ["lateral"] },
  { rank: 3, palavras: ["volante"] },
  { rank: 4, palavras: ["meia", "meio-campo", "meio campo", "armador", "meio-campista"] },
  { rank: 5, palavras: ["ponta", "ala", "extremo"] },
  { rank: 6, palavras: ["atacante", "centroavante", "centro-avante", "centro avante"] },
];

/** Posições não reconhecidas ficam depois de todas as conhecidas, mas antes de "sem posição". */
const RANK_DESCONHECIDA = GRUPOS_POSICAO.length;
const RANK_SEM_POSICAO = RANK_DESCONHECIDA + 1;

function normalizar(texto: string): string {
  return texto.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Abreviações que aparecem no cadastro no lugar de "Goleiro" — comparadas por igualdade, não por
 * `includes`, senão "GO" casaria com qualquer posição que tenha essas letras juntas. */
const ABREVIACOES_GOLEIRO = ["gol", "go", "gk", "g"];

/**
 * Regra do Presskit: goleiro SEMPRE primeiro, tanto em titulares quanto em reservas. Fica isolado
 * numa função porque não depende da ordem tática completa — a Base ordena por número de camisa e
 * mesmo assim precisa do goleiro na frente.
 */
export function ehGoleiro(posicao: string | null | undefined): boolean {
  if (!posicao || !posicao.trim()) return false;
  const normalizada = normalizar(posicao).trim();
  if (ABREVIACOES_GOLEIRO.includes(normalizada)) return true;
  return GRUPOS_POSICAO[0].palavras.some((palavra) => normalizada.includes(palavra));
}

/** Retorna a posição (rank) de uma posição de jogo na ordem tática — menor rank aparece primeiro. */
export function rankPosicao(posicao: string | null | undefined): number {
  if (!posicao || !posicao.trim()) return RANK_SEM_POSICAO;
  if (ehGoleiro(posicao)) return 0;
  const normalizada = normalizar(posicao);
  for (const grupo of GRUPOS_POSICAO) {
    if (grupo.palavras.some((palavra) => normalizada.includes(palavra))) return grupo.rank;
  }
  return RANK_DESCONHECIDA;
}

/** Comparador pronto pra `.sort()`: ordena por posição (tática) e, dentro da mesma posição, pelo
 * número da camisa (sem número vai por último). */
export function compararPorPosicao<T extends { posicao: string; numero_camisa: number | null }>(
  a: T,
  b: T,
): number {
  const diff = rankPosicao(a.posicao) - rankPosicao(b.posicao);
  if (diff !== 0) return diff;
  return (a.numero_camisa ?? 999) - (b.numero_camisa ?? 999);
}

/** Comparador pronto pra `.sort()`: ordena só pelo número da camisa, do menor pro maior (sem
 * número vai por último) — usado no Presskit do Futebol de Base, onde a numeração não é fixa por
 * atleta (muda de jogo pra jogo) e por isso não faz sentido agrupar por posição como no
 * Profissional; o pedido foi simplesmente "titular 1, 2, 3... reserva 12, 13, 14...". */
export function compararPorNumeroCamisa<T extends { numero_camisa: number | null }>(a: T, b: T): number {
  return (a.numero_camisa ?? 999) - (b.numero_camisa ?? 999);
}

/**
 * Igual a `compararPorNumeroCamisa`, mas com o GOLEIRO SEMPRE NA FRENTE — regra do Presskit, vale
 * pra titulares e pra reservas (Base e Profissional).
 *
 * Sem isso, o goleiro reserva de camisa 12 caía depois de linha numerados 1 a 11, e um goleiro
 * titular com número alto ficava no meio da lista. Entre dois goleiros (ou entre dois de linha), a
 * ordem continua sendo o número da camisa.
 */
export function compararPorNumeroCamisaGoleiroPrimeiro<
  T extends { posicao: string; numero_camisa: number | null },
>(a: T, b: T): number {
  const diff = Number(ehGoleiro(b.posicao)) - Number(ehGoleiro(a.posicao));
  if (diff !== 0) return diff;
  return compararPorNumeroCamisa(a, b);
}
