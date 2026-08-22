import { describe, expect, it } from "vitest";
import { calcularGeralBase, tipoPagamentoAtletaBase, valorDespesaBase } from "./financeiro-base";
import type { AtletaBaseRow, ComissaoTecnicaBaseRow, DespesaAvulsaBaseComCategoriaRow } from "../supabase/types";

/** Só os campos que `calcularGeralBase` de fato lê — o resto do shape de cada Row não importa
 * pro cálculo, então os testes não precisam simular o registro inteiro. */
function comissao(categorias: string[], valorSalario: number | null): ComissaoTecnicaBaseRow {
  return { categorias, valor_salario: valorSalario } as unknown as ComissaoTecnicaBaseRow;
}

function atleta(categoria: string, valorAjudaCusto: number | null): AtletaBaseRow {
  return { categoria, valor_ajuda_custo: valorAjudaCusto } as unknown as AtletaBaseRow;
}

function despesa(
  categoria: string | null,
  valorPrevisto: number,
  valorEfetuado: number | null = null,
): DespesaAvulsaBaseComCategoriaRow {
  return {
    categoria,
    valor_previsto: valorPrevisto,
    valor_efetuado: valorEfetuado,
  } as unknown as DespesaAvulsaBaseComCategoriaRow;
}

describe("valorDespesaBase", () => {
  it("usa o efetuado quando existe", () => {
    expect(valorDespesaBase({ valor_previsto: 100, valor_efetuado: 80 })).toBe(80);
  });

  it("cai pro previsto quando ainda não foi efetuado", () => {
    expect(valorDespesaBase({ valor_previsto: 100, valor_efetuado: null })).toBe(100);
  });
});

describe("calcularGeralBase", () => {
  it("soma salário e ajuda de custo sem duplicar quando a pessoa tem uma categoria só", () => {
    const resumo = calcularGeralBase([comissao(["sub11"], 2000)], [atleta("sub11", 300)], []);

    expect(resumo.custoComissao).toBe(2000);
    expect(resumo.custoAtletas).toBe(300);
    expect(resumo.custoMensalFixo).toBe(2300);
    expect(resumo.totalGeral).toBe(2300);

    const sub11 = resumo.linhasCategoria.find((l) => l.key === "sub11")!;
    expect(sub11.valor).toBe(2300);
  });

  it("divide o salário igualmente entre as categorias de quem atua em mais de uma", () => {
    // Mesmo treinador do Sub-11 e do Sub-12, R$3000 no total — a pessoa recebe o valor cheio, mas
    // cada categoria absorve metade na quebra por categoria.
    const resumo = calcularGeralBase([comissao(["sub11", "sub12"], 3000)], [], []);

    expect(resumo.custoComissao).toBe(3000); // não duplica o total geral
    const sub11 = resumo.linhasCategoria.find((l) => l.key === "sub11")!;
    const sub12 = resumo.linhasCategoria.find((l) => l.key === "sub12")!;
    expect(sub11.valor).toBe(1500);
    expect(sub12.valor).toBe(1500);
  });

  it("ignora quem ainda não tem salário cadastrado (null) na soma, mas não quebra o cálculo", () => {
    const resumo = calcularGeralBase([comissao(["sub14"], null), comissao(["sub14"], 1000)], [], []);
    expect(resumo.custoComissao).toBe(1000);
  });

  it("despesa sem categoria de idade vai pra linha 'Geral', não pra nenhuma categoria", () => {
    const resumo = calcularGeralBase([], [], [despesa(null, 500)]);

    const geral = resumo.linhasCategoria.find((l) => l.key === "geral")!;
    expect(geral.valor).toBe(500);
    for (const linha of resumo.linhasCategoria) {
      if (linha.key !== "geral") expect(linha.valor).toBe(0);
    }
    expect(resumo.despesasTotal).toBe(500);
    expect(resumo.totalGeral).toBe(500);
  });

  it("despesa com categoria de idade entra só naquela categoria", () => {
    const resumo = calcularGeralBase([], [], [despesa("sub13", 200, 150)]);
    const sub13 = resumo.linhasCategoria.find((l) => l.key === "sub13")!;
    expect(sub13.valor).toBe(150); // usa o efetuado, não o previsto
    expect(resumo.despesasTotal).toBe(150);
  });

  it("soma o valor de atletas sem contrato definido normalmente (não precisa vir pré-filtrado)", () => {
    // Reflete o novo uso: a tela/PDF agora passam TODOS os atletas (não só quem recebe), e o `?? 0`
    // já garante que quem não tem valor não afeta a soma.
    const resumo = calcularGeralBase(
      [],
      [atleta("sub11", null), atleta("sub11", 500), atleta("sub12", 0)],
      [],
    );
    expect(resumo.custoAtletas).toBe(500);
  });
});

describe("tipoPagamentoAtletaBase", () => {
  it("Definitivo é Salário", () => {
    expect(tipoPagamentoAtletaBase("definitivo")).toBe("Salário");
  });

  it("Amador é Ajuda de custo, com ou sem o flag de contrato de formação", () => {
    expect(tipoPagamentoAtletaBase("amador")).toBe("Ajuda de custo");
  });

  it("Empréstimo tem rótulo próprio", () => {
    expect(tipoPagamentoAtletaBase("emprestimo")).toBe("Empréstimo");
  });

  it("Iniciação e nulo caem em 'Sem contrato'", () => {
    expect(tipoPagamentoAtletaBase("iniciacao")).toBe("Sem contrato");
    expect(tipoPagamentoAtletaBase(null)).toBe("Sem contrato");
  });
});
