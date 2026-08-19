import { describe, expect, it } from "vitest";
import { contarPorStatus, contarPorUf, taxaAprovacao } from "./captacao";

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
