import { describe, expect, it } from "vitest";
import { corAvatar, iniciaisNome } from "./avatar-cor";

describe("iniciaisNome", () => {
  it("usa primeira letra do primeiro e do último nome", () => {
    expect(iniciaisNome("Lucas Andrade Silva")).toBe("LS");
    expect(iniciaisNome("Gabriel Souza Lima")).toBe("GL");
  });

  it("usa as duas primeiras letras quando só há um nome", () => {
    expect(iniciaisNome("Ronaldinho")).toBe("RO");
  });

  it("ignora espaços extras", () => {
    expect(iniciaisNome("  Ana   Paula  ")).toBe("AP");
  });

  it("não quebra com string vazia", () => {
    expect(iniciaisNome("")).toBe("?");
  });
});

describe("corAvatar", () => {
  it("é determinística — mesmo nome sempre cai na mesma cor", () => {
    const nome = "Thiago Moreira Coelho";
    expect(corAvatar(nome)).toEqual(corAvatar(nome));
  });

  it("nomes diferentes tendem a cair em cores diferentes", () => {
    const cores = new Set(
      ["Lucas Andrade Silva", "Rafael Oliveira Santos", "Davi Martins Cardoso", "Arthur Gonçalves"].map(
        (nome) => corAvatar(nome).bg,
      ),
    );
    expect(cores.size).toBeGreaterThan(1);
  });
});
