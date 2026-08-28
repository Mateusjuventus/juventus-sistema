import { describe, expect, it } from "vitest";
import { montarAssinaturasFinanceiroComDigital } from "./assinaturas";

describe("montarAssinaturasFinanceiroComDigital", () => {
  const base = {
    assinatura1: { nome: "Mateus dos Santos", cargo: "Supervisor de Futebol" },
    assinatura2: { nome: "Pedro Machado", cargo: "Gerente de Futebol" },
  };

  it("assinatura salva vira o retrato de quem assinou, não o nome configurado", () => {
    const resultado = montarAssinaturasFinanceiroComDigital(base, [
      {
        papel: "assinatura1",
        usuarioId: "u1",
        nomeNoMomento: "Mateus dos Santos",
        cargoNoMomento: "Supervisor de Futebol",
        assinadoEm: "2026-08-28T10:00:00Z",
      },
    ]);
    expect(resultado.assinatura1).toEqual({
      nome: "Mateus dos Santos",
      cargo: "Supervisor de Futebol",
      assinadoDigitalmenteEm: "2026-08-28T10:00:00Z",
    });
    expect(resultado.assinatura2).toEqual({ nome: "", cargo: "Gerente de Futebol", pendente: true });
  });

  it("nenhuma assinatura salva → os dois pendentes, com o cargo configurado como rótulo", () => {
    const resultado = montarAssinaturasFinanceiroComDigital(base, []);
    expect(resultado).toEqual({
      assinatura1: { nome: "", cargo: "Supervisor de Futebol", pendente: true },
      assinatura2: { nome: "", cargo: "Gerente de Futebol", pendente: true },
    });
  });
});
