import { describe, expect, it } from "vitest";
import { formatCPF, isValidCPF, normalizeCPF } from "./cpf";

describe("isValidCPF", () => {
  it("aceita CPFs válidos (com e sem máscara)", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("52998224725")).toBe(true);
    expect(isValidCPF("111.444.777-35")).toBe(true);
  });

  it("rejeita CPF com dígito verificador incorreto", () => {
    expect(isValidCPF("529.982.247-26")).toBe(false);
    expect(isValidCPF("11144477736")).toBe(false);
  });

  it("rejeita CPFs com todos os dígitos iguais", () => {
    expect(isValidCPF("00000000000")).toBe(false);
    expect(isValidCPF("11111111111")).toBe(false);
    expect(isValidCPF("99999999999")).toBe(false);
  });

  it("rejeita CPF com quantidade errada de dígitos", () => {
    expect(isValidCPF("123")).toBe(false);
    expect(isValidCPF("123456789012")).toBe(false);
    expect(isValidCPF("")).toBe(false);
  });
});

describe("formatCPF", () => {
  it("formata 11 dígitos como 000.000.000-00", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
  });

  it("retorna o valor original se não tiver 11 dígitos", () => {
    expect(formatCPF("123")).toBe("123");
  });
});

describe("normalizeCPF", () => {
  it("remove máscara, deixando só os dígitos", () => {
    expect(normalizeCPF("529.982.247-25")).toBe("52998224725");
  });
});
