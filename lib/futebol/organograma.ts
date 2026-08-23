/**
 * Layout automático do Organograma do Futebol de Base (ver
 * docs/superpowers/specs/2026-08-23-organograma-base-design.md) — só entra em ação pra quem ainda
 * não foi arrastada (sem `pos_x`/`pos_y` salvos). Depois de arrastada, a posição salva manda; esta
 * função nunca é chamada de novo pra ela.
 *
 * Regra: caixas SEM grupo (liderança — Presidente, Diretor, Coordenador Geral, board...) formam uma
 * árvore normal, uma linha por nível de "reporta para", espalhadas lado a lado. Caixas COM grupo
 * (ex.: "Head de Goleiros") viram uma coluna — uma por valor de `grupo`. As colunas ficam numa faixa
 * abaixo de toda a liderança.
 *
 * Dentro da faixa de colunas, quem também tem `linha` preenchida (ex.: "Comissão Sub20") alinha na
 * mesma altura em TODAS as colunas que tiverem alguém com essa mesma `linha` — é o que forma a grade
 * de verdade (coluna = área, linha = categoria), igual à imagem de referência do Mateus. Quem tem
 * `grupo` mas não tem `linha` continua só empilhado por `ordem`, logo abaixo da grade.
 */

export interface OrganogramaNo {
  id: string;
  reportaPara: string | null;
  grupo: string | null;
  linha: string | null;
  ordem: number;
}

export interface OrganogramaPosicao {
  x: number;
  y: number;
}

export const LARGURA_CAIXA = 220;
export const ALTURA_CAIXA = 84;
export const ALTURA_CABECALHO_GRUPO = 44;
const GAP_X = 24;
const GAP_Y_NIVEL = 64;
const GAP_Y_MEMBRO = 12;

function ordenar(nos: OrganogramaNo[]): OrganogramaNo[] {
  return [...nos].sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id));
}

/** Profundidade de cada caixa de liderança (sem grupo), contando só a cadeia de outras caixas de
 * liderança — uma caixa cujo "reporta para" não existe (ou aponta pra uma caixa com grupo) vira
 * raiz (profundidade 0), pra nunca travar o layout por causa de um vínculo quebrado. */
function calcularProfundidades(lideres: OrganogramaNo[]): Map<string, number> {
  const porId = new Map(lideres.map((n) => [n.id, n]));
  const profundidade = new Map<string, number>();

  function resolver(id: string, visitando: Set<string>): number {
    if (profundidade.has(id)) return profundidade.get(id)!;
    if (visitando.has(id)) return 0; // ciclo (não devia acontecer) — não trava o layout
    const no = porId.get(id);
    if (!no || !no.reportaPara || !porId.has(no.reportaPara)) {
      profundidade.set(id, 0);
      return 0;
    }
    visitando.add(id);
    const d = resolver(no.reportaPara, visitando) + 1;
    profundidade.set(id, d);
    return d;
  }

  for (const no of lideres) resolver(no.id, new Set());
  return profundidade;
}

export function calcularLayoutAutomatico(nos: OrganogramaNo[]): Map<string, OrganogramaPosicao> {
  const posicoes = new Map<string, OrganogramaPosicao>();
  const lideres = nos.filter((n) => !n.grupo);
  const membros = nos.filter((n) => n.grupo);

  // --- Liderança: uma linha por profundidade, caixas centralizadas lado a lado. ---
  const profundidades = calcularProfundidades(lideres);
  const porNivel = new Map<number, OrganogramaNo[]>();
  let maiorNivel = 0;
  for (const no of lideres) {
    const d = profundidades.get(no.id) ?? 0;
    maiorNivel = Math.max(maiorNivel, d);
    porNivel.set(d, [...(porNivel.get(d) ?? []), no]);
  }
  for (const [nivel, doNivel] of porNivel) {
    const ordenados = ordenar(doNivel);
    const largura = ordenados.length * LARGURA_CAIXA + (ordenados.length - 1) * GAP_X;
    const inicioX = -largura / 2;
    ordenados.forEach((no, i) => {
      posicoes.set(no.id, {
        x: inicioX + i * (LARGURA_CAIXA + GAP_X),
        y: nivel * (ALTURA_CAIXA + GAP_Y_NIVEL),
      });
    });
  }

  // --- Membros: uma coluna por valor de `grupo`. ---
  const porGrupo = new Map<string, OrganogramaNo[]>();
  for (const no of membros) {
    const chave = no.grupo!;
    porGrupo.set(chave, [...(porGrupo.get(chave) ?? []), no]);
  }
  // Colunas na ordem em que o grupo aparece pela primeira vez (menor `ordem` entre seus membros).
  const grupos = [...porGrupo.entries()].sort(
    (a, b) => Math.min(...a[1].map((n) => n.ordem)) - Math.min(...b[1].map((n) => n.ordem)),
  );
  const linhaColunasY = (maiorNivel + 1) * (ALTURA_CAIXA + GAP_Y_NIVEL);
  const larguraTotal = grupos.length * LARGURA_CAIXA + Math.max(0, grupos.length - 1) * GAP_X;
  const inicioXColunas = -larguraTotal / 2;

  // Linhas da grade: só quem tem `grupo` E `linha`, na ordem em que a `linha` aparece pela primeira
  // vez (menor `ordem` entre quem usa essa `linha`, em qualquer coluna).
  const porLinha = new Map<string, OrganogramaNo[]>();
  for (const no of membros) {
    if (!no.linha) continue;
    porLinha.set(no.linha, [...(porLinha.get(no.linha) ?? []), no]);
  }
  const linhasOrdenadas = [...porLinha.keys()].sort(
    (a, b) => Math.min(...porLinha.get(a)!.map((n) => n.ordem)) - Math.min(...porLinha.get(b)!.map((n) => n.ordem)),
  );
  const indiceDaLinha = new Map(linhasOrdenadas.map((l, i) => [l, i]));

  grupos.forEach(([, doGrupo], i) => {
    const x = inicioXColunas + i * (LARGURA_CAIXA + GAP_X);
    const comLinha = doGrupo.filter((n) => n.linha);
    const semLinha = ordenar(doGrupo.filter((n) => !n.linha));

    for (const no of comLinha) {
      const k = indiceDaLinha.get(no.linha!)!;
      posicoes.set(no.id, { x, y: linhaColunasY + ALTURA_CABECALHO_GRUPO + k * (ALTURA_CAIXA + GAP_Y_MEMBRO) });
    }
    // Quem não tem `linha` empilha logo abaixo da grade (depois da última linha existente).
    semLinha.forEach((no, k) => {
      posicoes.set(no.id, {
        x,
        y: linhaColunasY + ALTURA_CABECALHO_GRUPO + (linhasOrdenadas.length + k) * (ALTURA_CAIXA + GAP_Y_MEMBRO),
      });
    });
  });

  return posicoes;
}
