/**
 * Layout automático do Organograma do Futebol de Base (ver
 * docs/superpowers/specs/2026-08-23-organograma-base-design.md e
 * docs/superpowers/specs/2026-09-15-organograma-cartoes-por-comissao-design.md).
 *
 * Duas famílias de caixa:
 * - **Liderança** (sem `grupo`): Presidente, Diretor, Coordenador, Supervisor... formam uma árvore
 *   normal por "reporta para" — essas continuam podendo ser arrastadas (posição manual salva).
 * - **Cartão de comissão/departamento** (com `grupo`, agrupadas por `linha`): cada valor distinto de
 *   `linha` vira UM cartão (título = nome da comissão/departamento, lista vertical de função→pessoa
 *   por dentro). Um cartão nunca é arrastado — sua posição é sempre calculada aqui, ligada à caixa de
 *   liderança que a `linha` reporta pra (`linhaReportaPara`, tabela `organograma_base_linha`). Uma
 *   caixa com `grupo` mas SEM `linha` (caso raro/legado) vira um cartão de 1 item só, ligado via o
 *   `reportaPara` da própria caixa (mesmo campo que uma liderança usa).
 *
 * O desenho é uma árvore só: cada caixa de liderança pode ter, como filhos, outras lideranças E/OU
 * cartões: a largura reservada pra ela na fileira de irmãos é a largura do que tiver embaixo dela
 * (soma dos filhos), nunca só a largura da própria caixa — é isso que evita um supervisor com 3
 * comissões embaixo esbarrar no supervisor vizinho.
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

// Reduzidas (eram 220/230) a pedido do Mateus — a árvore fica larga rápido com vários supervisores/
// comissões, e uma caixa/cartão mais estreito sobra mais espaço horizontal pro organograma crescer
// antes de precisar encolher a página inteira (nome/cargo continuam cabendo: cortam com "…" quando
// não cabem, tela e PDF já tratam isso).
export const LARGURA_CAIXA = 180;
export const ALTURA_CAIXA = 84;
export const LARGURA_CARTAO = 200;
export const ALTURA_TITULO_CARTAO = 30;
export const ALTURA_ITEM_CARTAO = 34;
export const PADDING_CARTAO_V = 10;
const GAP_X = 24;
const GAP_Y_NIVEL = 64;

/** Distância fixa (px lógicos) entre o pé de uma caixa-pai e o cotovelo do conector que desce até
 * quem reporta pra ela — ver `calcularConectores` abaixo. */
export const GAP_BARRAMENTO = 20;

/** Ordem fixa das funções dentro de um cartão de comissão/departamento (pedido do Mateus) — uma
 * função fora dessa lista (alguma nova criada depois) cai no fim, ordenada por `ordem` normalmente. */
export const ORDEM_FUNCOES_PADRAO = [
  "Treinador",
  "Auxiliar Técnico",
  "Prep. Físico",
  "Treinador de Goleiro",
  "Analista de Desempenho",
  "Fisiologista",
  "Fisioterapeuta",
  "Psicólogo",
  "Massagista",
  "Roupeiro",
];

/** Ordena os itens de UM cartão pela lista fixa de função acima; empate (mesma função, ou função
 * fora da lista) desempata por `ordem`. Compartilhada entre tela e PDF pra nunca divergir. */
export function ordenarItensDoCartao<T extends { grupo: string | null; ordem: number }>(itens: T[]): T[] {
  const indice = (grupo: string | null) => {
    const i = grupo ? ORDEM_FUNCOES_PADRAO.indexOf(grupo) : -1;
    return i === -1 ? ORDEM_FUNCOES_PADRAO.length : i;
  };
  return [...itens].sort((a, b) => indice(a.grupo) - indice(b.grupo) || a.ordem - b.ordem);
}

/** Altura de um cartão com `quantidadeItens` linhas — cresce conforme a comissão/departamento tem
 * mais gente, sem grade pra alinhar (cada cartão usa só o espaço que precisa). */
export function alturaCartao(quantidadeItens: number): number {
  return ALTURA_TITULO_CARTAO + PADDING_CARTAO_V * 2 + Math.max(1, quantidadeItens) * ALTURA_ITEM_CARTAO;
}

