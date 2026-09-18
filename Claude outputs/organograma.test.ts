import { describe, expect, it } from "vitest";
import {
  ALTURA_CAIXA,
  ALTURA_ITEM_CARTAO,
  ALTURA_TITULO_CARTAO,
  GAP_BARRAMENTO,
  LARGURA_CAIXA,
  LARGURA_CARTAO,
  PADDING_CARTAO_V,
  agruparLinhasPorSupervisor,
  alturaCartao,
  calcularConectores,
  calcularLayoutAutomatico,
  cartoesConectadosDoLayout,
  contarCartoesPorPessoaVinculada,
  corNomeCartao,
  ordenarItensDoCartao,
  type OrganogramaNo,
  type OrganogramaPosicao,
} from "./organograma";

// `x`/`y` marcam o canto (não o centro) da caixa — uma caixa sozinha, centralizada, começa em
// -LARGURA_CAIXA/2, não em 0.
const X_CAIXA_SOLITARIA = -LARGURA_CAIXA / 2;

function no(
  id: string,
  reportaPara: string | null,
  grupo: string | null,
  ordem = 0,
  linha: string | null = null,
): OrganogramaNo {
  return { id, reportaPara, grupo, linha, ordem };
}

describe("calcularLayoutAutomatico", () => {
  it("posiciona uma liderança raiz sozinha, sem cartões", () => {
    const layout = calcularLayoutAutomatico([no("presidente", null, null)], new Map());
    expect(layout.posicoesLideranca.get("presidente")).toEqual({ x: X_CAIXA_SOLITARIA, y: 0 });
    expect(layout.cartoes).toEqual([]);
  });

  it("empilha uma cadeia de liderança em níveis crescentes", () => {
    const layout = calcularLayoutAutomatico(
      [no("presidente", null, null), no("diretor", "presidente", null), no("coordenador", "diretor", null)],
      new Map(),
    );
    expect(layout.posicoesLideranca.get("presidente")!.y).toBe(0);
    expect(layout.posicoesLideranca.get("diretor")!.y).toBeGreaterThan(layout.posicoesLideranca.get("presidente")!.y);
    expect(layout.posicoesLideranca.get("coordenador")!.y).toBeGreaterThan(layout.posicoesLideranca.get("diretor")!.y);
  });

  it("espalha lado a lado quem está no mesmo nível", () => {
    const layout = calcularLayoutAutomatico(
      [no("coordenador", null, null), no("a", "coordenador", null, 0), no("b", "coordenador", null, 1)],
      new Map(),
    );
    expect(layout.posicoesLideranca.get("a")!.y).toBe(layout.posicoesLideranca.get("b")!.y);
    expect(layout.posicoesLideranca.get("a")!.x).toBeLessThan(layout.posicoesLideranca.get("b")!.x);
  });

  it("nunca trava com um `reportaPara` que aponta pra alguém inexistente (vira raiz)", () => {
    const layout = calcularLayoutAutomatico([no("orfao", "ninguem-existe", null)], new Map());
    expect(layout.posicoesLideranca.get("orfao")).toEqual({ x: X_CAIXA_SOLITARIA, y: 0 });
  });

  it("nunca trava com um ciclo entre lideranças (ambas viram raiz)", () => {
    const nos: OrganogramaNo[] = [no("a", "b", null), no("b", "a", null)];
    expect(() => calcularLayoutAutomatico(nos, new Map())).not.toThrow();
    const layout = calcularLayoutAutomatico(nos, new Map());
    expect(layout.posicoesLideranca.get("a")).toBeDefined();
    expect(layout.posicoesLideranca.get("b")).toBeDefined();
  });

  it("agrupa quem tem a mesma `linha` num cartão só", () => {
    const layout = calcularLayoutAutomatico(
      [
        no("coordenador", null, null),
        no("treinador-sub20", null, "Treinador", 0, "Comissão Sub20"),
        no("aux-sub20", null, "Auxiliar Técnico", 1, "Comissão Sub20"),
      ],
      new Map([["Comissão Sub20", "coordenador"]]),
    );
    expect(layout.cartoes).toHaveLength(1);
    expect(layout.cartoes[0].chave).toBe("Comissão Sub20");
    expect(layout.cartoes[0].titulo).toBe("Comissão Sub20");
    expect(layout.cartoes[0].itens).toEqual(["treinador-sub20", "aux-sub20"]);
    expect(layout.posicoesCartao.has("Comissão Sub20")).toBe(true);
    expect(layout.posicoesCartao.get("Comissão Sub20")!.y).toBeGreaterThan(
      layout.posicoesLideranca.get("coordenador")!.y + ALTURA_CAIXA,
    );
  });

  it("ordena os itens do cartão pela ordem fixa de função, não pela ordem de cadastro", () => {
    const layout = calcularLayoutAutomatico(
      [
        no("coordenador", null, null),
        no("aux-sub20", null, "Auxiliar Técnico", 0, "Comissão Sub20"),
        no("treinador-sub20", null, "Treinador", 1, "Comissão Sub20"),
      ],
      new Map([["Comissão Sub20", "coordenador"]]),
    );
    expect(layout.cartoes[0].itens).toEqual(["treinador-sub20", "aux-sub20"]);
  });

  it("só mostra quem tem — não inventa vaga pra função faltando", () => {
    const layout = calcularLayoutAutomatico(
      [no("coordenador", null, null), no("treinador-sub20", null, "Treinador", 0, "Comissão Sub20")],
      new Map([["Comissão Sub20", "coordenador"]]),
    );
    expect(layout.cartoes[0].itens).toEqual(["treinador-sub20"]);
  });

  it("uma caixa com `grupo` mas sem `linha` vira um cartão solo de 1 item só", () => {
    const layout = calcularLayoutAutomatico(
      [no("coordenador", null, null), no("medico-solo", "coordenador", "Médico", 0, null)],
      new Map(),
    );
    expect(layout.cartoes).toHaveLength(1);
    expect(layout.cartoes[0].chave).toBe("solo:medico-solo");
    expect(layout.cartoes[0].titulo).toBe("Médico");
    expect(layout.cartoes[0].itens).toEqual(["medico-solo"]);
    expect(layout.posicoesCartao.get("solo:medico-solo")!.y).toBeGreaterThan(
      layout.posicoesLideranca.get("coordenador")!.y + ALTURA_CAIXA,
    );
  });

  it("cartão sem supervisor definido ainda aparece, numa fileira separada abaixo de tudo", () => {
    const layout = calcularLayoutAutomatico(
      [no("coordenador", null, null), no("treinador-orfao", null, "Treinador", 0, "Comissão Sem Supervisor")],
      new Map(),
    );
    expect(layout.posicoesCartao.has("Comissão Sem Supervisor")).toBe(true);
    expect(layout.posicoesCartao.get("Comissão Sem Supervisor")!.y).toBeGreaterThan(
      layout.posicoesLideranca.get("coordenador")!.y + ALTURA_CAIXA,
    );
  });

  it("cartão cujo supervisor referenciado não existe mais cai no mesmo grupo de sem-supervisor", () => {
    const layout = calcularLayoutAutomatico(
      [no("coordenador", null, null), no("treinador-x", null, "Treinador", 0, "Comissão X")],
      new Map([["Comissão X", "ninguem-existe"]]),
    );
    expect(layout.posicoesCartao.has("Comissão X")).toBe(true);
    expect(layout.posicoesCartao.get("Comissão X")!.y).toBeGreaterThan(
      layout.posicoesLideranca.get("coordenador")!.y + ALTURA_CAIXA,
    );
  });

  it("fileira de cartões sem supervisor fica centralizada em x=0, não jogada pra direita", () => {
    const layout = calcularLayoutAutomatico(
      [
        no("coordenador", null, null),
        no("treinador-a", null, "Treinador", 0, "Comissão A"),
        no("treinador-b", null, "Treinador", 1, "Comissão B"),
      ],
      new Map(), // nenhuma das duas linhas tem supervisor definido — as duas caem na fileira órfã
    );
    const a = layout.posicoesCartao.get("Comissão A")!;
    const b = layout.posicoesCartao.get("Comissão B")!;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x) + LARGURA_CARTAO;
    // Ponto médio da fileira inteira tem que ficar em x=0 (mesma referência da árvore de liderança
    // acima) — a versão anterior começava em x=0 e só crescia pra direita, ficando toda deslocada.
    expect((minX + maxX) / 2).toBeCloseTo(0);
  });

  it("dois supervisores com números diferentes de comissões não se sobrepõem (largura por subárvore)", () => {
    const layout = calcularLayoutAutomatico(
      [
        no("coordenador", null, null),
        no("gustavo", "coordenador", null, 0),
        no("italo", "coordenador", null, 1),
        no("g-sub20", null, "Treinador", 0, "Comissão Sub20"),
        no("g-sub17", null, "Treinador", 1, "Comissão Sub17"),
        no("g-sub15", null, "Treinador", 2, "Comissão Sub15"),
        no("i-sub14", null, "Treinador", 3, "Comissão Sub14"),
      ],
      new Map([
        ["Comissão Sub20", "gustavo"],
        ["Comissão Sub17", "gustavo"],
        ["Comissão Sub15", "gustavo"],
        ["Comissão Sub14", "italo"],
      ]),
    );
    const gustavoCartoes = ["Comissão Sub20", "Comissão Sub17", "Comissão Sub15"].map(
      (chave) => layout.posicoesCartao.get(chave)!,
    );
    const italoCartao = layout.posicoesCartao.get("Comissão Sub14")!;
    // Todos os cartões ficam no mesmo nível (filhos de supervisor, que por sua vez é filho do
    // coordenador) — mesma altura pra todo mundo.
    for (const pos of gustavoCartoes) expect(pos.y).toBe(italoCartao.y);
    // O bloco de 3 cartões do Gustavo não pode invadir o espaço do cartão do Italo — é exatamente o
    // bug que a árvore com largura-por-subárvore existe pra evitar.
    const maiorXGustavo = Math.max(...gustavoCartoes.map((p) => p.x)) + LARGURA_CARTAO;
    expect(maiorXGustavo).toBeLessThanOrEqual(italoCartao.x + 0.001);
    // E os dois supervisores, por sua vez, não podem se sobrepor.
    const posGustavo = layout.posicoesLideranca.get("gustavo")!;
    const posItalo = layout.posicoesLideranca.get("italo")!;
    expect(posGustavo.x + LARGURA_CAIXA).toBeLessThanOrEqual(posItalo.x + 0.001);
  });
});

