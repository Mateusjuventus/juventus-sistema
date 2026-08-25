import { describe, expect, it } from "vitest";
import { formatTelefone, isValidTelefone, normalizeTelefone } from "./telefone";

describe("formatTelefone", () => {
  it("cresce a máscara conforme os dígitos digitados, sempre no molde de celular", () => {
    expect(formatTelefone("1")).toBe("(1");
    expect(formatTelefone("11")).toBe("(11");
    expect(formatTelefone("119")).toBe("(11) 9");
    expect(formatTelefone("1139")).toBe("(11) 39");
    expect(formatTelefone("1133334")).toBe("(11) 33334");
    expect(formatTelefone("11333344")).toBe("(11) 33334-4");
  });

  it("formata 11 dígitos como celular: (00) 00000-0000", () => {
    expect(formatTelefone("11987654321")).toBe("(11) 98765-4321");
  });

  it("ignora dígitos além do 11º", () => {
    expect(formatTelefone("119876543219999")).toBe("(11) 98765-4321");
  });

  it("aceita valor já com máscara (reformatação)", () => {
    expect(formatTelefone("(11) 98765-4321")).toBe("(11) 98765-4321");
  });

  it("retorna vazio para valor vazio", () => {
    expect(formatTelefone("")).toBe("");
  });
});

describe("normalizeTelefone", () => {
  it("remove máscara, deixando só os dígitos", () => {
    expect(normalizeTelefone("(11) 98765-4321")).toBe("11987654321");
  });

  it("limita a 11 dígitos", () => {
    expect(normalizeTelefone("119876543219999")).toBe("11987654321");
  });
});

describe("isValidTelefone", () => {
  it("aceita só 11 dígitos (celular)", () => {
    expect(isValidTelefone("(11) 98765-4321")).toBe(true);
  });

  it("rejeita quantidade errada de dígitos, inclusive 10 (fixo)", () => {
    expect(isValidTelefone("(11) 3333-4444")).toBe(false);
    expect(isValidTelefone("123")).toBe(false);
    expect(isValidTelefone("")).toBe(false);
  });
});