/** Cor do nome de UM item dentro de um cartão — compartilhada entre tela e PDF pra nunca divergir.
 * `vinculadoEmDuasOuMaisComissoes` já vem calculado por quem chama (precisa olhar o cartão inteiro:
 * mesma pessoa vinculada em 2+ cartões vira "dourado"); "vermelho" é independente disso e olha só o
 * texto do nome digitado à mão (sem vínculo) contendo "contratar" (sinaliza uma vaga em aberto que o
 * Mateus cadastrou manualmente, já que o cartão não gera "???" automático). As duas nunca coincidem:
 * uma pessoa vinculada não se chama "a contratar". */
export function corNomeCartao(nome: string | null, vinculadoEmDuasOuMaisComissoes: boolean): "normal" | "dourado" | "vermelho" {
  if (vinculadoEmDuasOuMaisComissoes) return "dourado";
  if (nome && nome.toLocaleLowerCase("pt-BR").includes("contratar")) return "vermelho";
  return "normal";
}

export interface OrganogramaCartaoInfo {
  /** `linha` de verdade quando presente; senão uma chave sintética `solo:<id>` pra uma caixa com
   * `grupo` mas sem `linha` (vira cartão de 1 item só). */
  chave: string;
  /** Nome da comissão/departamento (a própria `linha`), ou a função do item único num cartão solo. */
  titulo: string;
  /** Ids dos nós que formam o cartão, já na ordem de exibição (`ordenarItensDoCartao`). */
  itens: string[];
  /** Id da caixa de liderança pra quem esse cartão reporta (`organograma_base_linha.reporta_para`
   * pra um cartão de verdade; o `reportaPara` do próprio nó pra um cartão solo) — `null` quando não
   * definido ou quando aponta pra alguém que não existe mais (cartão cai no grupo "sem supervisor").
   * Exposto aqui (em vez de só usado internamente) pra quem desenha os conectores
   * (`calcularConectores`) nunca precisar recalcular essa resolução por conta própria — mesmo
   * espírito de nunca divergir entre tela e PDF. */
  parentId: string | null;
}

export interface OrganogramaLayout {
  posicoesLideranca: Map<string, OrganogramaPosicao>;
  cartoes: OrganogramaCartaoInfo[];
  posicoesCartao: Map<string, OrganogramaPosicao>;
}

/** Monta a lista de conexões supervisor→cartão pra passar em `calcularConectores` — só os cartões
 * que têm um `parentId` válido (sem supervisor definido não desenha conector nenhum, fica só na
 * fileira à parte). Extraído aqui, em vez de cada consumidor montar essa lista por conta própria,
 * pra tela e PDF nunca divergirem em COMO um `OrganogramaLayout` vira entrada de `calcularConectores`. */
export function cartoesConectadosDoLayout(
  layout: Pick<OrganogramaLayout, "cartoes" | "posicoesCartao">,
): { chave: string; parentId: string; x: number; y: number }[] {
  const resultado: { chave: string; parentId: string; x: number; y: number }[] = [];
  for (const cartao of layout.cartoes) {
    if (!cartao.parentId) continue;
    const pos = layout.posicoesCartao.get(cartao.chave);
    if (!pos) continue;
    resultado.push({ chave: cartao.chave, parentId: cartao.parentId, x: pos.x, y: pos.y });
  }
  return resultado;
}

/** Quantas comissões/departamentos (cartões) distintos cada pessoa vinculada aparece em — usado pra
 * decidir quem pinta o nome de dourado (`corNomeCartao`). Só conta pessoa vinculada
 * (`comissaoTecnicaBaseId` não nulo, resolvido por quem chama via `comissaoTecnicaBaseIdPorNo`) —
 * nome digitado à mão nunca entra aqui, mesmo repetindo por coincidência. Compartilhada entre tela e
 * PDF pra nunca divergir em quem conta como "duplicado". */
