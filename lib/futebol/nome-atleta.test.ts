import { describe, expect, it } from "vitest";
import { nomeExibido, ordenarPorNomeExibido } from "./nome-atleta";

describe("nomeExibido", () => {
  it("prefere o apelido", () => {
    expect(nomeExibido({ apelido: "Justen", nome_completo: "Keven Justen da Silva" })).toBe("Justen");
  });

  it("cai no nome completo quando não há apelido (ou ele é só espaço)", () => {
    expect(nomeExibido({ apelido: null, nome_completo: "Bruno Alves" })).toBe("Bruno Alves");
    expect(nomeExibido({ apelido: "   ", nome_completo: "Bruno Alves" })).toBe("Bruno Alves");
  });
});

describe("ordenarPorNomeExibido", () => {
  it("ordena pelo texto que aparece, não pelo nome completo", () => {
    const lista = [
      { apelido: "Keven", nome_completo: "Keven Souza" },
      { apelido: "Justen", nome_completo: "Zeca Justen" },
      { apelido: null, nome_completo: "Bruno Alves" },
    ];
    expect(ordenarPorNomeExibido(lista).map(nomeExibido)).toEqual(["Bruno Alves", "Justen", "Keven"]);
  });

  it("respeita acento do português (não joga 'Ávila' pro fim)", () => {
    const lista = [
      { apelido: "Zeca", nome_completo: "Zeca" },
      { apelido: "Ávila", nome_completo: "Ávila" },
      { apelido: "Bruno", nome_completo: "Bruno" },
    ];
    expect(ordenarPorNomeExibido(lista).map(nomeExibido)).toEqual(["Ávila", "Bruno", "Zeca"]);
  });

  it("não altera o array original", () => {
    const original = [
      { apelido: "Zeca", nome_completo: "Zeca" },
      { apelido: "Ana", nome_completo: "Ana" },
    ];
    ordenarPorNomeExibido(original);
    expect(original.map(nomeExibido)).toEqual(["Zeca", "Ana"]);
  });
});
