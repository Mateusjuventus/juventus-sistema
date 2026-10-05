import { describe, expect, it } from "vitest";
import { corPrazoDemanda } from "./cor-prazo";

const HOJE = "2026-10-05";

describe("corPrazoDemanda", () => {
  it("sem prazo, não tem cor", () => {
    expect(corPrazoDemanda(null, "pendente", HOJE)).toBeNull();
  });

  it("concluída, não tem cor mesmo com prazo vencido", () => {
    expect(corPrazoDemanda("2026-09-01", "concluido", HOJE)).toBeNull();
  });

  it("prazo no passado, vermelho (atrasada)", () => {
    expect(corPrazoDemanda("2026-10-04", "pendente", HOJE)).toBe("vermelho");
    expect(corPrazoDemanda("2026-09-01", "em_andamento", HOJE)).toBe("vermelho");
  });

  it("prazo hoje, laranja", () => {
    expect(corPrazoDemanda(HOJE, "pendente", HOJE)).toBe("laranja");
  });

  it("prazo amanhã, laranja", () => {
    expect(corPrazoDemanda("2026-10-06", "pendente", HOJE)).toBe("laranja");
  });

  it("prazo depois de amanhã em diante, verde", () => {
    expect(corPrazoDemanda("2026-10-07", "pendente", HOJE)).toBe("verde");
    expect(corPrazoDemanda("2026-11-01", "em_andamento", HOJE)).toBe("verde");
  });
});