export function contarCartoesPorPessoaVinculada(
  cartoes: OrganogramaCartaoInfo[],
  comissaoTecnicaBaseIdPorNo: Map<string, string | null>,
): Map<string, number> {
  const cartoesPorPessoa = new Map<string, Set<string>>();
  for (const cartao of cartoes) {
    for (const itemId of cartao.itens) {
      const pessoaId = comissaoTecnicaBaseIdPorNo.get(itemId);
      if (!pessoaId) continue;
      const set = cartoesPorPessoa.get(pessoaId) ?? new Set<string>();
      set.add(cartao.chave);
      cartoesPorPessoa.set(pessoaId, set);
    }
  }
  const contagem = new Map<string, number>();
  for (const [pessoaId, chaves] of cartoesPorPessoa) contagem.set(pessoaId, chaves.size);
  return contagem;
}

/**
 * Agrupa cada `linha` (comissão/departamento) pelo id da liderança pra quem ela reporta — mesma regra
 * de resolução do layout (aponta pra ninguém, ou pra alguém que não existe mais/não é liderança, cai
 * no grupo "sem supervisor", chave `null`). Usado por "Mover linha pra cima/baixo" (tela e servidor,
 * `moverLinhaOrganograma`) pra só comparar/trocar `ordem` entre IRMÃS DE VERDADE (mesmo supervisor) —
 * antes disso a lista era global (todas as linhas do organograma inteiro, de qualquer supervisor),
 * então mover uma linha podia trocar `ordem` com a linha de OUTRO supervisor: como `posicionar()` só
 * ordena filhos dentro do mesmo pai, essa troca não mudava nada visualmente (parecia que o botão "não
 * deixava" reordenar) e ainda podia atrapalhar a ordem de quem era irmã de verdade (pedido do Mateus
 * de 16/09, depois de splitar os supervisores Gustavo/Italo). Cada lista interna já sai ordenada pelo
 * mesmo critério de sempre (menor `ordem` entre quem está na linha).
 */
export function agruparLinhasPorSupervisor(
  nos: Pick<OrganogramaNo, "id" | "grupo" | "linha" | "ordem">[],
  linhaReportaPara: Map<string, string | null>,
): Map<string | null, string[]> {
  const lideresIds = new Set(nos.filter((n) => !n.grupo).map((n) => n.id));
  const ordensPorLinha = new Map<string, number[]>();
  for (const n of nos) {
    if (!n.grupo || !n.linha) continue;
    ordensPorLinha.set(n.linha, [...(ordensPorLinha.get(n.linha) ?? []), n.ordem]);
  }

  const brutoPorGrupo = new Map<string | null, { linha: string; minOrdem: number }[]>();
  for (const [linha, ordens] of ordensPorLinha) {
    const paiBruto = linhaReportaPara.get(linha) ?? null;
    const pai = paiBruto && lideresIds.has(paiBruto) ? paiBruto : null;
    brutoPorGrupo.set(pai, [...(brutoPorGrupo.get(pai) ?? []), { linha, minOrdem: Math.min(...ordens) }]);
  }

  const resultado = new Map<string | null, string[]>();
  for (const [pai, lista] of brutoPorGrupo) {
    resultado.set(
      pai,
      [...lista].sort((a, b) => a.minOrdem - b.minOrdem).map((l) => l.linha),
    );
  }
  return resultado;
}

interface NoInterno {
  tipo: "lideranca" | "cartao";
  id: string; // id da liderança, ou `chave` do cartão
  ordem: number;
  filhos: NoInterno[];
}

function largura(no: NoInterno, cache: Map<string, number>): number {
  const cacheado = cache.get(no.id);
  if (cacheado !== undefined) return cacheado;
  const larguraPropria = no.tipo === "cartao" ? LARGURA_CARTAO : LARGURA_CAIXA;
  if (no.filhos.length === 0) {
    cache.set(no.id, larguraPropria);
    return larguraPropria;
  }
  const somaFilhos =
    no.filhos.reduce((soma, f) => soma + largura(f, cache), 0) + GAP_X * (no.filhos.length - 1);
  const resultado = Math.max(larguraPropria, somaFilhos);
  cache.set(no.id, resultado);
  return resultado;
}