describe("ordenarItensDoCartao", () => {
  it("ordena pela lista fixa de função, ignorando a ordem de cadastro", () => {
    const itens = [
      { grupo: "Roupeiro", ordem: 0 },
      { grupo: "Treinador", ordem: 1 },
    ];
    expect(ordenarItensDoCartao(itens).map((i) => i.grupo)).toEqual(["Treinador", "Roupeiro"]);
  });

  it("função fora da lista fixa vai pro fim, desempatando por `ordem` entre desconhecidas", () => {
    const itens = [
      { grupo: "Cargo Novo", ordem: 5 },
      { grupo: "Treinador", ordem: 10 },
      { grupo: "Cargo Novo 2", ordem: 3 },
    ];
    expect(ordenarItensDoCartao(itens).map((i) => i.grupo)).toEqual(["Treinador", "Cargo Novo 2", "Cargo Novo"]);
  });

  it("duas pessoas com a mesma função desempatam por `ordem`", () => {
    const itens = [
      { grupo: "Treinador", ordem: 2 },
      { grupo: "Treinador", ordem: 1 },
    ];
    expect(ordenarItensDoCartao(itens).map((i) => i.ordem)).toEqual([1, 2]);
  });
});

describe("alturaCartao", () => {
  it("cresce um `ALTURA_ITEM_CARTAO` por item além do título e do padding", () => {
    expect(alturaCartao(1)).toBe(ALTURA_TITULO_CARTAO + PADDING_CARTAO_V * 2 + ALTURA_ITEM_CARTAO);
    expect(alturaCartao(3) - alturaCartao(2)).toBe(ALTURA_ITEM_CARTAO);
  });

  it("nunca fica menor que um cartão de 1 item, mesmo com 0 itens", () => {
    expect(alturaCartao(0)).toBe(alturaCartao(1));
  });
});

