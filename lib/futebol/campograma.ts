import type { CategoriaPosicao } from "@/lib/supabase/types";

/**
 * Agrupamento puro do Campograma (`/base/atletas/campograma`) — separa os atletas de uma categoria
 * por `categoria_posicao` (o mesmo campo classificado que já colore a tag GOL/ZAG/LAT/MEI/ATA na
 * Convocação, ver lib/futebol/categoria-posicao.ts). Não é a escalação de um jogo específico: é o
 * elenco inteiro da categoria, visto por posição — quantos zagueiros o Sub-17 tem, por exemplo.
 */

export interface AtletaCampograma {
  id: string;
  nome: string;
  apelido: string | null;
  numeroCamisa: number | null;
  categoriaPosicao: CategoriaPosicao | null;
}

export type GrupoCampograma = Record<CategoriaPosicao | "sem_posicao", AtletaCampograma[]>;

/** Nome curto pra mostrar no campo — apelido quando existir, senão o primeiro nome. */
export function nomeCampograma(atleta: Pick<AtletaCampograma, "nome" | "apelido">): string {
  if (atleta.apelido && atleta.apelido.trim()) return atleta.apelido.trim();
  return atleta.nome.trim().split(" ")[0] ?? atleta.nome;
}

/** Agrupa por posição, cada grupo ordenado por número de camisa (sem número vai pro fim, por
 * ordem alfabética entre si). */
export function agruparPorPosicao(atletas: AtletaCampograma[]): GrupoCampograma {
  const grupos: GrupoCampograma = {
    goleiro: [],
    zagueiro: [],
    lateral: [],
    meia: [],
    atacante: [],
    sem_posicao: [],
  };

  for (const a of atletas) {
    const chave = a.categoriaPosicao ?? "sem_posicao";
    grupos[chave].push(a);
  }

  for (const chave of Object.keys(grupos) as (keyof GrupoCampograma)[]) {
    grupos[chave].sort((a, b) => {
      if (a.numeroCamisa != null && b.numeroCamisa != null) return a.numeroCamisa - b.numeroCamisa;
      if (a.numeroCamisa != null) return -1;
      if (b.numeroCamisa != null) return 1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }

  return grupos;
}
