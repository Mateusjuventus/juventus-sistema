import { describe, expect, it } from "vitest";
import {
  CAMPOS_FICHA_ATLETA_PROFISSIONAL,
  camposFichaAtletaDaQueryString,
  camposFichaAtletaParaQueryString,
  construirSecoesFichaAtleta,
  enderecoFichaAtleta,
  todosCamposFichaAtleta,
} from "./ficha-atleta";

describe("todosCamposFichaAtleta", () => {
  it("marca todos os campos da lista", () => {
    const todos = todosCamposFichaAtleta(CAMPOS_FICHA_ATLETA_PROFISSIONAL);
    expect(todos.size).toBe(CAMPOS_FICHA_ATLETA_PROFISSIONAL.length);
    expect(todos.has("nome_completo")).toBe(true);
    expect(todos.has("contrato_valor_total")).toBe(true);
  });
});

describe("camposFichaAtletaParaQueryString", () => {
  it("omite o parâmetro quando todos os campos estão marcados (ficha completa)", () => {
    const todos = todosCamposFichaAtleta(CAMPOS_FICHA_ATLETA_PROFISSIONAL);
    expect(camposFichaAtletaParaQueryString(todos, CAMPOS_FICHA_ATLETA_PROFISSIONAL)).toBe("");
  });

  it("serializa só os campos desmarcados removidos", () => {
    const selecionados = new Set(["nome_completo", "telefone"]);
    expect(camposFichaAtletaParaQueryString(selecionados, CAMPOS_FICHA_ATLETA_PROFISSIONAL)).toBe(
      "campos=nome_completo,telefone",
    );
  });
});

describe("camposFichaAtletaDaQueryString", () => {
  it("sem o parâmetro 'campos', assume todos marcados (link antigo)", () => {
    const params = new URLSearchParams("");
    const resultado = camposFichaAtletaDaQueryString(params, CAMPOS_FICHA_ATLETA_PROFISSIONAL);
    expect(resultado.size).toBe(CAMPOS_FICHA_ATLETA_PROFISSIONAL.length);
  });

  it("com o parâmetro 'campos', usa só o que veio na query string", () => {
    const params = new URLSearchParams("campos=nome_completo,telefone");
    const resultado = camposFichaAtletaDaQueryString(params, CAMPOS_FICHA_ATLETA_PROFISSIONAL);
    expect(resultado).toEqual(new Set(["nome_completo", "telefone"]));
  });
});

describe("enderecoFichaAtleta", () => {
  it("monta o endereço inteiro numa linha", () => {
    expect(
      enderecoFichaAtleta({
        logradouro: "Rua Javari",
        numero: "117",
        complemento: null,
        bairro: "Mooca",
        cidade: "São Paulo",
        uf: "SP",
        cepFormatado: "03112-100",
      }),
    ).toBe("Rua Javari, 117, Mooca, São Paulo/SP, CEP 03112-100");
  });

  it("inclui o complemento depois do número", () => {
    expect(
      enderecoFichaAtleta({
        logradouro: "Av. Brasil",
        numero: "500",
        complemento: "Torre B",
        bairro: null,
        cidade: "Santos",
        uf: "sp",
        cepFormatado: null,
      }),
    ).toBe("Av. Brasil, 500 — Torre B, Santos/SP");
  });

  it("devolve null quando o endereço está vazio", () => {
    expect(
      enderecoFichaAtleta({
        logradouro: null,
        numero: null,
        complemento: null,
        bairro: null,
        cidade: null,
        uf: null,
        cepFormatado: null,
      }),
    ).toBeNull();
  });
});

describe("construirSecoesFichaAtleta", () => {
  const valores: Record<string, string | null> = {
    nome_completo: "Lucas Ferreira",
    telefone: "(11) 91234-5678",
    posicao: "Volante",
    contrato_tipo: "Definitivo",
    contrato_salario_ctps: "R$ 5.000,00 (50.0%)",
  };

  it("inclui só os campos marcados, agrupados por seção", () => {
    const selecionados = new Set(["nome_completo", "posicao"]);
    const secoes = construirSecoesFichaAtleta(CAMPOS_FICHA_ATLETA_PROFISSIONAL, selecionados, valores, true);

    const pessoais = secoes.find((s) => s.titulo === "Dados Pessoais")!;
    expect(pessoais.dados).toEqual([{ label: "Nome completo", valor: "Lucas Ferreira" }]);

    const esportivos = secoes.find((s) => s.titulo === "Dados Esportivos")!;
    expect(esportivos.dados).toEqual([{ label: "Posição", valor: "Volante" }]);
  });

  it("seção sem nenhum campo marcado vira array vazio (não entra no PDF)", () => {
    const selecionados = new Set(["nome_completo"]);
    const secoes = construirSecoesFichaAtleta(CAMPOS_FICHA_ATLETA_PROFISSIONAL, selecionados, valores, true);
    const contrato = secoes.find((s) => s.titulo === "Dados do Contrato")!;
    expect(contrato.dados).toEqual([]);
  });

  it("contrato marcado mas sem contrato vigente mostra aviso em vez da grade", () => {
    const selecionados = new Set(["contrato_tipo", "contrato_salario_ctps"]);
    const secoes = construirSecoesFichaAtleta(CAMPOS_FICHA_ATLETA_PROFISSIONAL, selecionados, valores, false);
    const contrato = secoes.find((s) => s.titulo === "Dados do Contrato")!;
    expect(contrato.dados).toBeNull();
    expect(contrato.avisoVazio).toBe("Nenhum contrato vigente cadastrado.");
  });

  it("contrato marcado e com contrato vigente mostra a grade normalmente", () => {
    const selecionados = new Set(["contrato_tipo"]);
    const secoes = construirSecoesFichaAtleta(CAMPOS_FICHA_ATLETA_PROFISSIONAL, selecionados, valores, true);
    const contrato = secoes.find((s) => s.titulo === "Dados do Contrato")!;
    expect(contrato.dados).toEqual([{ label: "Tipo de contrato", valor: "Definitivo" }]);
  });
});