function posicionar(
  no: NoInterno,
  centroX: number,
  y: number,
  cacheLargura: Map<string, number>,
  posicoesLideranca: Map<string, OrganogramaPosicao>,
  posicoesCartao: Map<string, OrganogramaPosicao>,
): void {
  const larguraPropria = no.tipo === "cartao" ? LARGURA_CARTAO : LARGURA_CAIXA;
  const x = centroX - larguraPropria / 2;
  if (no.tipo === "cartao") posicoesCartao.set(no.id, { x, y });
  else posicoesLideranca.set(no.id, { x, y });

  if (no.filhos.length === 0) return;
  const larguraTotal = no.filhos.reduce((soma, f) => soma + largura(f, cacheLargura), 0) + GAP_X * (no.filhos.length - 1);
  let cursor = centroX - larguraTotal / 2;
  const yFilhos = y + ALTURA_CAIXA + GAP_Y_NIVEL;
  for (const filho of [...no.filhos].sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id))) {
    const larguraFilho = largura(filho, cacheLargura);
    posicionar(filho, cursor + larguraFilho / 2, yFilhos, cacheLargura, posicoesLideranca, posicoesCartao);
    cursor += larguraFilho + GAP_X;
  }
}

export function calcularLayoutAutomatico(
  nos: OrganogramaNo[],
  linhaReportaPara: Map<string, string | null>,
): OrganogramaLayout {
  const posicoesLideranca = new Map<string, OrganogramaPosicao>();
  const posicoesCartao = new Map<string, OrganogramaPosicao>();

  const lideres = nos.filter((n) => !n.grupo);
  const lideresPorId = new Map(lideres.map((n) => [n.id, n]));
  const membros = nos.filter((n) => n.grupo);

  // --- Monta os cartões: agrupa por `linha`; sem `linha`, cada caixa vira seu próprio cartão. ---
  const gruposPorLinha = new Map<string, OrganogramaNo[]>();
  const solos: OrganogramaNo[] = [];
  for (const no of membros) {
    if (no.linha) {
      gruposPorLinha.set(no.linha, [...(gruposPorLinha.get(no.linha) ?? []), no]);
    } else {
      solos.push(no);
    }
  }

  const cartoes: OrganogramaCartaoInfo[] = [];
  // chave do cartão -> id da liderança pra quem reporta (null = sem supervisor / não encontrado).
  const paiDoCartao = new Map<string, string | null>();

  for (const [linha, doGrupo] of gruposPorLinha) {
    const ordenados = ordenarItensDoCartao(doGrupo);
    const paiIdBruto = linhaReportaPara.get(linha) ?? null;
    const parentId = paiIdBruto && lideresPorId.has(paiIdBruto) ? paiIdBruto : null;
    cartoes.push({ chave: linha, titulo: linha, itens: ordenados.map((n) => n.id), parentId });
    paiDoCartao.set(linha, parentId);
  }
  for (const no of solos) {
    const chave = `solo:${no.id}`;
    const paiIdBruto = no.reportaPara;
    const parentId = paiIdBruto && lideresPorId.has(paiIdBruto) ? paiIdBruto : null;
    cartoes.push({ chave, titulo: no.grupo!, itens: [no.id], parentId });
    paiDoCartao.set(chave, parentId);
  }
  // Ordem determinística de exibição (cartões sem supervisor entram por último, na hora de montar a
  // fileira órfã lá embaixo) — mesmo critério de sempre: menor `ordem` entre quem está no cartão.
  const ordemDoCartao = new Map(
    cartoes.map((c) => [c.chave, Math.min(...c.itens.map((id) => nos.find((n) => n.id === id)!.ordem))]),
  );

  // --- Árvore interna: cada liderança carrega, como filhos, outras lideranças que reportam pra ela
  // e os cartões cujo supervisor é ela. ---
  const filhosPorLideranca = new Map<string, NoInterno[]>();
  function noInterno(id: string, tipo: "lideranca" | "cartao", ordem: number): NoInterno {
    return { tipo, id, ordem, filhos: filhosPorLideranca.get(id) ?? [] };
  }

  // Registra os filhos-cartão de cada liderança antes de montar a árvore (pra já vir populado
  // quando `noInterno` for chamado nas lideranças).
  const cartaoFilhosPorPai = new Map<string, string[]>();
  for (const cartao of cartoes) {
    const pai = paiDoCartao.get(cartao.chave);
    if (!pai) continue;
    cartaoFilhosPorPai.set(pai, [...(cartaoFilhosPorPai.get(pai) ?? []), cartao.chave]);
  }

  // Profundidade de cada liderança, só pela cadeia de outras lideranças (raiz = 0), com guarda de
  // ciclo — mesmo espírito da função equivalente da versão anterior deste arquivo.
  function ehDescendenteValido(id: string, visitando: Set<string>): boolean {
    if (visitando.has(id)) return false;
    const no = lideresPorId.get(id);
    if (!no || !no.reportaPara) return true;
    // Aponta pra alguém que não existe entre as lideranças — vínculo quebrado, não uma cadeia válida
    // (precisa retornar `false` aqui pra essa liderança virar raiz lá embaixo, não o contrário).
    if (!lideresPorId.has(no.reportaPara)) return false;
    visitando.add(id);
    return ehDescendenteValido(no.reportaPara, visitando);
  }

  // Raízes: lideranças sem "reporta para" válido (aponta pra ninguém, ou pra alguém que não existe/
  // forma ciclo) — nunca trava o layout por causa de um vínculo quebrado.
  const raizes = lideres.filter((l) => !l.reportaPara || !ehDescendenteValido(l.id, new Set()));
  const raizesIds = new Set(raizes.map((r) => r.id));

  function montarNoInterno(id: string): NoInterno {
    const lider = lideresPorId.get(id)!;
    // Exclui quem já é raiz por conta própria (vínculo quebrado/ciclo) — evita recursão infinita
    // quando duas lideranças reportam uma pra outra (cada uma vira sua própria raiz solitária, em
    // vez de tentarem se engolir mutuamente como filha uma da outra).
    const filhosLideranca = lideres
      .filter((l) => l.reportaPara === id && !raizesIds.has(l.id))
      .map((l) => montarNoInterno(l.id));
    const filhosCartao = (cartaoFilhosPorPai.get(id) ?? []).map((chave) => {
      const cartao = cartoes.find((c) => c.chave === chave)!;
      return { tipo: "cartao" as const, id: chave, ordem: ordemDoCartao.get(chave) ?? 0, filhos: [] };
    });
    return { tipo: "lideranca", id, ordem: lider.ordem, filhos: [...filhosLideranca, ...filhosCartao] };
  }

  const arvoreRaizes = raizes.map((r) => montarNoInterno(r.id));

  const cacheLargura = new Map<string, number>();
  if (arvoreRaizes.length > 0) {
    const larguraTotal =
      arvoreRaizes.reduce((soma, r) => soma + largura(r, cacheLargura), 0) + GAP_X * (arvoreRaizes.length - 1);
    let cursor = -larguraTotal / 2;
    for (const raiz of [...arvoreRaizes].sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id))) {
      const larguraRaiz = largura(raiz, cacheLargura);
      posicionar(raiz, cursor + larguraRaiz / 2, 0, cacheLargura, posicoesLideranca, posicoesCartao);
      cursor += larguraRaiz + GAP_X;
    }
  }

  // --- Cartões sem supervisor válido (não encontrado, ou nunca escolhido): fileira própria, sempre
  // abaixo de tudo que já foi posicionado — nunca precisa disputar espaço com a árvore principal. ---
  const cartoesOrfaos = cartoes.filter((c) => !paiDoCartao.get(c.chave));
  if (cartoesOrfaos.length > 0) {
    const todasAsPosicoes = [
      ...[...posicoesLideranca.values()].map((p) => ({ ...p, altura: ALTURA_CAIXA })),
      ...[...posicoesCartao.entries()].map(([chave, p]) => {
        const cartao = cartoes.find((c) => c.chave === chave)!;
        return { ...p, altura: alturaCartao(cartao.itens.length) };
      }),
    ];
    const yInicial =
      todasAsPosicoes.length > 0
        ? Math.max(...todasAsPosicoes.map((p) => p.y + p.altura)) + GAP_Y_NIVEL
        : 0;
    // Centralizada em x=0, mesmo critério da fileira de lideranças acima — começar em x=0 e só
    // crescer pra direita (jeito antigo) deixava essa fileira jogada pro lado direito do desenho
    // sempre que a árvore principal também tivesse conteúdo à esquerda de x=0, quebrando a
    // centralização do desenho inteiro (relatado pelo Mateus).
    const larguraTotalOrfaos = cartoesOrfaos.length * LARGURA_CARTAO + (cartoesOrfaos.length - 1) * GAP_X;
    let cursorX = -larguraTotalOrfaos / 2;
    for (const cartao of [...cartoesOrfaos].sort(
      (a, b) => (ordemDoCartao.get(a.chave) ?? 0) - (ordemDoCartao.get(b.chave) ?? 0) || a.chave.localeCompare(b.chave),
    )) {
      posicoesCartao.set(cartao.chave, { x: cursorX, y: yInicial });
      cursorX += LARGURA_CARTAO + GAP_X;
    }
  }

  return { posicoesLideranca, cartoes, posicoesCartao };
}

