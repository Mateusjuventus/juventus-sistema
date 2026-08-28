import { describe, expect, it } from "vitest";
import { montarAssinaturasParecer } from "./parecer-final-document";

describe("montarAssinaturasParecer", () => {
  it("linha assinada vira o retrato de quem assinou; linha configurada mas sem assinatura vira pendente", () => {
    const resultado = montarAssinaturasParecer(
      [
        { id: "id-1", nome: "Mateus dos Santos", cargo: "Supervisor de Futebol" },
        { id: "id-2", nome: "Pedro Machado", cargo: "Gerente de Futebol" },
      ],
      [
        {
          papel: "id-1",
          nomeNoMomento: "Mateus dos Santos",
          cargoNoMomento: "Supervisor de Futebol",
          assinadoEm: "2026-08-28T10:00:00Z",
        },
      ],
    );
    expect(resultado).toEqual([
      { nome: "Mateus dos Santos", cargo: "Supervisor de Futebol", assinadoDigitalmenteEm: "2026-08-28T10:00:00Z" },
      { nome: "", cargo: "Gerente de Futebol", pendente: true },
    ]);
  });

  it("linha de configuração sem nome preenchido não aparece no resultado", () => {
    const resultado = montarAssinaturasParecer([{ id: "id-1", nome: "", cargo: "" }], []);
    expect(resultado).toEqual([]);
  });
});
