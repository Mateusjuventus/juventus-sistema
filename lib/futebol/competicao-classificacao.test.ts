import { describe, expect, it } from "vitest";
import {
  calcularClassificacao,
  jogoJuventusParaResultado,
  jogosAJogar,
  resolverEquipes,
} from "./competicao-classificacao";

describe("calcularClassificacao", () => {
  it("soma pontos, gols e ordena por pontos/vitórias/saldo/gols pró", () => {
    const tabela = calcularClassificacao(
      ["Juventus", "Osasco Sporting", "Paulista", "Primavera"],
      [
        { casa: "Juventus", fora: "Osasco Sporting", golsCasa: 2, golsFora: 1 },
        { casa: "Primavera", fora: "Juventus", golsCasa: 0, golsFora: 0 },
        { casa: "Paulista", fora: "Primavera", golsCasa: 3, golsFora: 1 },
      ],
    );

    expect(tabela.map((l) => l.equipe)).toEqual(["Juventus", "Paulista", "Primavera", "Osasco Sporting"]);
    expect(tabela[0]).toMatchObject({ pontos: 4, jogos: 2, vitorias: 1, empates: 1, derrotas: 0, saldo: 1 });
    expect(tabela[1]).toMatchObject({ pontos: 3, saldo: 2 });
    expect(tabela[2]).toMatchObject({ equipe: "Primavera", pontos: 1, saldo: -2 });
    expect(tabela[3]).toMatchObject({ equipe: "Osasco Sporting", pontos: 0, saldo: -1 });
  });

  it("desempata por pontos antes de qualquer outra coisa", () => {
    const tabela = calcularClassificacao(
      ["A", "B"],
      [
        { casa: "A", fora: "B", golsCasa: 0, golsFora: 1 },
      ],
    );
    expect(tabela.map((l) => l.equipe)).toEqual(["B", "A"]);
  });

  it("resultado com equipe desconhecida ainda conta pro lado conhecido", () => {
    const tabela = calcularClassificacao(
      ["Juventus"],
      [{ casa: "Juventus", fora: "Time Fantasma", golsCasa: 1, golsFora: 0 }],
    );
    expect(tabela).toHaveLength(1);
    expect(tabela[0]).toMatchObject({ equipe: "Juventus", pontos: 3, jogos: 1 });
  });

  it("compara nomes sem diferenciar maiúsculas/espaços", () => {
    const tabela = calcularClassificacao(
      ["Osasco Sporting"],
      [{ casa: " osasco sporting ", fora: "X", golsCasa: 2, golsFora: 0 }],
    );
    expect(tabela[0]).toMatchObject({ pontos: 3 });
  });
});

describe("jogoJuventusParaResultado", () => {
  it("mapeia mandante/visitante pro lado certo do placar", () => {
    expect(
      jogoJuventusParaResultado({ adversario_nome: "Osasco", mandante: true, gols_pro: 2, gols_contra: 1 }),
    ).toMatchObject({ casa: "Juventus", fora: "Osasco", golsCasa: 2, golsFora: 1 });
    expect(
      jogoJuventusParaResultado({ adversario_nome: "Osasco", mandante: false, gols_pro: 2, gols_contra: 1 }),
    ).toMatchObject({ casa: "Osasco", fora: "Juventus", golsCasa: 1, golsFora: 2 });
  });

  it("devolve null enquanto o placar não foi preenchido", () => {
    expect(
      jogoJuventusParaResultado({ adversario_nome: "Osasco", mandante: true, gols_pro: null, gols_contra: null }),
    ).toBeNull();
  });
});

describe("resolverEquipes", () => {
  it("resolve vaga projetada pela classificação atual do grupo de origem", () => {
    const resolvidas = resolverEquipes(
      [
        { nome: "Portuguesa", origemGrupoId: null, origemPosicao: null },
        { nome: null, origemGrupoId: "g3", origemPosicao: 1 },
        { nome: null, origemGrupoId: "g3", origemPosicao: 9 },
      ],
      new Map([["g3", "Grupo 3"]]),
      new Map([
        [
          "g3",
          [
            {
              equipe: "Juventus",
              pontos: 4,
              jogos: 2,
              vitorias: 1,
              empates: 1,
              derrotas: 0,
              golsPro: 2,
              golsContra: 1,
              saldo: 1,
              cartoesAmarelos: 3,
              cartoesVermelhos: 0,
            },
          ],
        ],
      ]),
    );

    expect(resolvidas[0]).toEqual({ rotulo: "Portuguesa", projecao: null });
    expect(resolvidas[1]).toEqual({ rotulo: "1º do Grupo 3", projecao: "Juventus" });
    expect(resolvidas[2]).toEqual({ rotulo: "9º do Grupo 3", projecao: null });
  });
});

describe("disciplina por equipe (colunas CA/CV) e jogos a jogar", () => {
  it("soma cartões de cada lado nas linhas da tabela", () => {
    const tabela = calcularClassificacao(
      ["Juventus", "Osasco Sporting"],
      [
        {
          casa: "Juventus",
          fora: "Osasco Sporting",
          golsCasa: 2,
          golsFora: 1,
          cartoesAmarelosCasa: 3,
          cartoesAmarelosFora: 5,
          cartoesVermelhosCasa: 0,
          cartoesVermelhosFora: 1,
        },
      ],
    );
    expect(tabela[0]).toMatchObject({ equipe: "Juventus", cartoesAmarelos: 3, cartoesVermelhos: 0 });
    expect(tabela[1]).toMatchObject({ equipe: "Osasco Sporting", cartoesAmarelos: 5, cartoesVermelhos: 1 });
  });

  it("resultado sem cartões informados conta zero", () => {
    const tabela = calcularClassificacao(
      ["A"],
      [{ casa: "A", fora: "B", golsCasa: 1, golsFora: 0 }],
    );
    expect(tabela[0]).toMatchObject({ cartoesAmarelos: 0, cartoesVermelhos: 0 });
  });

  it("jogo do Juventus carrega os cartões dos dois lados pro lado certo", () => {
    const resultado = jogoJuventusParaResultado(
      { adversario_nome: "Primavera", mandante: false, gols_pro: 1, gols_contra: 1 },
      { amarelos: 2, vermelhos: 1 },
      { amarelos: 4, vermelhos: 0 },
    );
    expect(resultado).toMatchObject({
      casa: "Primavera",
      fora: "Juventus",
      cartoesAmarelosCasa: 4,
      cartoesVermelhosCasa: 0,
      cartoesAmarelosFora: 2,
      cartoesVermelhosFora: 1,
    });
  });

  it("jogosAJogar assume turno único no grupo", () => {
    expect(jogosAJogar(4, 3)).toBe(0);
    expect(jogosAJogar(4, 1)).toBe(2);
    expect(jogosAJogar(4, 5)).toBe(0);
  });
});
