import { describe, expect, it } from "vitest";
import {
  papeisAssinaturaFinanceiro,
  papeisAssinaturaParecer,
  papeisAssinaturaSolicitacao,
  papeisEsperados,
  podeAssinarPapel,
} from "./config";

describe("papeisEsperados", () => {
  it("Relatório de Dispensa espera treinador e departamento, nessa ordem", () => {
    const papeis = papeisEsperados("dispensa_base");
    expect(papeis.map((p) => p.papel)).toEqual(["treinador", "departamento"]);
    expect(papeis[0].rotulo).toContain("Treinador");
    expect(papeis[1].rotulo).toContain("Departamento");
  });

  it("tipo sem papéis fixos (configurável) devolve lista vazia", () => {
    expect(papeisEsperados("orcamento_jogo")).toEqual([]);
  });
});

describe("papeisAssinaturaFinanceiro", () => {
  it("monta os 2 papéis fixos com o cargo configurado como rótulo", () => {
    const papeis = papeisAssinaturaFinanceiro({
      assinatura1Cargo: "Supervisor de Futebol",
      assinatura2Cargo: "Gerente de Futebol",
    });
    expect(papeis).toEqual([
      { papel: "assinatura1", rotulo: "Supervisor de Futebol" },
      { papel: "assinatura2", rotulo: "Gerente de Futebol" },
    ]);
  });

  it("cargo vazio cai num rótulo genérico", () => {
    const papeis = papeisAssinaturaFinanceiro({ assinatura1Cargo: "", assinatura2Cargo: "" });
    expect(papeis).toEqual([
      { papel: "assinatura1", rotulo: "Assinatura 1" },
      { papel: "assinatura2", rotulo: "Assinatura 2" },
    ]);
  });
});

describe("papeisAssinaturaParecer", () => {
  it("cada linha configurada com nome vira um papel, chave = id estável da linha", () => {
    const papeis = papeisAssinaturaParecer([
      { id: "id-1", nome: "Mateus dos Santos", cargo: "Supervisor de Futebol" },
      { id: "id-2", nome: "Pedro Machado", cargo: "" },
    ]);
    expect(papeis).toEqual([
      { papel: "id-1", rotulo: "Supervisor de Futebol" },
      { papel: "id-2", rotulo: "Pedro Machado" },
    ]);
  });

  it("linha sem nome preenchido (configuração em branco) não vira papel", () => {
    const papeis = papeisAssinaturaParecer([{ id: "id-1", nome: "", cargo: "" }]);
    expect(papeis).toEqual([]);
  });
});

describe("papeisAssinaturaSolicitacao", () => {
  it("Solicitante é fixo, Encarregado usa o cargo configurado como rótulo", () => {
    const papeis = papeisAssinaturaSolicitacao({ encarregadoCargo: "Gerente Administrativo" });
    expect(papeis).toEqual([
      { papel: "solicitante", rotulo: "Solicitante" },
      { papel: "encarregado", rotulo: "Gerente Administrativo" },
    ]);
  });

  it("cargo do encarregado ainda não configurado cai num rótulo genérico", () => {
    const papeis = papeisAssinaturaSolicitacao({ encarregadoCargo: "" });
    expect(papeis[1]).toEqual({ papel: "encarregado", rotulo: "Encarregado do Departamento" });
  });
});

describe("podeAssinarPapel", () => {
  it("com usuário vinculado, só aquele usuário pode assinar", () => {
    expect(podeAssinarPapel("user-1", "user-1", false)).toBe(true);
    expect(podeAssinarPapel("user-1", "user-2", false)).toBe(false);
    expect(podeAssinarPapel("user-1", "user-2", true)).toBe(false);
  });

  it("sem usuário vinculado, qualquer master pode assinar", () => {
    expect(podeAssinarPapel(null, "user-2", true)).toBe(true);
    expect(podeAssinarPapel(undefined, "user-2", false)).toBe(false);
  });
});
