import { describe, expect, it } from "vitest";
import { montarAssinaturasDispensa } from "./relatorio-dispensa-document";

describe("montarAssinaturasDispensa", () => {
  it("mapeia cada papel salvo pro campo certo, ignorando papéis desconhecidos", () => {
    const resultado = montarAssinaturasDispensa([
      { papel: "treinador", nomeNoMomento: "Fabinho", cargoNoMomento: "Treinador Sub15", assinadoEm: "2026-08-28T10:00:00Z" },
      { papel: "departamento", nomeNoMomento: "Mateus dos Santos", cargoNoMomento: null, assinadoEm: "2026-08-28T11:00:00Z" },
    ]);
    expect(resultado.treinador).toEqual({ nome: "Fabinho", cargo: "Treinador Sub15", assinadoEm: "2026-08-28T10:00:00Z" });
    expect(resultado.departamento).toEqual({ nome: "Mateus dos Santos", cargo: null, assinadoEm: "2026-08-28T11:00:00Z" });
  });

  it("papel ainda não assinado vira null (pendente)", () => {
    const resultado = montarAssinaturasDispensa([
      { papel: "treinador", nomeNoMomento: "Fabinho", cargoNoMomento: null, assinadoEm: "2026-08-28T10:00:00Z" },
    ]);
    expect(resultado.departamento).toBeNull();
  });

  it("nenhuma assinatura salva → os dois pendentes", () => {
    const resultado = montarAssinaturasDispensa([]);
    expect(resultado).toEqual({ treinador: null, departamento: null });
  });
});
