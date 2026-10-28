import { describe, expect, it } from "vitest";
import { calcularGeralBase, custoAtletaBase, mapaContratoVigentePorAtleta, tipoPagamentoAtletaBase } from "./financeiro-base";
import type { AtletaBaseRow, ComissaoTecnicaRow } from "@/lib/supabase/types";

/** Fábrica mínima de `ComissaoTecnicaRow` — só os campos que `calcularGeralBase` de fato lê
 * (`categorias`, `valor_salario`); o resto é preenchido com valores neutros só pra satisfazer o
 * tipo. Ver docs/superpowers/specs/2026-10-28-unificacao-comissao-tecnica-design.md (a tabela
 * agora é a mesma pros dois departamentos, com "profissional" como mais uma categoria). */
function comissao(overrides: Partial<ComissaoTecnicaRow> & Pick<ComissaoTecnicaRow, "id" | "categorias">): ComissaoTecnicaRow {
  return {
    nome_completo: "Fulano",
    rg: "000",
    cpf: "00000000000",
    data_nascimento: "1990-01-01",
    funcao: "Técnico",
    telefone: null,
    email: null,
    foto_path: null,
    tipo_quarto_preferido: null,
    apelido: null,
    tipo_contrato: null,
    data_inicio: null,
    valor_salario: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function atleta(overrides: Partial<AtletaBaseRow> & Pick<AtletaBaseRow, "id" | "categoria">): AtletaBaseRow {
  return {
    nome_completo: "Atleta",
    posicao: "ATA",
    status: "liberado",
    classificacao: null,
    data_nascimento: "2010-01-01",
    valor_ajuda_custo: null,
    tipo_contrato: null,
    possui_contrato_formacao: false,
    foto_path: null,
    dispensa_data: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as AtletaBaseRow;
}

describe("calcularGeralBase — Comissão Técnica já unificada (Profissional + Base)", () => {
  it("ignora quem só tem a categoria 'profissional' (não entra no Gasto Geral da Base)", () => {
    const resumo = calcularGeralBase(
      [comissao({ id: "c1", categorias: ["profissional"], valor_salario: 5000 })],
      [],
      [],
      [],
    );
    expect(resumo.custoComissao).toBe(0);
    expect(resumo.totalGeral).toBe(0);
  });

  it("conta quem tem só categoria da Base, mesmo sem 'profissional'", () => {
    const resumo = calcularGeralBase(
      [comissao({ id: "c1", categorias: ["sub20"], valor_salario: 5000 })],
      [],
      [],
      [],
    );
    expect(resumo.custoComissao).toBe(5000);
    const linhaSub20 = resumo.linhasCategoria.find((l) => l.key === "sub20");
    expect(linhaSub20?.valor).toBe(5000);
  });

  it("alguém com 'profissional' E categoria(s) da Base entra, mas o salário na quebra por categoria divide só entre as categorias da Base (ignora 'profissional' no denominador)", () => {
    // Ex. do coordenador que acompanha o Profissional e o Sub-20 ao mesmo tempo — citado na spec
    // da unificação como o caso de borda que motivou a checagem "já tem gente nos dois ao mesmo
    // tempo". O salário cheio entra no total da Base (ele é responsável pela Base também), mas a
    // quebra por categoria não deve dividir por 2 (profissional + sub20): só há 1 categoria da
    // Base, então ela recebe o valor cheio na linha "Sub-20" — dividir por 2 subestimaria o custo
    // real da Base.
    const resumo = calcularGeralBase(
      [comissao({ id: "c1", categorias: ["profissional", "sub20"], valor_salario: 6000 })],
      [],
      [],
      [],
    );
    expect(resumo.custoComissao).toBe(6000);
    const linhaSub20 = resumo.linhasCategoria.find((l) => l.key === "sub20");
    expect(linhaSub20?.valor).toBe(6000);
  });

  it("alguém em duas categorias da Base (sem 'profissional') continua dividindo o salário igualmente entre as duas, como antes da unificação", () => {
    const resumo = calcularGeralBase(
      [comissao({ id: "c1", categorias: ["sub11", "sub12"], valor_salario: 4000 })],
      [],
      [],
      [],
    );
    const linhaSub11 = resumo.linhasCategoria.find((l) => l.key === "sub11");
    const linhaSub12 = resumo.linhasCategoria.find((l) => l.key === "sub12");
    expect(linhaSub11?.valor).toBe(2000);
    expect(linhaSub12?.valor).toBe(2000);
    expect(resumo.custoComissao).toBe(4000);
  });

  it("soma atletas e despesas normalmente, sem nenhuma Comissão Técnica cadastrada", () => {
    const resumo = calcularGeralBase(
      [],
      [atleta({ id: "a1", categoria: "sub11", valor_ajuda_custo: 300 })],
      [],
      [],
    );
    expect(resumo.custoAtletas).toBe(300);
    expect(resumo.totalGeral).toBe(300);
  });
});

describe("custoAtletaBase / mapaContratoVigentePorAtleta", () => {
  it("usa o contrato vigente quando existe, mesmo com valor_ajuda_custo preenchido", () => {
    const contratoPorAtleta = mapaContratoVigentePorAtleta([
      {
        id: "ct1",
        atleta_id: "a1",
        vigente: true,
        salario_ctps: 1000,
        direito_imagem: 200,
        bonificacao: 0,
        auxilio_moradia: 0,
        outros: 0,
      } as never,
    ]);
    const custo = custoAtletaBase(atleta({ id: "a1", categoria: "sub11", valor_ajuda_custo: 50 }), contratoPorAtleta);
    expect(custo).toBe(1200);
  });

  it("cai no valor_ajuda_custo quando não há contrato vigente", () => {
    const custo = custoAtletaBase(atleta({ id: "a1", categoria: "sub11", valor_ajuda_custo: 80 }), new Map());
    expect(custo).toBe(80);
  });
});

describe("tipoPagamentoAtletaBase", () => {
  it("mapeia cada tipo de contrato pro rótulo certo", () => {
    expect(tipoPagamentoAtletaBase("definitivo")).toBe("Salário");
    expect(tipoPagamentoAtletaBase("amador")).toBe("Ajuda de custo");
    expect(tipoPagamentoAtletaBase("emprestimo")).toBe("Empréstimo");
    expect(tipoPagamentoAtletaBase(null)).toBe("Sem contrato");
  });
});
