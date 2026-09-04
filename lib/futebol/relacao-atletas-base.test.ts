import { describe, expect, it } from "vitest";
import {
  agruparAtletasPorCategoria,
  categoriasParaFiltro,
  composicaoEscopoCategorias,
  statusParaFiltro,
  TODOS_STATUS_ATLETA_BASE,
} from "./relacao-atletas-base";
import { TODAS_CATEGORIAS_BASE } from "@/lib/auth/categorias-base";

describe("statusParaFiltro", () => {
  it("retorna os status marcados quando há pelo menos um", () => {
    expect(statusParaFiltro(["liberado"])).toEqual(["liberado"]);
    expect(statusParaFiltro(["liberado", "suspenso"])).toEqual(["liberado", "suspenso"]);
  });

  it("cai pra todos os status quando nenhum foi marcado", () => {
    expect(statusParaFiltro([])).toEqual(TODOS_STATUS_ATLETA_BASE);
  });
});

describe("categoriasParaFiltro", () => {
  it("retorna as categorias marcadas quando há pelo menos uma", () => {
    expect(categoriasParaFiltro(["sub20"])).toEqual(["sub20"]);
    expect(categoriasParaFiltro(["sub20", "sub11"])).toEqual(["sub20", "sub11"]);
  });

  it("cai pra todas as categorias quando nenhuma foi marcada", () => {
    expect(categoriasParaFiltro([])).toEqual(TODAS_CATEGORIAS_BASE);
  });
});

describe("composicaoEscopoCategorias", () => {
  it("compõe a lista das categorias selecionadas, na ordem canônica", () => {
    expect(composicaoEscopoCategorias(["sub11", "sub20"])).toBe("Sub-20, Sub-11");
    expect(composicaoEscopoCategorias(["sub17"])).toBe("Sub-17");
    expect(composicaoEscopoCategorias(["sub20", "sub17", "sub15", "sub14"])).toBe("Sub-20, Sub-17, Sub-15, Sub-14");
  });

  it("vira 'Todas as Categorias' quando as 7 estão selecionadas", () => {
    expect(composicaoEscopoCategorias(TODAS_CATEGORIAS_BASE)).toBe("Todas as Categorias");
  });
});

describe("agruparAtletasPorCategoria", () => {
  const atletas = [
    { id: "1", categoria: "sub20" as const, nome: "A" },
    { id: "2", categoria: "sub20" as const, nome: "B" },
    { id: "3", categoria: "sub11" as const, nome: "C" },
  ];

  it("agrupa em todas as 7 categorias, na ordem canônica, quando todas estão selecionadas", () => {
    const grupos = agruparAtletasPorCategoria(atletas, TODAS_CATEGORIAS_BASE);
    expect(grupos.map((g) => g.categoria)).toEqual(["sub20", "sub17", "sub15", "sub14", "sub13", "sub12", "sub11"]);
    expect(grupos.find((g) => g.categoria === "sub20")?.atletas).toHaveLength(2);
    expect(grupos.find((g) => g.categoria === "sub11")?.atletas).toHaveLength(1);
  });

  it("categoria selecionada sem nenhum atleta ainda aparece, vazia", () => {
    const grupos = agruparAtletasPorCategoria(atletas, TODAS_CATEGORIAS_BASE);
    const sub17 = grupos.find((g) => g.categoria === "sub17");
    expect(sub17?.atletas).toEqual([]);
    expect(sub17?.categoriaLabel).toBe("Sub-17");
  });

  it("retorna só um grupo quando só uma categoria foi selecionada", () => {
    const grupos = agruparAtletasPorCategoria(atletas, ["sub20"]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].categoria).toBe("sub20");
    expect(grupos[0].atletas).toHaveLength(2);
  });

  it("categoria específica sem atleta nenhum retorna um grupo vazio, não uma lista vazia de grupos", () => {
    const grupos = agruparAtletasPorCategoria(atletas, ["sub14"]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].atletas).toEqual([]);
  });

  it("categorias não selecionadas não aparecem no resultado, mesmo sem nenhum atleta em comum", () => {
    const grupos = agruparAtletasPorCategoria(atletas, ["sub20", "sub11"]);
    expect(grupos.map((g) => g.categoria)).toEqual(["sub20", "sub11"]);
  });

  it("mantém a ordem canônica independente da ordem em que as categorias foram selecionadas", () => {
    const grupos = agruparAtletasPorCategoria(atletas, ["sub11", "sub20"]);
    expect(grupos.map((g) => g.categoria)).toEqual(["sub20", "sub11"]);
  });
});
