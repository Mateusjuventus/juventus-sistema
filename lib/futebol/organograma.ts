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

/** Distância fixa (px lógicos) entre o pé de uma caixa-pai e o cotovelo do conector que desce até
 * quem reporta pra ela — ver `calcularConectores` abaixo. */
export const GAP_BARRAMENTO = 20;

/** Encolhimento mínimo permitido do Organograma na tela (`OrganogramaEditor`) antes de voltar a
 * valer o scroll horizontal — mesmo piso já usado no PDF do Campograma
 * (`lib/pdf/campograma-document.tsx`), consistente com o resto do sistema. */
export const ESCALA_MINIMA_ORGANOGRAMA = 0.6;

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
  // Ponto fixo (não depende de quantas colunas existem agora) — a primeira coluna sempre começa
  // centralizada sob uma caixa de liderança sozinha, e cada coluna nova só estende a grade pra
  // direita. Antes, recalculava o centro de TODA a faixa toda vez que o número de colunas mudava
  // (`-larguraTotal / 2`), o que deslocava quem já estava posicionado só por causa de uma coluna
  // nova em outro canto do organograma — a "linha vertical se movimentando" reportada pelo Mateus.
  const inicioXColunas = -LARGURA_CAIXA / 2;

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

export interface OrganogramaSegmento {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Conectores em ângulo reto (tronco descendo do pai, barramento horizontal, pé descendo até cada
 * filho) entre cada caixa e quem reporta pra ela — usado tanto pela tela (`OrganogramaEditor`)
 * quanto pelo PDF (`OrganogramaBaseDocument`), extraído aqui pra garantir que os dois nunca
 * divirjam (era duas cópias quase idênticas antes, ver spec de 27/08).
 *
 * O cotovelo (onde o conector vira de vertical pra horizontal, `busY`) fica numa distância fixa e
 * curta (`GAP_BARRAMENTO`) abaixo do pé da caixa-pai — não proporcional à distância até o filho mais
 * próximo. Antes disso, caixas de liderança arrastadas pra mais longe ou mais perto umas das outras
 * faziam o cotovelo flutuar em alturas bem diferentes de um par pra outro, sem padrão nenhum ("fica
 * bagunçado", nas palavras do Mateus). A salvaguarda (`Math.max(4, ...)`) evita o cotovelo cair em
 * cima ou depois do filho quando ele está mais perto do pai do que essa distância fixa.
 */
export function calcularConectores(
  nos: OrganogramaNo[],
  posicoes: Map<string, OrganogramaPosicao>,
): OrganogramaSegmento[] {
  const porPai = new Map<string, OrganogramaPosicao[]>();
  for (const no of nos) {
    if (!no.reportaPara) continue;
    const pos = posicoes.get(no.id);
    if (!pos) continue;
    porPai.set(no.reportaPara, [...(porPai.get(no.reportaPara) ?? []), pos]);
  }

  const segmentos: OrganogramaSegmento[] = [];
  for (const [paiId, filhos] of porPai) {
    const pai = posicoes.get(paiId);
    if (!pai || filhos.length === 0) continue;
    const paiCentroX = pai.x + LARGURA_CAIXA / 2;
    const paiBaixoY = pai.y + ALTURA_CAIXA;
    const filhosCentroX = filhos.map((f) => f.x + LARGURA_CAIXA / 2);
    const menorTopoFilho = Math.min(...filhos.map((f) => f.y));
    const busY = paiBaixoY + Math.min(GAP_BARRAMENTO, Math.max(4, menorTopoFilho - paiBaixoY - 4));

    // Tronco: do pé do pai até o barramento.
    segmentos.push({ key: `${paiId}-tronco`, x1: paiCentroX, y1: paiBaixoY, x2: paiCentroX, y2: busY });
    // Barramento horizontal, cobrindo do filho mais à esquerda ao mais à direita (e o tronco do
    // pai, se ele cair fora desse intervalo).
    const minX = Math.min(paiCentroX, ...filhosCentroX);
    const maxX = Math.max(paiCentroX, ...filhosCentroX);
    if (maxX > minX) {
      segmentos.push({ key: `${paiId}-barramento`, x1: minX, y1: busY, x2: maxX, y2: busY });
    }
    // Um pé descendo do barramento até cada filho.
    filhos.forEach((f, i) => {
      segmentos.push({
        key: `${paiId}-pe-${i}`,
        x1: filhosCentroX[i],
        y1: busY,
        x2: filhosCentroX[i],
        y2: f.y,
      });
    });
  }
  return segmentos;
}

/**
 * Fator de escala visual do Organograma na tela (`OrganogramaEditor`) — encolhe (nunca amplia) pra
 * caber na largura disponível do cartão, com piso em `ESCALA_MINIMA_ORGANOGRAMA` (abaixo disso volta
 * a valer o scroll horizontal em vez de continuar encolhendo até ficar ilegível). Só a largura entra
 * nessa conta — a altura continua com scroll vertical normal, que já existe e não foi reportada como
 * problema (ver spec de 27/08).
 */
export function calcularEscalaOrganograma(larguraNatural: number, larguraDisponivel: number): number {
  if (larguraNatural <= 0 || larguraDisponivel <= 0) return 1;
  const bruta = larguraDisponivel / larguraNatural;
  return Math.min(1, Math.max(ESCALA_MINIMA_ORGANOGRAMA, bruta));
}
