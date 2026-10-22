import { describe, expect, it } from "vitest";
import { formatCEP, isValidCEP, normalizeCEP } from "./cep";

describe("formatCEP", () => {
  it("formata 8 dígitos como 00000-000", () => {
    expect(formatCEP("07031000")).toBe("07031-000");
  });

  it("aceita valor já com traço (reformatação)", () => {
    expect(formatCEP("07031-000")).toBe("07031-000");
  });

  it("devolve o valor original quando não tem 8 dígitos (cadastro antigo incompleto)", () => {
    expect(formatCEP("123")).toBe("123");
    expect(formatCEP("")).toBe("");
  });
});

describe("normalizeCEP", () => {
  it("remove traço, deixando só os dígitos", () => {
    expect(normalizeCEP("07031-000")).toBe("07031000");
  });

  it("limita a 8 dígitos", () => {
    expect(normalizeCEP("070310009999")).toBe("07031000");
  });
});

describe("isValidCEP", () => {
  it("aceita só 8 dígitos", () => {
    expect(isValidCEP("07031-000")).toBe(true);
  });

  it("rejeita quantidade errada de dígitos", () => {
    expect(isValidCEP("123")).toBe(false);
    expect(isValidCEP("")).toBe(false);
  });
});
