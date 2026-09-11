import { describe, expect, it } from "vitest";
import { captacaoInscricaoSchema } from "./schemas";

/** Ficha completa e válida da inscrição pública de Captação — base pra cada teste variar só o
 * campo que interessa (ver spec 2026-09-11-captacao-documentos-termo-auto-cadastro-design.md). */
function fichaValida(overrides: Record<string, unknown> = {}) {
  return {
    nomeCompleto: "João da Silva",
    rg: "12.345.678-9",
    cpf: "52998224725",
    dataNascimento: "2012-05-10",
    posicao: "Zagueiro",
    segundaPosicao: "",
    peDominante: "destro",
    altura: "1.75",
    peso: "68.5",
    categoria: "sub14",
    telefone: "11999998888",
    email: "joao@example.com",
    indicacao: "Um amigo",
    clubeAnterior: "Nenhum",
    maeNome: "Maria da Silva",
    maeTelefone: "11999997777",
    paiNome: "José da Silva",
    paiTelefone: "11999996666",
    escola: "Escola Municipal",
    escolaridade: "8º ano",
    periodoEscolar: "manha",
    possuiPlanoSaude: "nao",
    planoSaudeQual: "",
    federado: "nao",
    federadoClube: "",
    cep: "03124-070",
    logradouro: "Rua Juventus",
    numero: "620",
    complemento: "Casa 1",
    bairro: "Parque da Mooca",
    cidade: "São Paulo",
    uf: "sp",
    responsavelLegalNome: "Maria da Silva",
    responsavelLegalCpf: "11144477735",
    concordoAtleta: true,
    concordoResponsavel: true,
    ...overrides,
  };
}

describe("captacaoInscricaoSchema", () => {
  it("aceita uma ficha completa e válida", () => {
    const resultado = captacaoInscricaoSchema.safeParse(fichaValida());
    expect(resultado.success).toBe(true);
  });

  it("exige altura/peso válidos, convertendo pra número", () => {
    const resultado = captacaoInscricaoSchema.safeParse(fichaValida());
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.altura).toBe(1.75);
      expect(resultado.data.peso).toBe(68.5);
    }
  });

  it("rejeita altura/peso vazios ou não numéricos", () => {
    expect(captacaoInscricaoSchema.safeParse(fichaValida({ altura: "" })).success).toBe(false);
    expect(captacaoInscricaoSchema.safeParse(fichaValida({ peso: "abc" })).success).toBe(false);
    expect(captacaoInscricaoSchema.safeParse(fichaValida({ altura: "0" })).success).toBe(false);
  });

  it("exige planoSaudeQual só quando possuiPlanoSaude é 'sim'", () => {
    expect(captacaoInscricaoSchema.safeParse(fichaValida({ possuiPlanoSaude: "sim" })).success).toBe(false);
    const resultado = captacaoInscricaoSchema.safeParse(
      fichaValida({ possuiPlanoSaude: "sim", planoSaudeQual: "Unimed" }),
    );
    expect(resultado.success).toBe(true);
  });

  it("exige federadoClube só quando federado é 'sim'", () => {
    expect(captacaoInscricaoSchema.safeParse(fichaValida({ federado: "sim" })).success).toBe(false);
    const resultado = captacaoInscricaoSchema.safeParse(
      fichaValida({ federado: "sim", federadoClube: "Outro Clube" }),
    );
    expect(resultado.success).toBe(true);
  });

  it("exige os dois checkboxes do Termo de Responsabilidade marcados", () => {
    expect(captacaoInscricaoSchema.safeParse(fichaValida({ concordoAtleta: false })).success).toBe(false);
    expect(captacaoInscricaoSchema.safeParse(fichaValida({ concordoResponsavel: false })).success).toBe(false);
  });

  it("valida o CPF do responsável legal (dígito verificador)", () => {
    expect(captacaoInscricaoSchema.safeParse(fichaValida({ responsavelLegalCpf: "11144477736" })).success).toBe(
      false,
    );
  });

  it("segundaPosicao continua opcional (nem todo atleta tem uma)", () => {
    const resultado = captacaoInscricaoSchema.safeParse(fichaValida({ segundaPosicao: "" }));
    expect(resultado.success).toBe(true);
  });
});
