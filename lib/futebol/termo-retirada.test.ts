import { describe, expect, it } from "vitest";
import { proximoNumero, situacaoDoTermo, totalDoItem, totalDoTermo } from "./termo-retirada";

describe("total do termo", () => {
  it("multiplica quantidade pelo valor unitário", () => {
    expect(totalDoItem({ quantidade: 3, valorUnitario: 25.5 })).toBe(76.5);
  });

  it("item sem valor informado não tem total nem soma no termo", () => {
    expect(totalDoItem({ quantidade: 2, valorUnitario: null })).toBeNull();
    expect(
      totalDoTermo([
        { quantidade: 2, valorUnitario: 100 },
        { quantidade: 5, valorUnitario: null },
        { quantidade: 1, valorUnitario: 49.9 },
      ]),
    ).toBe(249.9);
  });

  it("termo sem nenhum valor soma zero", () => {
    expect(totalDoTermo([{ quantidade: 1, valorUnitario: null }])).toBe(0);
  });
});

describe("situação do termo", () => {
  const emprestimo = (previsao: string | null, devolvido: string | null) => ({
    tipo: "emprestimo" as const,
    previsao_devolucao: previsao,
    devolvido_em: devolvido,
  });

  it("empréstimo sem devolução e dentro do prazo fica em aberto", () => {
    expect(situacaoDoTermo(emprestimo("2026-09-30", null), "2026-08-11")).toBe("em_aberto");
  });

  it("empréstimo com previsão vencida fica atrasado", () => {
    expect(situacaoDoTermo(emprestimo("2026-08-01", null), "2026-08-11")).toBe("atrasado");
  });

  it("no dia da previsão ainda não está atrasado", () => {
    expect(situacaoDoTermo(emprestimo("2026-08-11", null), "2026-08-11")).toBe("em_aberto");
  });

  it("devolvido não fica atrasado mesmo com previsão vencida", () => {
    expect(situacaoDoTermo(emprestimo("2026-08-01", "2026-08-05"), "2026-08-11")).toBe("devolvido");
  });

  it("empréstimo sem previsão fica em aberto, nunca atrasado", () => {
    expect(situacaoDoTermo(emprestimo(null, null), "2026-08-11")).toBe("em_aberto");
  });

  it("retirada definitiva não cobra devolução", () => {
    expect(
      situacaoDoTermo({ tipo: "definitiva", previsao_devolucao: null, devolvido_em: null }, "2026-08-11"),
    ).toBe("definitiva");
  });
});

describe("proximoNumero", () => {
  it("começa em 1 quando não há termo nenhum", () => {
    expect(proximoNumero(null)).toBe(1);
  });

  it("segue do maior número existente", () => {
    expect(proximoNumero(37)).toBe(38);
  });
});
