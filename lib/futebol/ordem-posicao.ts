/**
 * Ordem de exibição por posição em tática (Goleiro primeiro, depois defesa, meio-campo e ataque) —
 * usada onde a lista de atletas deve seguir a lógica de uma escalação em vez da numeração da
 * camisa (ex.: Presskit). `posicao` é texto livre no cadastro (ver `atletaSchema`), então a
 * comparação é por palavra-chave, não por um valor fixo — cobre variações comuns (ex.: "Lateral
 * Direito", "Lateral Esquerdo", "Meia-atacante") sem exigir que o cadastro use um enum.
 */

const GRUPOS_POSICAO: { rank: number; palavras: string[] }[] = [
  { rank: 0, palavras: ["goleiro", "goleira"] },
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

/** Retorna a posição (rank) de uma posição de jogo na ordem tática — menor rank aparece primeiro. */
export function rankPosicao(posicao: string | null | undefined): number {
  if (!posicao || !posicao.trim()) return RANK_SEM_POSICAO;
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
