import { describe, expect, it } from "vitest";
import { CLUBES, resolverClube } from "./index";

describe("resolverClube", () => {
  it("cai no Juventus quando a variável não existe", () => {
    expect(resolverClube(undefined).id).toBe("juventus");
    expect(resolverClube("").id).toBe("juventus");
  });
  it("aceita o id em qualquer caixa", () => {
    expect(resolverClube("Maringa").id).toBe("maringa");
  });
  it("recusa clube não configurado", () => {
    expect(() => resolverClube("palmeiras")).toThrow(/não é um clube configurado/);
  });
});

describe("configuração dos clubes", () => {
  it("todo clube tem os mesmos tokens de cor", () => {
    const chaves = Object.keys(CLUBES.juventus.cores).sort();
    for (const c of Object.values(CLUBES)) expect(Object.keys(c.cores).sort()).toEqual(chaves);
  });
  it("cores em hex de 6 dígitos", () => {
    for (const c of Object.values(CLUBES))
      for (const v of Object.values(c.cores)) expect(v).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
