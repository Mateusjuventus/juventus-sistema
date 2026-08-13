/**
 * Como o nome de um atleta aparece pra quem lê, e como ordenar uma lista por esse nome.
 *
 * O sistema mostra o APELIDO sempre que existe (é como o atleta é chamado no dia a dia e como o
 * pôster/convocação sai), guardando o nome completo pros documentos que vão junto de CPF/RG. Isso
 * cria uma armadilha de ordenação: a consulta chega do banco ordenada por `nome_completo`, então
 * "Justen" (apelido de quem se chama, digamos, Keven Justen) caía depois de "Keven" na tela — fora
 * de ordem aos olhos de quem lê. Ordenar pelo texto que de fato aparece resolve.
 *
 * `localeCompare` com "pt-BR" é o que faz "Ávila" vir antes de "Bruno" em vez de ir pro fim da
 * lista, como aconteceria numa comparação byte a byte.
 */

export interface AtletaComNome {
  apelido: string | null;
  nome_completo: string;
}

export function nomeExibido(atleta: AtletaComNome): string {
  return atleta.apelido?.trim() || atleta.nome_completo;
}

/** Não altera o array recebido — devolve uma cópia ordenada. */
export function ordenarPorNomeExibido<T extends AtletaComNome>(lista: T[]): T[] {
  return [...lista].sort((a, b) => nomeExibido(a).localeCompare(nomeExibido(b), "pt-BR"));
}
