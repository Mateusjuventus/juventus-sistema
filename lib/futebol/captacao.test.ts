import { describe, expect, it } from "vitest";
import {
  contarInscricoesPendentes,
  contarPorCategoriaEStatus,
  contarPorStatus,
  contarPorUf,
  taxaAprovacao,
} from "./captacao";

describe("contarPorStatus", () => {
  it("conta cada status, incluindo os que não aparecem (ficam em 0)", () => {
    const contagem = contarPorStatus([
      { status: "avaliacao" },
      { status: "avaliacao" },
      { status: "aprovado" },
    ]);
    expect(contagem).toEqual({ avaliacao: 2, aprovado: 1, dispensado: 0, nao_compareceu: 0 });
  });

  it("lista vazia devolve tudo zerado", () => {
    expect(contarPorStatus([])).toEqual({ avaliacao: 0, aprovado: 0, dispensado: 0, nao_compareceu: 0 });
  });

  it("ignora quem está na fila de inscrição (ainda não decidido)", () => {
    const contagem = contarPorStatus([{ status: "inscricao" }, { status: "inscricao" }, { status: "avaliacao" }]);
    expect(contagem).toEqual({ avaliacao: 1, aprovado: 0, dispensado: 0, nao_compareceu: 0 });
  });
});

describe("contarInscricoesPendentes", () => {
  it("conta só quem está com status inscricao", () => {
    const total = contarInscricoesPendentes([
      { status: "inscricao" },
      { status: "inscricao" },
      { status: "avaliacao" },
      { status: "aprovado" },
    ]);
    expect(total).toBe(2);
  });

  it("lista vazia devolve 0", () => {
    expect(contarInscricoesPendentes([])).toBe(0);
  });
});

describe("contarPorCategoriaEStatus", () => {
  it("agrupa por categoria e status, com as 7 categorias sempre presentes", () => {
    const contagem = contarPorCategoriaEStatus([
      { status: "avaliacao", categoria: "sub17" },
      { status: "avaliacao", categoria: "sub17" },
      { status: "aprovado", categoria: "sub17" },
      { status: "dispensado", categoria: "sub11" },
    ]);
    expect(contagem.sub17).toEqual({ avaliacao: 2, aprovado: 1, dispensado: 0, nao_compareceu: 0 });
    expect(contagem.sub11).toEqual({ avaliacao: 0, aprovado: 0, dispensado: 1, nao_compareceu: 0 });
    expect(contagem.sub20).toEqual({ avaliacao: 0, aprovado: 0, dispensado: 0, nao_compareceu: 0 });
  });

  it("ignora quem não tem categoria preenchida e quem ainda está na fila de inscrição", () => {
    const contagem = contarPorCategoriaEStatus([
      { status: "avaliacao", categoria: null },
      { status: "inscricao", categoria: "sub15" },
      { status: "aprovado", categoria: "sub15" },
    ]);
    expect(contagem.sub15).toEqual({ avaliacao: 0, aprovado: 1, dispensado: 0, nao_compareceu: 0 });
  });

  it("lista vazia devolve tudo zerado nas 7 categorias", () => {
    const contagem = contarPorCategoriaEStatus([]);
    expect(Object.keys(contagem)).toHaveLength(7);
    expect(contagem.sub20).toEqual({ avaliacao: 0, aprovado: 0, dispensado: 0, nao_compareceu: 0 });
  });
});

describe("contarPorUf", () => {
  it("agrupa por UF e ignora quem não tem UF preenchida", () => {
    const contagem = contarPorUf([{ uf: "SP" }, { uf: "sp" }, { uf: "RJ" }, { uf: null }, { uf: "" }]);
    expect(contagem).toEqual({ SP: 2, RJ: 1 });
  });
});

describe("taxaAprovacao", () => {
  it("ignora quem ainda está em avaliação", () => {
    const taxa = taxaAprovacao({ avaliacao: 10, aprovado: 3, dispensado: 1, nao_compareceu: 0 });
    expect(taxa).toBe(75); // 3 de 4 decididos
  });

  it("devolve null quando ninguém foi decidido ainda (evita divisão por zero)", () => {
    expect(taxaAprovacao({ avaliacao: 5, aprovado: 0, dispensado: 0, nao_compareceu: 0 })).toBeNull();
  });
});
