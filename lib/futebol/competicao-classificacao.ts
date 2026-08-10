/**
 * Classificação de um grupo da competição (ver
 * docs/superpowers/specs/2026-08-10-competicoes-design.md).
 *
 * Duas origens de resultado, sem duplicar nada:
 *  - Jogos do JUVENTUS: vêm dos jogos já existentes vinculados ao grupo (`competicao_jogos` →
 *    `jogos.gols_pro/gols_contra`) — entram sozinhos quando o placar é preenchido.
 *  - Jogos entre os OUTROS clubes: lançamento leve em `competicao_grupo_resultados`.
 *
 * Também resolve "vaga projetada" (equipe de fase futura definida como "1º do Grupo 3") pra
 * mostrar os possíveis confrontos das próximas fases com base na classificação atual.
 *
 * Funções puras (sem Supabase), pra dar pra testar.
 */

export const JUVENTUS_NOME = "Juventus";

export interface ResultadoSimples {
  casa: string;
  fora: string;
  golsCasa: number;
  golsFora: number;
}

export interface LinhaClassificacao {
  equipe: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldo: number;
}

function normalizar(nome: string): string {
  return nome.trim().toLocaleLowerCase("pt-BR");
}

/**
 * Monta a tabela do grupo. Só as `equipes` cadastradas no grupo entram na tabela — um resultado
 * que cita um nome desconhecido ainda conta pro lado conhecido (ex.: resultado digitado com o
 * adversário grafado diferente não zera os pontos de quem está certo).
 * Critérios de desempate (padrão FPF): pontos, vitórias, saldo, gols pró, ordem alfabética.
 */
export function calcularClassificacao(equipes: string[], resultados: ResultadoSimples[]): LinhaClassificacao[] {
  const linhas = new Map<string, LinhaClassificacao>();
  for (const equipe of equipes) {
    const chave = normalizar(equipe);
    if (!linhas.has(chave)) {
      linhas.set(chave, {
        equipe: equipe.trim(),
        pontos: 0,
        jogos: 0,
        vitorias: 0,
        empates: 0,
        derrotas: 0,
        golsPro: 0,
        golsContra: 0,
        saldo: 0,
      });
    }
  }

  const aplicar = (nome: string, golsPro: number, golsContra: number) => {
    const linha = linhas.get(normalizar(nome));
    if (!linha) return;
    linha.jogos += 1;
    linha.golsPro += golsPro;
    linha.golsContra += golsContra;
    linha.saldo = linha.golsPro - linha.golsContra;
    if (golsPro > golsContra) {
      linha.vitorias += 1;
      linha.pontos += 3;
    } else if (golsPro === golsContra) {
      linha.empates += 1;
      linha.pontos += 1;
    } else {
      linha.derrotas += 1;
    }
  };

  for (const r of resultados) {
    aplicar(r.casa, r.golsCasa, r.golsFora);
    aplicar(r.fora, r.golsFora, r.golsCasa);
  }

  return Array.from(linhas.values()).sort(
    (a, b) =>
      b.pontos - a.pontos ||
      b.vitorias - a.vitorias ||
      b.saldo - a.saldo ||
      b.golsPro - a.golsPro ||
      a.equipe.localeCompare(b.equipe, "pt-BR"),
  );
}

/** Converte um jogo do Juventus (vinculado ao grupo) em resultado da tabela — null enquanto o
 * placar não estiver preenchido no cadastro do jogo. */
export function jogoJuventusParaResultado(jogo: {
  adversario_nome: string;
  mandante: boolean;
  gols_pro: number | null;
  gols_contra: number | null;
}): ResultadoSimples | null {
  if (jogo.gols_pro === null || jogo.gols_contra === null) return null;
  return jogo.mandante
    ? { casa: JUVENTUS_NOME, fora: jogo.adversario_nome, golsCasa: jogo.gols_pro, golsFora: jogo.gols_contra }
    : { casa: jogo.adversario_nome, fora: JUVENTUS_NOME, golsCasa: jogo.gols_contra, golsFora: jogo.gols_pro };
}

export interface EquipeDeGrupo {
  nome: string | null;
  origemGrupoId: string | null;
  origemPosicao: number | null;
}

export interface EquipeResolvida {
  /** Rótulo fixo: o nome da equipe, ou a vaga ("1º do Grupo 3"). */
  rotulo: string;
  /** Nome de quem ocuparia a vaga HOJE pela classificação (null quando a vaga é fixa ou o grupo
   * de origem ainda não tem classificação). */
  projecao: string | null;
}

/**
 * Resolve as equipes de um grupo — vagas projetadas viram "1º do Grupo 3" + quem ocupa a posição
 * hoje. `nomesGrupos` e `classificacoes` são indexados por id do grupo de ORIGEM.
 */
export function resolverEquipes(
  equipes: EquipeDeGrupo[],
  nomesGrupos: Map<string, string>,
  classificacoes: Map<string, LinhaClassificacao[]>,
): EquipeResolvida[] {
  return equipes.map((e) => {
    if (e.nome !== null) return { rotulo: e.nome, projecao: null };
    const nomeGrupo = (e.origemGrupoId && nomesGrupos.get(e.origemGrupoId)) || "?";
    const rotulo = `${e.origemPosicao}º do ${nomeGrupo}`;
    const classificacao = e.origemGrupoId ? classificacoes.get(e.origemGrupoId) : undefined;
    const linha = classificacao && e.origemPosicao !== null ? classificacao[e.origemPosicao - 1] : undefined;
    return { rotulo, projecao: linha?.equipe ?? null };
  });
}
