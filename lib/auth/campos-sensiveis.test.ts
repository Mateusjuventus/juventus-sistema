import { describe, expect, it } from "vitest";
import { CAMPOS_SENSIVEIS, TODOS_CAMPOS_SENSIVEIS, ehCampoSensivelValido } from "./campos-sensiveis";

describe("ehCampoSensivelValido", () => {
  it("aceita os valores do catálogo", () => {
    expect(ehCampoSensivelValido("salario")).toBe(true);
  });

  it("rejeita valores fora do catálogo", () => {
    expect(ehCampoSensivelValido("cpf")).toBe(false);
    expect(ehCampoSensivelValido("")).toBe(false);
  });
});

describe("TODOS_CAMPOS_SENSIVEIS", () => {
  it("espelha os values de CAMPOS_SENSIVEIS", () => {
    expect(TODOS_CAMPOS_SENSIVEIS).toEqual(CAMPOS_SENSIVEIS.map((c) => c.value));
  });
});