describe("cartoesConectadosDoLayout", () => {
  it("inclui só os cartões com supervisor definido, na posição de cada um", () => {
    const layout = calcularLayoutAutomatico(
      [
        no("coordenador", null, null),
        no("com-supervisor", null, "Treinador", 0, "Comissão A"),
        no("sem-supervisor", null, "Treinador", 1, "Comissão B"),
      ],
      new Map([["Comissão A", "coordenador"]]),
    );
    const conectados = cartoesConectadosDoLayout(layout);
    expect(conectados).toHaveLength(1);
    expect(conectados[0].chave).toBe("Comissão A");
    expect(conectados[0].parentId).toBe("coordenador");
    expect(conectados[0]).toMatchObject(layout.posicoesCartao.get("Comissão A")!);
  });
});

describe("contarCartoesPorPessoaVinculada", () => {
  it("conta quantos cartões distintos uma pessoa vinculada aparece", () => {
    const layout = calcularLayoutAutomatico(
      [
        no("coordenador", null, null),
        no("goleiro-sub20", null, "Treinador de Goleiro", 0, "Comissão Sub20"),
        no("goleiro-sub17", null, "Treinador de Goleiro", 1, "Comissão Sub17"),
        no("treinador-sub20", null, "Treinador", 2, "Comissão Sub20"),
      ],
      new Map([
        ["Comissão Sub20", "coordenador"],
        ["Comissão Sub17", "coordenador"],
      ]),
    );
    const comissaoIdPorNo = new Map([
      ["goleiro-sub20", "pessoa-1"],
      ["goleiro-sub17", "pessoa-1"],
      ["treinador-sub20", "pessoa-2"],
    ]);
    const contagem = contarCartoesPorPessoaVinculada(layout.cartoes, comissaoIdPorNo);
    expect(contagem.get("pessoa-1")).toBe(2);
    expect(contagem.get("pessoa-2")).toBe(1);
  });

  it("nunca conta nome digitado à mão (sem entrada no mapa de vínculo)", () => {
    const layout = calcularLayoutAutomatico(
      [no("coordenador", null, null), no("manual", null, "Treinador", 0, "Comissão X")],
      new Map([["Comissão X", "coordenador"]]),
    );
    const contagem = contarCartoesPorPessoaVinculada(layout.cartoes, new Map());
    expect(contagem.size).toBe(0);
  });
});

