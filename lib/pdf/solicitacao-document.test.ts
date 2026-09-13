import { describe, expect, it } from "vitest";
import { montarAssinaturasSolicitacao } from "./solicitacao-document";

describe("montarAssinaturasSolicitacao", () => {
  it("mapeia cada papel salvo pro campo certo, ignorando papéis desconhecidos", () => {
    const resultado = montarAssinaturasSolicitacao(
      [
        {
          papel: "solicitante",
          nomeNoMomento: "Ana Souza",
          cargoNoMomento: null,
          assinadoEm: "2026-08-28T09:00:00Z",
          assinaturaImagemSrc: null,
        },
        {
          papel: "encarregado",
          nomeNoMomento: "Pedro Machado",
          cargoNoMomento: "Gerente de Futebol",
          assinadoEm: "2026-08-28T11:00:00Z",
          assinaturaImagemSrc: "https://example.com/assinatura-pedro.png",
        },
        {
          papel: "compras",
          nomeNoMomento: "Carla Dias",
          cargoNoMomento: "Departamento de Compras",
          assinadoEm: "2026-08-28T12:00:00Z",
          assinaturaImagemSrc: "https://example.com/assinatura-carla.png",
        },
        {
          papel: "aprovador",
          nomeNoMomento: "Mateus Pereira",
          cargoNoMomento: "Supervisor de Futebol",
          assinadoEm: "2026-08-28T13:00:00Z",
          assinaturaImagemSrc: "https://example.com/assinatura-mateus.png",
        },
      ],
      "compras",
    );
    expect(resultado.solicitante).toEqual({
      nome: "Ana Souza",
      cargo: null,
      assinadoEm: "2026-08-28T09:00:00Z",
      assinaturaImagemSrc: null,
    });
    expect(resultado.encarregado).toEqual({
      nome: "Pedro Machado",
      cargo: "Gerente de Futebol",
      assinadoEm: "2026-08-28T11:00:00Z",
      assinaturaImagemSrc: "https://example.com/assinatura-pedro.png",
    });
    expect(resultado.departamento).toEqual({
      nome: "Carla Dias",
      cargo: "Departamento de Compras",
      assinadoEm: "2026-08-28T12:00:00Z",
      assinaturaImagemSrc: "https://example.com/assinatura-carla.png",
    });
    expect(resultado.aprovador).toEqual({
      nome: "Mateus Pereira",
      cargo: "Supervisor de Futebol",
      assinadoEm: "2026-08-28T13:00:00Z",
      assinaturaImagemSrc: "https://example.com/assinatura-mateus.png",
    });
  });

  it("departamentoPapel decide se o slot 'departamento' lê o papel 'compras' ou 'financeiro'", () => {
    const assinaturasSalvas = [
      {
        papel: "financeiro",
        nomeNoMomento: "Bruno Lima",
        cargoNoMomento: "Departamento Financeiro",
        assinadoEm: "2026-08-28T12:00:00Z",
        assinaturaImagemSrc: null,
      },
    ];
    expect(montarAssinaturasSolicitacao(assinaturasSalvas, "compras").departamento).toBeNull();
    expect(montarAssinaturasSolicitacao(assinaturasSalvas, "financeiro").departamento).toEqual({
      nome: "Bruno Lima",
      cargo: "Departamento Financeiro",
      assinadoEm: "2026-08-28T12:00:00Z",
      assinaturaImagemSrc: null,
    });
  });

  it("nenhuma assinatura salva → os 4 pendentes", () => {
    const resultado = montarAssinaturasSolicitacao([], "compras");
    expect(resultado).toEqual({ solicitante: null, encarregado: null, departamento: null, aprovador: null });
  });
});
