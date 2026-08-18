import { describe, expect, it } from "vitest";
import {
  confereFinalCpf,
  horarioDaFuncao,
  montarResumo,
  rotuloVaga,
  todasPreenchidas,
  totalOcupadas,
  totalVagas,
  vagasRestantes,
  type VagaFuncaoResumo,
} from "./vagas-staff";

const NOMES = new Map([
  ["f-seg", "Segurança"],
  ["f-gan", "Gandula"],
]);

function resumo(parcial: Partial<VagaFuncaoResumo>): VagaFuncaoResumo {
  return {
    vagaFuncaoId: "v1",
    funcaoId: "f-seg",
    funcaoNome: "Segurança",
    quantidade: 4,
    ocupadas: 0,
    horarioApresentacao: null,
    ...parcial,
  };
}

describe("montarResumo", () => {
  it("conta só quem está confirmado — quem está na espera não ocupa vaga", () => {
    const r = montarResumo(
      [{ id: "v1", funcao_id: "f-seg", quantidade: 4, horario_apresentacao: "12h30" }],
      [
        { vaga_funcao_id: "v1", situacao: "confirmado" },
        { vaga_funcao_id: "v1", situacao: "confirmado" },
        { vaga_funcao_id: "v1", situacao: "espera" },
      ],
      NOMES,
    );
    expect(r[0]).toMatchObject({ funcaoNome: "Segurança", quantidade: 4, ocupadas: 2, horarioApresentacao: "12h30" });
  });

  it("não confunde inscrição de outra função", () => {
    const r = montarResumo(
      [
        { id: "v1", funcao_id: "f-seg", quantidade: 2, horario_apresentacao: null },
        { id: "v2", funcao_id: "f-gan", quantidade: 2, horario_apresentacao: null },
      ],
      [
        { vaga_funcao_id: "v1", situacao: "confirmado" },
        { vaga_funcao_id: "v2", situacao: "confirmado" },
        { vaga_funcao_id: "v2", situacao: "confirmado" },
      ],
      NOMES,
    );
    expect(r.map((x) => x.ocupadas)).toEqual([1, 2]);
  });

  it("não quebra quando a função foi removida do catálogo", () => {
    const r = montarResumo([{ id: "v1", funcao_id: "sumiu", quantidade: 1, horario_apresentacao: null }], [], NOMES);
    expect(r[0].funcaoNome).toBe("Função removida");
  });
});

describe("vagasRestantes / rotuloVaga", () => {
  it("mostra o número restante, e 'última!' quando sobra uma", () => {
    expect(rotuloVaga(resumo({ quantidade: 4, ocupadas: 1 }))).toBe("3 vagas");
    expect(rotuloVaga(resumo({ quantidade: 4, ocupadas: 3 }))).toBe("última!");
    expect(rotuloVaga(resumo({ quantidade: 4, ocupadas: 4 }))).toBe("esgotado");
  });

  it("nunca fica negativo se a quantidade for reduzida depois de gente já ter entrado", () => {
    expect(vagasRestantes(resumo({ quantidade: 2, ocupadas: 3 }))).toBe(0);
    expect(rotuloVaga(resumo({ quantidade: 2, ocupadas: 3 }))).toBe("esgotado");
  });
});

describe("totais", () => {
  it("soma vagas e preenchidas", () => {
    const rs = [resumo({ quantidade: 4, ocupadas: 2 }), resumo({ quantidade: 6, ocupadas: 5 })];
    expect(totalVagas(rs)).toBe(10);
    expect(totalOcupadas(rs)).toBe(7);
  });

  it("não mostra mais preenchidas do que vagas quando a quantidade foi reduzida", () => {
    expect(totalOcupadas([resumo({ quantidade: 2, ocupadas: 5 })])).toBe(2);
  });

  it("'todas preenchidas' só vale com alguma vaga aberta", () => {
    expect(todasPreenchidas([])).toBe(false);
    expect(todasPreenchidas([resumo({ quantidade: 2, ocupadas: 2 })])).toBe(true);
    expect(todasPreenchidas([resumo({ quantidade: 2, ocupadas: 2 }), resumo({ quantidade: 2, ocupadas: 1 })])).toBe(false);
  });
});

describe("confereFinalCpf", () => {
  it("aceita o CPF salvo com ou sem máscara", () => {
    expect(confereFinalCpf("123.456.789-05", "8905")).toBe(true);
    expect(confereFinalCpf("12345678905", "8905")).toBe(true);
  });

  it("recusa dígitos errados, incompletos ou cadastro sem CPF", () => {
    expect(confereFinalCpf("12345678905", "8900")).toBe(false);
    expect(confereFinalCpf("12345678905", "905")).toBe(false);
    expect(confereFinalCpf(null, "8905")).toBe(false);
    expect(confereFinalCpf("123", "0123")).toBe(false);
  });
});

describe("horarioDaFuncao", () => {
  it("prefere o horário da função — é ele que muda de uma pra outra", () => {
    expect(horarioDaFuncao("13h30", "12h30")).toBe("13h30");
  });

  it("cai no horário geral quando a função não tem um próprio", () => {
    expect(horarioDaFuncao(null, "12h30")).toBe("12h30");
    expect(horarioDaFuncao("   ", "12h30")).toBe("12h30");
  });

  it("devolve null quando nenhum dos dois foi preenchido", () => {
    expect(horarioDaFuncao(null, null)).toBeNull();
    expect(horarioDaFuncao("", "  ")).toBeNull();
  });
});