describe("corNomeCartao", () => {
  it("pessoa vinculada em 2+ comissões fica dourado, mesmo com nome normal", () => {
    expect(corNomeCartao("Marcelo Pap", true)).toBe("dourado");
  });

  it("nome digitado à mão contendo \"contratar\" fica vermelho", () => {
    expect(corNomeCartao("A contratar", false)).toBe("vermelho");
    expect(corNomeCartao("Contratar - Fisioterapeuta", false)).toBe("vermelho");
  });

  it("a comparação de \"contratar\" ignora maiúscula/minúscula", () => {
    expect(corNomeCartao("a CONTRATAR", false)).toBe("vermelho");
  });

  it("dourado tem prioridade sobre vermelho quando os dois parâmetros conflitam", () => {
    expect(corNomeCartao("a contratar", true)).toBe("dourado");
  });

  it("nome comum, sem vínculo duplicado, fica na cor normal", () => {
    expect(corNomeCartao("Marcelo Pap", false)).toBe("normal");
  });

  it("sem nome (null) e sem vínculo duplicado fica na cor normal", () => {
    expect(corNomeCartao(null, false)).toBe("normal");
  });
});

describe("calcularConectores", () => {
  it("põe o cotovelo numa distância fixa do pai quando o filho está bem mais longe", () => {
    const nos: OrganogramaNo[] = [no("pai", null, null), no("filho", "pai", null)];
    const posicoes = new Map<string, OrganogramaPosicao>([
      ["pai", { x: 0, y: 0 }],
      ["filho", { x: 0, y: 400 }], // bem abaixo — gap enorme entre pé do pai e topo do filho
    ]);
    const segmentos = calcularConectores(nos, posicoes);
    const tronco = segmentos.find((s) => s.key === "pai-tronco")!;
    expect(tronco.y1).toBe(ALTURA_CAIXA);
    expect(tronco.y2).toBe(ALTURA_CAIXA + GAP_BARRAMENTO);
  });

  it("não deixa o cotovelo passar do filho quando ele está bem perto do pai", () => {
    const nos: OrganogramaNo[] = [no("pai", null, null), no("filho", "pai", null)];
    const posicoes = new Map<string, OrganogramaPosicao>([
      ["pai", { x: 0, y: 0 }],
      ["filho", { x: 0, y: ALTURA_CAIXA + 6 }], // gap de só 6px — menor que GAP_BARRAMENTO
    ]);
    const segmentos = calcularConectores(nos, posicoes);
    const tronco = segmentos.find((s) => s.key === "pai-tronco")!;
    expect(tronco.y2).toBeLessThan(GAP_BARRAMENTO + ALTURA_CAIXA);
    expect(tronco.y2 - tronco.y1).toBeLessThan(GAP_BARRAMENTO);
  });

  it("gera um segmento de pé por filho-liderança, todos partindo do mesmo cotovelo", () => {
    const nos: OrganogramaNo[] = [no("pai", null, null), no("a", "pai", null, 0), no("b", "pai", null, 1)];
    const posicoes = new Map<string, OrganogramaPosicao>([
      ["pai", { x: 0, y: 0 }],
      ["a", { x: -150, y: 200 }],
      ["b", { x: 150, y: 200 }],
    ]);
    const segmentos = calcularConectores(nos, posicoes);
    const pes = segmentos.filter((s) => s.key.startsWith("pai-pe-"));
    expect(pes).toHaveLength(2);
    expect(pes[0].y1).toBe(pes[1].y1);
  });

  it("não gera segmento nenhum pra quem não tem `reportaPara`", () => {
    const nos: OrganogramaNo[] = [no("solto", null, null)];
    const posicoes = new Map<string, OrganogramaPosicao>([["solto", { x: 0, y: 0 }]]);
    expect(calcularConectores(nos, posicoes)).toEqual([]);
  });

  it("gera o conector do supervisor até um cartão passado em `cartoesConectados`", () => {
    const nos: OrganogramaNo[] = [no("supervisor", null, null)];
    const posicoesLideranca = new Map<string, OrganogramaPosicao>([["supervisor", { x: 0, y: 0 }]]);
    const segmentos = calcularConectores(nos, posicoesLideranca, [
      { chave: "Comissão Sub20", parentId: "supervisor", x: -100, y: 200 },
    ]);
    expect(segmentos.some((s) => s.key === "supervisor-tronco")).toBe(true);
    expect(segmentos.some((s) => s.key.endsWith("cartao:Comissão Sub20"))).toBe(true);
  });

  it("liderança-filho e cartão-filho do mesmo pai compartilham um único barramento", () => {
    const nos: OrganogramaNo[] = [no("supervisor", null, null), no("outra-lideranca", "supervisor", null)];
    const posicoesLideranca = new Map<string, OrganogramaPosicao>([
      ["supervisor", { x: 0, y: 0 }],
      ["outra-lideranca", { x: 300, y: 200 }],
    ]);
    const segmentos = calcularConectores(nos, posicoesLideranca, [
      { chave: "c1", parentId: "supervisor", x: -300, y: 200 },
    ]);
    const barramento = segmentos.find((s) => s.key === "supervisor-barramento")!;
    expect(barramento).toBeDefined();
    // centroX do cartão: -300 + LARGURA_CARTAO/2; centroX da liderança-filho: 300 + LARGURA_CAIXA/2.
    expect(barramento.x1).toBeCloseTo(-300 + LARGURA_CARTAO / 2);
    expect(barramento.x2).toBeCloseTo(300 + LARGURA_CAIXA / 2);
  });
});

