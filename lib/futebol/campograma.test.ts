import { describe, expect, it } from "vitest";
import {
  agruparPorPosicaoEspecifica,
  calcularPontoAngular,
  calcularPontosRadar,
  contarPorPosicaoCampograma,
  nomeCampograma,
  ORDEM_POSICOES_CAMPOGRAMA,
  seloContratoAtleta,
  type AtletaCampograma,
} from "./campograma";

function atleta(overrides: Partial<AtletaCampograma>): AtletaCampograma {
  return {
    id: "1",
    nome: "João Silva",
    apelido: null,
    posicao: null,
    fotoUrl: null,
    classificacao: null,
    tipoContrato: null,
    dataNascimento: null,
    ...overrides,
  };
}

describe("nomeCampograma", () => {
  it("usa o apelido quando existe", () => {
    expect(nomeCampograma({ nome: "João Silva", apelido: "Joãozinho" })).toBe("Joãozinho");
  });

  it("cai pro primeiro nome sem apelido", () => {
    expect(nomeCampograma({ nome: "João Silva", apelido: null })).toBe("João");
  });

  it("apelido só com espaços conta como vazio", () => {
    expect(nomeCampograma({ nome: "João Silva", apelido: "   " })).toBe("João");
  });
});

describe("agruparPorPosicaoEspecifica", () => {
  it("separa por posição específica, e quem não tem (ou tem posição inválida) vai pra sem_posicao", () => {
    const grupos = agruparPorPosicaoEspecifica([
      atleta({ id: "1", posicao: "Goleiro" }),
      atleta({ id: "2", posicao: "Zagueiro" }),
      atleta({ id: "3", posicao: null }),
      atleta({ id: "4", posicao: "Ala" }),
    ]);
    expect(grupos.Goleiro).toHaveLength(1);
    expect(grupos.Zagueiro).toHaveLength(1);
    expect(grupos.sem_posicao).toHaveLength(2);
    expect(grupos.Meia).toHaveLength(0);
  });

  it("não agrupa mais Volante com Meia, nem as duas Pontas com Atacante — cada uma é sua própria linha", () => {
    const grupos = agruparPorPosicaoEspecifica([
      atleta({ id: "1", posicao: "Volante" }),
      atleta({ id: "2", posicao: "Ponta Direita" }),
      atleta({ id: "3", posicao: "Ponta Esquerda" }),
    ]);
    expect(grupos.Volante).toHaveLength(1);
    expect(grupos.Meia).toHaveLength(0);
    expect(grupos["Ponta Direita"]).toHaveLength(1);
    expect(grupos["Ponta Esquerda"]).toHaveLength(1);
    expect(grupos.Atacante).toHaveLength(0);
  });

  it("ordena cada grupo por nome", () => {
    const grupos = agruparPorPosicaoEspecifica([
      atleta({ id: "1", nome: "Zeca", posicao: "Atacante" }),
      atleta({ id: "2", nome: "Ana", posicao: "Atacante" }),
      atleta({ id: "3", nome: "Bruno", posicao: "Atacante" }),
    ]);
    expect(grupos.Atacante.map((a) => a.nome)).toEqual(["Ana", "Bruno", "Zeca"]);
  });
});

describe("seloContratoAtleta", () => {
  it("definitivo e emprestimo viram P", () => {
    expect(seloContratoAtleta("definitivo")).toBe("P");
    expect(seloContratoAtleta("emprestimo")).toBe("P");
  });

  it("amador e iniciacao viram F", () => {
    expect(seloContratoAtleta("amador")).toBe("F");
    expect(seloContratoAtleta("iniciacao")).toBe("F");
  });

  it("sem tipo de contrato não mostra selo", () => {
    expect(seloContratoAtleta(null)).toBeNull();
    expect(seloContratoAtleta(undefined)).toBeNull();
    expect(seloContratoAtleta("")).toBeNull();
  });
});

describe("contarPorPosicaoCampograma", () => {
  it("devolve uma contagem por posição, na ordem de exibição das linhas", () => {
    const grupos = agruparPorPosicaoEspecifica([
      atleta({ id: "1", posicao: "Goleiro" }),
      atleta({ id: "2", posicao: "Zagueiro" }),
      atleta({ id: "3", posicao: "Zagueiro" }),
    ]);
    const contagens = contarPorPosicaoCampograma(grupos);
    expect(contagens.map((c) => c.posicao)).toEqual(ORDEM_POSICOES_CAMPOGRAMA);
    expect(contagens.find((c) => c.posicao === "Zagueiro")?.quantidade).toBe(2);
    expect(contagens.find((c) => c.posicao === "Goleiro")?.quantidade).toBe(1);
    expect(contagens.find((c) => c.posicao === "Meia")?.quantidade).toBe(0);
  });
});

describe("calcularPontoAngular", () => {
  it("o primeiro eixo (índice 0) aponta pra cima (12h)", () => {
    const p = calcularPontoAngular(0, 4, { x: 100, y: 100 }, 50);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(50);
  });

  it("com 4 eixos, o segundo (índice 1) aponta pra a direita (3h)", () => {
    const p = calcularPontoAngular(1, 4, { x: 100, y: 100 }, 50);
    expect(p.x).toBeCloseTo(150);
    expect(p.y).toBeCloseTo(100);
  });
});

describe("calcularPontosRadar", () => {
  it("a posição com mais atletas fica no raio máximo, as demais proporcionais", () => {
    const contagens = [
      { posicao: "Atacante" as const, quantidade: 2 },
      { posicao: "Goleiro" as const, quantidade: 4 },
    ];
    const pontos = calcularPontosRadar(contagens, { x: 0, y: 0 }, 100);
    // Atacante (índice 0, aponta pra cima): fator 2/4 = 0.5 do raio.
    expect(pontos[0].y).toBeCloseTo(-50);
    // Goleiro (índice 1, com 2 eixos aponta pra baixo): fator 4/4 = 1 do raio.
    expect(pontos[1].y).toBeCloseTo(100);
  });

  it("elenco vazio (todas as contagens zeradas) não gera NaN — todos os pontos ficam no centro", () => {
    const contagens = ORDEM_POSICOES_CAMPOGRAMA.map((posicao) => ({ posicao, quantidade: 0 }));
    const pontos = calcularPontosRadar(contagens, { x: 10, y: 10 }, 100);
    for (const p of pontos) {
      expect(p.x).toBeCloseTo(10);
      expect(p.y).toBeCloseTo(10);
    }
  });
});