export interface OrganogramaSegmento {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface FilhoParaConector {
  key: string;
  parentId: string;
  centroX: number;
  topoY: number;
}

/**
 * Conectores em ângulo reto (tronco descendo do pai, barramento horizontal, pé descendo até cada
 * filho) — usado tanto pela tela (`OrganogramaEditor`) quanto pelo PDF (`OrganogramaBaseDocument`),
 * extraído aqui pra garantir que os dois nunca divirjam. Cobre dois tipos de filho: outra liderança
 * que reporta pra essa (`nosLideranca` + `posicoesLideranca`), e um cartão de comissão/departamento
 * que reporta pra essa (`cartoesConectados`, já resolvidos com a posição de cada cartão).
 *
 * O cotovelo (`busY`) fica numa distância fixa e curta (`GAP_BARRAMENTO`) abaixo do pé da caixa-pai,
 * não proporcional à distância até o filho mais próximo — ver spec de 27/08 do design original.
 */
export function calcularConectores(
  nosLideranca: OrganogramaNo[],
  posicoesLideranca: Map<string, OrganogramaPosicao>,
  cartoesConectados: { chave: string; parentId: string; x: number; y: number }[] = [],
): OrganogramaSegmento[] {
  const porPai = new Map<string, FilhoParaConector[]>();
  for (const no of nosLideranca) {
    if (!no.reportaPara) continue;
    const pos = posicoesLideranca.get(no.id);
    if (!pos) continue;
    porPai.set(no.reportaPara, [
      ...(porPai.get(no.reportaPara) ?? []),
      { key: no.id, parentId: no.reportaPara, centroX: pos.x + LARGURA_CAIXA / 2, topoY: pos.y },
    ]);
  }
  for (const cartao of cartoesConectados) {
    porPai.set(cartao.parentId, [
      ...(porPai.get(cartao.parentId) ?? []),
      { key: `cartao:${cartao.chave}`, parentId: cartao.parentId, centroX: cartao.x + LARGURA_CARTAO / 2, topoY: cartao.y },
    ]);
  }

  const segmentos: OrganogramaSegmento[] = [];
  for (const [paiId, filhos] of porPai) {
    const pai = posicoesLideranca.get(paiId);
    if (!pai || filhos.length === 0) continue;
    const paiCentroX = pai.x + LARGURA_CAIXA / 2;
    const paiBaixoY = pai.y + ALTURA_CAIXA;
    const filhosCentroX = filhos.map((f) => f.centroX);
    const menorTopoFilho = Math.min(...filhos.map((f) => f.topoY));
    const busY = paiBaixoY + Math.min(GAP_BARRAMENTO, Math.max(4, menorTopoFilho - paiBaixoY - 4));

    segmentos.push({ key: `${paiId}-tronco`, x1: paiCentroX, y1: paiBaixoY, x2: paiCentroX, y2: busY });
    const minX = Math.min(paiCentroX, ...filhosCentroX);
    const maxX = Math.max(paiCentroX, ...filhosCentroX);
    if (maxX > minX) {
      segmentos.push({ key: `${paiId}-barramento`, x1: minX, y1: busY, x2: maxX, y2: busY });
    }
    filhos.forEach((f, i) => {
      segmentos.push({ key: `${paiId}-pe-${i}-${f.key}`, x1: f.centroX, y1: busY, x2: f.centroX, y2: f.topoY });
    });
  }
  return segmentos;
}
