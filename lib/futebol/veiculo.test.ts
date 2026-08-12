import { describe, expect, it } from "vitest";
import {
  chavePessoa,
  descricaoVeiculo,
  formatPlaca,
  lerChavePessoa,
  normalizarPlaca,
  ordenarPorCondutor,
  placaReconhecida,
} from "./veiculo";

describe("normalizarPlaca", () => {
  it("tira hífen, espaço e acerta a caixa", () => {
    expect(normalizarPlaca("abc-1234")).toBe("ABC1234");
    expect(normalizarPlaca(" abc 1d23 ")).toBe("ABC1D23");
  });
});

describe("formatPlaca", () => {
  it("põe hífen na placa antiga", () => {
    expect(formatPlaca("abc1234")).toBe("ABC-1234");
    expect(formatPlaca("ABC-1234")).toBe("ABC-1234");
  });

  it("deixa a Mercosul sem hífen", () => {
    expect(formatPlaca("abc1d23")).toBe("ABC1D23");
  });

  it("não desfigura o que não reconhece", () => {
    expect(formatPlaca("mercosul 123")).toBe("MERCOSUL 123");
  });
});

describe("placaReconhecida", () => {
  it("aceita os dois padrões brasileiros", () => {
    expect(placaReconhecida("ABC1234")).toBe(true);
    expect(placaReconhecida("abc-1d23")).toBe(true);
  });

  it("recusa o que não bate com nenhum dos dois", () => {
    expect(placaReconhecida("AB1234")).toBe(false);
    expect(placaReconhecida("")).toBe(false);
  });
});

describe("descricaoVeiculo", () => {
  it("junta marca, modelo, cor e ano", () => {
    expect(descricaoVeiculo({ marca: "Fiat", modelo: "Argo", cor: "Prata", ano: 2021 })).toBe(
      "Fiat Argo Prata (2021)",
    );
  });

  it("não deixa espaço sobrando quando falta informação", () => {
    expect(descricaoVeiculo({ modelo: "Onix", cor: null, ano: null })).toBe("Onix");
    expect(descricaoVeiculo({ ano: 2019 })).toBe("(2019)");
    expect(descricaoVeiculo({})).toBe("—");
  });
});

describe("chavePessoa / lerChavePessoa", () => {
  it("vai e volta", () => {
    const chave = chavePessoa("comissao", "uuid-1");
    expect(chave).toBe("comissao:uuid-1");
    expect(lerChavePessoa(chave)).toEqual({ tipo: "comissao", id: "uuid-1" });
  });

  it("recusa chave inválida", () => {
    expect(lerChavePessoa("")).toBeNull();
    expect(lerChavePessoa("atleta")).toBeNull();
    expect(lerChavePessoa("diretor:uuid-1")).toBeNull();
  });
});

describe("ordenarPorCondutor", () => {
  it("ordena por nome em português (acento não vai pro fim)", () => {
    const ordenado = ordenarPorCondutor([{ nome: "Zeca" }, { nome: "Ávila" }, { nome: "Bruno" }]);
    expect(ordenado.map((v) => v.nome)).toEqual(["Ávila", "Bruno", "Zeca"]);
  });

  it("não altera o array original", () => {
    const original = [{ nome: "Zeca" }, { nome: "Ana" }];
    ordenarPorCondutor(original);
    expect(original.map((v) => v.nome)).toEqual(["Zeca", "Ana"]);
  });
});
