import { describe, expect, it } from "vitest";
import { montarAssinaturasSolicitacao } from "./solicitacao-document";

describe("montarAssinaturasSolicitacao", () => {
  it("mapeia cada papel salvo pro campo certo, ignorando papéis desconhecidos", () => {
    const resultado = montarAssinaturasSolicitacao([
      { papel: "solicitante", nomeNoMomento: "Ana Souza", cargoNoMomento: null, assinadoEm: "2026-08-28T09:00:00Z" },
      {
        papel: "encarregado",
        nomeNoMomento: "Pedro Machado",
        cargoNoMomento: "Gerente de Futebol",
        assinadoEm: "2026-08-28T11:00:00Z",
      },
    ]);
    expect(resultado.solicitante).toEqual({ nome: "Ana Souza", cargo: null, assinadoEm: "2026-08-28T09:00:00Z" });
    expect(resultado.encarregado).toEqual({
      nome: "Pedro Machado",
      cargo: "Gerente de Futebol",
      assinadoEm: "2026-08-28T11:00:00Z",
    });
  });

  it("nenhuma assinatura salva → os dois pendentes", () => {
    const resultado = montarAssinaturasSolicitacao([]);
    expect(resultado).toEqual({ solicitante: null, encarregado: null });
  });
});
