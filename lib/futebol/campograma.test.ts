import { describe, expect, it } from "vitest";
import { agruparPorPosicao, nomeCampograma, type AtletaCampograma } from "./campograma";

function atleta(overrides: Partial<AtletaCampograma>): AtletaCampograma {
  return {
    id: "1",
    nome: "João Silva",
    apelido: null,
    numeroCamisa: null,
    categoriaPosicao: null,
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

describe("agruparPorPosicao", () => {
  it("separa por categoriaPosicao, e quem não tem vai pra sem_posicao", () => {
    const grupos = agruparPorPosicao([
      atleta({ id: "1", categoriaPosicao: "goleiro" }),
      atleta({ id: "2", categoriaPosicao: "zagueiro" }),
      atleta({ id: "3", categoriaPosicao: null }),
    ]);
    expect(grupos.goleiro).toHaveLength(1);
    expect(grupos.zagueiro).toHaveLength(1);
    expect(grupos.sem_posicao).toHaveLength(1);
    expect(grupos.meia).toHaveLength(0);
  });

  it("ordena por número de camisa, sem número por último em ordem alfabética", () => {
    const grupos = agruparPorPosicao([
      atleta({ id: "1", nome: "Zeca", categoriaPosicao: "atacante", numeroCamisa: null }),
      atleta({ id: "2", nome: "Ana", categoriaPosicao: "atacante", numeroCamisa: null }),
      atleta({ id: "3", nome: "Bruno", categoriaPosicao: "atacante", numeroCamisa: 9 }),
    ]);
    expect(grupos.atacante.map((a) => a.nome)).toEqual(["Bruno", "Ana", "Zeca"]);
  });
});