describe("agruparLinhasPorSupervisor", () => {
  it("cada supervisor forma seu próprio grupo, ordenado por ordem mínima entre quem usa a linha", () => {
    const nos = [
      no("gustavo", null, null),
      no("italo", null, null),
      no("sub20-a", null, "Treinador", 0, "Comissão Sub20"),
      no("sub17-a", null, "Treinador", 1, "Comissão Sub17"),
      no("sub15-a", null, "Treinador", 2, "Comissão Sub15"),
      no("sub14-a", null, "Treinador", 3, "Comissão Sub14"),
      no("sub13-a", null, "Treinador", 4, "Comissão Sub13"),
    ];
    const linhaReportaPara = new Map<string, string | null>([
      ["Comissão Sub20", "gustavo"],
      ["Comissão Sub17", "gustavo"],
      ["Comissão Sub15", "gustavo"],
      ["Comissão Sub14", "italo"],
      ["Comissão Sub13", "italo"],
    ]);
    const grupos = agruparLinhasPorSupervisor(nos, linhaReportaPara);
    expect(grupos.get("gustavo")).toEqual(["Comissão Sub20", "Comissão Sub17", "Comissão Sub15"]);
    expect(grupos.get("italo")).toEqual(["Comissão Sub14", "Comissão Sub13"]);
  });

  it("linha sem supervisor (ou apontando pra alguém que não existe/não é liderança) cai no grupo `null`", () => {
    const nos = [
      no("supervisor", null, null),
      no("a", null, "Treinador", 0, "Comissão A"),
      no("b", null, "Treinador", 1, "Comissão B"),
    ];
    const linhaReportaPara = new Map<string, string | null>([
      ["Comissão A", null],
      ["Comissão B", "alguem-que-nao-existe"],
    ]);
    const grupos = agruparLinhasPorSupervisor(nos, linhaReportaPara);
    expect(grupos.get(null)).toEqual(["Comissão A", "Comissão B"]);
    expect(grupos.has("supervisor")).toBe(false);
  });

  it("uma linha de um supervisor nunca aparece misturada no grupo de outro supervisor, mesmo com `ordem` intercalada", () => {
    // `ordem` global intercalada de propósito (0,1,2,3 alternando Gustavo/Italo) — o agrupamento
    // precisa separar por supervisor antes de olhar pra `ordem`, não confiar numa lista global.
    const nos = [
      no("gustavo", null, null),
      no("italo", null, null),
      no("sub20-a", null, "Treinador", 0, "Comissão Sub20"),
      no("sub14-a", null, "Treinador", 1, "Comissão Sub14"),
      no("sub17-a", null, "Treinador", 2, "Comissão Sub17"),
      no("sub13-a", null, "Treinador", 3, "Comissão Sub13"),
    ];
    const linhaReportaPara = new Map<string, string | null>([
      ["Comissão Sub20", "gustavo"],
      ["Comissão Sub17", "gustavo"],
      ["Comissão Sub14", "italo"],
      ["Comissão Sub13", "italo"],
    ]);
    const grupos = agruparLinhasPorSupervisor(nos, linhaReportaPara);
    expect(grupos.get("gustavo")).toEqual(["Comissão Sub20", "Comissão Sub17"]);
    expect(grupos.get("italo")).toEqual(["Comissão Sub14", "Comissão Sub13"]);
  });
});
