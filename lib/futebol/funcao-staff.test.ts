import { describe, expect, it } from "vitest";
import { funcaoCadastroStaff } from "./funcao-staff";

describe("funcaoCadastroStaff", () => {
  it("usa a função interna quando não é terceirizada", () => {
    expect(
      funcaoCadastroStaff({ terceirizada: false, funcao: { nome: "Segurança" }, funcao_terceirizada: null }),
    ).toBe("Segurança");
  });

  it("usa a função da terceirizada quando terceirizada for true", () => {
    expect(
      funcaoCadastroStaff({
        terceirizada: true,
        funcao: null,
        funcao_terceirizada: { nome: "Limpeza" },
      }),
    ).toBe("Limpeza");
  });

  it("retorna null quando o join não trouxe nome nenhum", () => {
    expect(funcaoCadastroStaff({ terceirizada: false, funcao: null, funcao_terceirizada: null })).toBeNull();
  });

  it("ignora a função interna quando terceirizada, mesmo que venha preenchida por engano", () => {
    expect(
      funcaoCadastroStaff({
        terceirizada: true,
        funcao: { nome: "Segurança" },
        funcao_terceirizada: null,
      }),
    ).toBeNull();
  });
});
