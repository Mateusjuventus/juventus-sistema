import { describe, expect, it } from "vitest";
import { agruparPorCategoria } from "./treinador-atletas-view";

interface ItemFake {
  id: string;
  categoria: string | null;
}

function item(id: string, categoria: string | null): ItemFake {
  return { id, categoria };
}

describe("agruparPorCategoria", () => {
  it("sem itens, nenhum grupo", () => {
    expect(agruparPorCategoria<ItemFake>([])).toEqual([]);
  });

  it("uma categoria só vira um grupo só", () => {
    const itens = [item("1", "sub13"), item("2", "sub13")];
    const grupos = agruparPorCategoria(itens);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].categoria).toBe("sub13");
    expect(grupos[0].categoriaLabel).toBe("Sub-13");
    expect(grupos[0].itens).toEqual(itens);
  });

  it("várias categorias saem na ordem fixa Sub-20 → Sub-11, não na ordem de chegada dos itens", () => {
    const itens = [item("1", "sub11"), item("2", "sub17"), item("3", "sub13")];
    const grupos = agruparPorCategoria(itens);
    expect(grupos.map((g) => g.categoria)).toEqual(["sub17", "sub13", "sub11"]);
  });

  it("categorias sem nenhum item não aparecem (nenhum cabeçalho vazio)", () => {
    const itens = [item("1", "sub20")];
    const grupos = agruparPorCategoria(itens);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].categoria).toBe("sub20");
  });

  it("item com categoria nula (não deveria chegar aqui, mas por garantia) não entra em nenhum grupo", () => {
    const itens = [item("1", null), item("2", "sub12")];
    const grupos = agruparPorCategoria(itens);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].categoria).toBe("sub12");
    expect(grupos[0].itens).toEqual([item("2", "sub12")]);
  });
});
