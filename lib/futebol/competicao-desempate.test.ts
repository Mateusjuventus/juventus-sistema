import { describe, expect, it } from "vitest";
import type { LinhaClassificacao } from "./competicao-classificacao";
import {
  CRITERIOS_PADRAO,
  equipesIndefinidas,
  normalizarCriterios,
  ordenarClassificacao,
  type CriterioDesempate,
} from "./competicao-desempate";

function linha(equipe: string, dados: Partial<LinhaClassificacao> = {}): LinhaClassificacao {
  return {
    equipe,
    pontos: 0,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    golsPro: 0,
    golsContra: 0,
    saldo: 0,
    cartoesAmarelos: 0,
    cartoesVermelhos: 0,
    ...dados,
  };
}

describe("normalizarCriterios", () => {
  it("descarta chave desconhecida e repetida", () => {
    expect(normalizarCriterios(["vitorias", "inventado", "vitorias", "saldo"])).toEqual(["vitorias", "saldo"]);
  });

  it("cai no padrão do Art. 17 quando a lista fica vazia", () => {
    expect(normalizarCriterios([])).toEqual(CRITERIOS_PADRAO);
    expect(normalizarCriterios(null)).toEqual(CRITERIOS_PADRAO);
  });
});

describe("ordenarClassificacao — Art. 17 da Copa Paulista", () => {
  it("pontos vêm sempre antes de qualquer critério", () => {
    const tabela = ordenarClassificacao(
      [linha("A", { pontos: 3, vitorias: 1 }), linha("B", { pontos: 5, vitorias: 1 })],
      CRITERIOS_PADRAO,
    );
    expect(tabela.map((l) => l.equipe)).toEqual(["B", "A"]);
  });

  it("a) desempata por vitórias", () => {
    const tabela = ordenarClassificacao(
      [
        linha("Empatador", { pontos: 5, vitorias: 1, empates: 2, saldo: 9 }),
        linha("Vencedor", { pontos: 5, vitorias: 1, empates: 2, saldo: 9 }),
        linha("Maior", { pontos: 5, vitorias: 2, saldo: 0 }),
      ],
      CRITERIOS_PADRAO,
    );
    expect(tabela[0].equipe).toBe("Maior");
  });

  it("b) e c) saldo e depois gols marcados", () => {
    const tabela = ordenarClassificacao(
      [
        linha("Saldo menor", { pontos: 4, vitorias: 1, saldo: 1, golsPro: 9 }),
        linha("Saldo maior", { pontos: 4, vitorias: 1, saldo: 3, golsPro: 3 }),
      ],
      CRITERIOS_PADRAO,
    );
    expect(tabela[0].equipe).toBe("Saldo maior");

    const porGols = ordenarClassificacao(
      [
        linha("Menos gols", { pontos: 4, vitorias: 1, saldo: 2, golsPro: 4 }),
        linha("Mais gols", { pontos: 4, vitorias: 1, saldo: 2, golsPro: 7 }),
      ],
      CRITERIOS_PADRAO,
    );
    expect(porGols[0].equipe).toBe("Mais gols");
  });

  it("d) e e) menos vermelhos e depois menos amarelos", () => {
    const base = { pontos: 4, vitorias: 1, saldo: 2, golsPro: 5 };
    const porVermelhos = ordenarClassificacao(
      [
        linha("Mais vermelhos", { ...base, cartoesVermelhos: 2, cartoesAmarelos: 1 }),
        linha("Menos vermelhos", { ...base, cartoesVermelhos: 0, cartoesAmarelos: 9 }),
      ],
      CRITERIOS_PADRAO,
    );
    expect(porVermelhos[0].equipe).toBe("Menos vermelhos");

    const porAmarelos = ordenarClassificacao(
      [
        linha("Mais amarelos", { ...base, cartoesAmarelos: 7 }),
        linha("Menos amarelos", { ...base, cartoesAmarelos: 5 }),
      ],
      CRITERIOS_PADRAO,
    );
    expect(porAmarelos[0].equipe).toBe("Menos amarelos");
  });

  it("§1º — fase de mata-mata usa só os critérios até a alínea b", () => {
    const soAteB: CriterioDesempate[] = ["vitorias", "saldo"];
    // Aqui "Mais gols" ganharia pelo critério c), que NÃO se aplica nesta fase — então a ordem
    // cai no criério estável (nome), sinalizando que a decisão é fora do sistema (pênaltis).
    const tabela = ordenarClassificacao(
      [
        linha("Zebra", { pontos: 4, vitorias: 1, saldo: 2, golsPro: 9 }),
        linha("Alvo", { pontos: 4, vitorias: 1, saldo: 2, golsPro: 2 }),
      ],
      soAteB,
    );
    expect(tabela.map((l) => l.equipe)).toEqual(["Alvo", "Zebra"]);
  });

  it("confronto direto usa só os jogos entre as equipes empatadas", () => {
    const tabela = ordenarClassificacao(
      [
        linha("A", { pontos: 4, vitorias: 1, saldo: 0 }),
        linha("B", { pontos: 4, vitorias: 1, saldo: 0 }),
      ],
      ["confronto_direto", "saldo"],
      [
        { casa: "B", fora: "A", golsCasa: 2, golsFora: 0 },
        { casa: "A", fora: "Outro", golsCasa: 5, golsFora: 0 },
      ],
    );
    expect(tabela[0].equipe).toBe("B");
  });

  it("ordem configurada muda o resultado (competição com regulamento diferente)", () => {
    const equipes = [
      linha("Disciplinado", { pontos: 4, vitorias: 1, saldo: 0, cartoesAmarelos: 1 }),
      linha("Goleador", { pontos: 4, vitorias: 1, saldo: 5, cartoesAmarelos: 9 }),
    ];
    expect(ordenarClassificacao(equipes, ["saldo", "menos_amarelos"])[0].equipe).toBe("Goleador");
    expect(ordenarClassificacao(equipes, ["menos_amarelos", "saldo"])[0].equipe).toBe("Disciplinado");
  });
});

describe("equipesIndefinidas", () => {
  it("marca quem empatou em tudo que os critérios decidem (vai a sorteio)", () => {
    const iguais = [
      linha("A", { pontos: 4, vitorias: 1, saldo: 1, golsPro: 3 }),
      linha("B", { pontos: 4, vitorias: 1, saldo: 1, golsPro: 3 }),
      linha("C", { pontos: 9, vitorias: 3 }),
    ];
    const indefinidas = equipesIndefinidas(iguais, CRITERIOS_PADRAO);
    expect(indefinidas.has("A")).toBe(true);
    expect(indefinidas.has("B")).toBe(true);
    expect(indefinidas.has("C")).toBe(false);
  });

  it("não marca quando algum critério separa", () => {
    const indefinidas = equipesIndefinidas(
      [
        linha("A", { pontos: 4, vitorias: 1, saldo: 2 }),
        linha("B", { pontos: 4, vitorias: 1, saldo: 1 }),
      ],
      CRITERIOS_PADRAO,
    );
    expect(indefinidas.size).toBe(0);
  });
});
