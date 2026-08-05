/**
 * Vínculo entre um jogador citado numa súmula em PDF da FPF e um atleta cadastrado no sistema —
 * usado pela importação de súmula (ver `lib/fpf/sumula-pdf.ts` e
 * `app/jogos/[id]/sumula/importar-actions.ts`). Sempre com revisão humana antes de salvar (mesma
 * exigência já combinada pro resto da integração FPF), então a precisão do match automático aqui
 * só precisa ser uma boa sugestão — não precisa ser perfeita.
 */

export interface AtletaParaMatch {
  id: string;
  nome_completo: string;
  numero_fpf: number | null;
}

export type ConfiancaMatch = "numero_fpf" | "nome_exato" | "nome_aproximado" | "nenhuma";

export interface SugestaoMatch {
  atletaId: string | null;
  confianca: ConfiancaMatch;
  pontuacao: number;
}

/** Remove acentos, pontuação e normaliza espaços/caixa — pra comparar nomes de forma tolerante a
 * pequenas diferenças de grafia entre o cadastro nosso e o documento da FPF. */
export function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Similaridade por sobreposição de palavras (Jaccard sobre o conjunto de tokens do nome) — mais
 * tolerante que Levenshtein a nomes com a ordem de sobrenomes diferente ou abreviados. */
export function similaridadeNomes(a: string, b: string): number {
  const tokensA = new Set(normalizarNome(a).split(" ").filter(Boolean));
  const tokensB = new Set(normalizarNome(b).split(" ").filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersecao = 0;
  for (const t of tokensA) if (tokensB.has(t)) intersecao++;
  const uniao = tokensA.size + tokensB.size - intersecao;
  return uniao === 0 ? 0 : intersecao / uniao;
}

const LIMIAR_APROXIMADO = 0.35;

/** Sugere qual atleta cadastrado corresponde a um jogador citado na súmula. Prioridade: número de
 * registro da FPF (`numero_fpf`) batendo exato > nome idêntico após normalização > nome parecido
 * acima do limiar > nenhuma sugestão (fica pra escolha manual na revisão). */
export function sugerirAtleta(
  nomeFpf: string,
  registroFpfNumero: number | null,
  atletas: AtletaParaMatch[],
): SugestaoMatch {
  if (registroFpfNumero != null) {
    const porNumero = atletas.find((a) => a.numero_fpf === registroFpfNumero);
    if (porNumero) return { atletaId: porNumero.id, confianca: "numero_fpf", pontuacao: 1 };
  }

  const nomeFpfNormalizado = normalizarNome(nomeFpf);
  const porNomeExato = atletas.find((a) => normalizarNome(a.nome_completo) === nomeFpfNormalizado);
  if (porNomeExato) return { atletaId: porNomeExato.id, confianca: "nome_exato", pontuacao: 1 };

  let melhor: { atleta: AtletaParaMatch; pontuacao: number } | null = null;
  for (const atleta of atletas) {
    const pontuacao = similaridadeNomes(nomeFpf, atleta.nome_completo);
    if (!melhor || pontuacao > melhor.pontuacao) melhor = { atleta, pontuacao };
  }

  if (melhor && melhor.pontuacao >= LIMIAR_APROXIMADO) {
    return { atletaId: melhor.atleta.id, confianca: "nome_aproximado", pontuacao: melhor.pontuacao };
  }

  return { atletaId: null, confianca: "nenhuma", pontuacao: melhor?.pontuacao ?? 0 };
}
