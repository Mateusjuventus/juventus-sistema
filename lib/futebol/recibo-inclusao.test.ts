import { describe, expect, it } from "vitest";
import { decidirInclusaoRecibo } from "./recibo-inclusao";

describe("decidirInclusaoRecibo", () => {
  it("mantém marcado normalmente quando a vaga não mudou desde o carregamento", () => {
    expect(decidirInclusaoRecibo({ marcado: true, vagaAoCarregar: true, temVagaAgora: true })).toBe(true);
  });

  it("mantém desmarcado normalmente quando nunca teve vaga", () => {
    expect(decidirInclusaoRecibo({ marcado: false, vagaAoCarregar: false, temVagaAgora: false })).toBe(false);
  });

  it("respeita inclusão manual de alguém sem vaga", () => {
    expect(decidirInclusaoRecibo({ marcado: true, vagaAoCarregar: false, temVagaAgora: false })).toBe(true);
  });

  it("inclui quem confirmou vaga depois que a tela carregou, mesmo desmarcado (bug reportado)", () => {
    expect(decidirInclusaoRecibo({ marcado: false, vagaAoCarregar: false, temVagaAgora: true })).toBe(true);
  });

  it("nunca inclui quem perdeu a vaga depois que a tela carregou, mesmo que ainda apareça marcado", () => {
    expect(decidirInclusaoRecibo({ marcado: true, vagaAoCarregar: true, temVagaAgora: false })).toBe(false);
  });

  it("respeita a desmarcação explícita de quem já estava com vaga confirmada na tela", () => {
    expect(decidirInclusaoRecibo({ marcado: false, vagaAoCarregar: true, temVagaAgora: true })).toBe(false);
  });
});
