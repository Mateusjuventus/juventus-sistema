import { describe, expect, it } from "vitest";
import { normalizarNomeProprio } from "./nome";

describe("normalizarNomeProprio", () => {
  it("padroniza nome totalmente em maiúsculas", () => {
    expect(normalizarNomeProprio("MATEUS DOS SANTOS PEREIRA")).toBe("Mateus dos Santos Pereira");
  });

  it("padroniza nome totalmente em minúsculas", () => {
    expect(normalizarNomeProprio("mateus dos santos pereira")).toBe("Mateus dos Santos Pereira");
  });

  it("mantém conectivos em minúsculo, exceto quando são a primeira palavra", () => {
    expect(normalizarNomeProprio("joao da silva e souza")).toBe("Joao da Silva e Souza");
    expect(normalizarNomeProprio("das neves rodrigo")).toBe("Das Neves Rodrigo");
  });

  it("capitaliza cada parte de nomes com hífen", () => {
    expect(normalizarNomeProprio("JEAN-PIERRE DA COSTA")).toBe("Jean-Pierre da Costa");
  });

  it("remove espaços duplicados e nas pontas", () => {
    expect(normalizarNomeProprio("  mateus   pereira  ")).toBe("Mateus Pereira");
  });

  it("mantém acentos", () => {
    expect(normalizarNomeProprio("JOÃO PAULO CONCEIÇÃO")).toBe("João Paulo Conceição");
  });
});
