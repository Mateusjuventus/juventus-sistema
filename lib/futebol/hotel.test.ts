import { describe, expect, it } from "vitest";
import { cidadeUf, enderecoCompleto, estruturaDoHotel, formatDiaria } from "./hotel";

describe("enderecoCompleto", () => {
  it("monta o endereço inteiro no formato de documento", () => {
    expect(
      enderecoCompleto({
        logradouro: "Rua Javari",
        numero: "117",
        bairro: "Mooca",
        cidade: "São Paulo",
        uf: "SP",
        cep: "03112-100",
      }),
    ).toBe("Rua Javari, 117, Mooca, São Paulo/SP, CEP 03112-100");
  });

  it("inclui o complemento depois do número", () => {
    expect(
      enderecoCompleto({ logradouro: "Av. Brasil", numero: "500", complemento: "Torre B", cidade: "Santos", uf: "SP" }),
    ).toBe("Av. Brasil, 500 — Torre B, Santos/SP");
  });

  it("não deixa vírgula solta quando falta parte do endereço", () => {
    expect(enderecoCompleto({ cidade: "Campinas", uf: "sp" })).toBe("Campinas/SP");
    expect(enderecoCompleto({})).toBe("");
    expect(enderecoCompleto({ logradouro: "  ", cidade: null, uf: undefined })).toBe("");
  });
});

describe("cidadeUf", () => {
  it("junta cidade e UF em maiúsculas", () => {
    expect(cidadeUf({ cidade: "Ribeirão Preto", uf: "sp" })).toBe("Ribeirão Preto/SP");
  });

  it("aceita ter só um dos dois", () => {
    expect(cidadeUf({ cidade: "Bauru", uf: null })).toBe("Bauru");
    expect(cidadeUf({ cidade: null, uf: "MG" })).toBe("MG");
    expect(cidadeUf({ cidade: null, uf: null })).toBe("");
  });
});

describe("estruturaDoHotel", () => {
  it("lista só o que o hotel tem", () => {
    expect(
      estruturaDoHotel({ cafe_incluso: true, estacionamento_onibus: false, sala_refeicao_grupo: true }),
    ).toEqual(["Café da manhã incluso", "Sala para refeição/preleção do grupo"]);
  });

  it("volta vazio quando não tem nada marcado", () => {
    expect(
      estruturaDoHotel({ cafe_incluso: false, estacionamento_onibus: false, sala_refeicao_grupo: false }),
    ).toEqual([]);
  });
});

describe("formatDiaria", () => {
  it("mostra traço quando não há valor de referência", () => {
    expect(formatDiaria(null)).toBe("—");
  });

  it("formata em real", () => {
    expect(formatDiaria(280).replace(/ /g, " ")).toBe("R$ 280,00");
  });
});
