import { describe, expect, it } from "vitest";
import {
  agruparPorBloco,
  atletaEhCandidatoAutomatico,
  atletasSemContratoParaAviso,
  calcularListaFinal,
  evolucoesDoContrato,
  valorTotalContrato,
  type AtletaParaRelacao,
  type ExcecaoRelacao,
} from "./relacao-formacao-profissional";
import type { AtletaContratoEvolucaoSalarialRow, AtletaContratoRow } from "@/lib/supabase/types";

function contrato(overrides: Partial<AtletaContratoRow> = {}): AtletaContratoRow {
  return {
    id: "contrato-1",
    atleta_id: "atleta-1",
    vigente: true,
    tipo_contrato: "formacao",
    clube_origem: null,
    vigencia_inicio: "2026-01-01",
    vigencia_fim: "2026-12-31",
    salario_ctps: 1000,
    direito_imagem: 200,
    bonificacao: 100,
    auxilio_moradia: 50,
    outros: 0,
    direito_economico_juventus_pct: null,
    direito_economico_atleta_pct: null,
    direito_economico_terceiro_nome: null,
    direito_economico_terceiro_pct: null,
    bolsa_aprendizagem: 0,
    texto_contrato_custom: null,
    texto_clausulas_adicionais_custom: null,
    criado_por_perfil_id: null,
    criado_por_nome: "Fulano",
    created_at: "2026-01-01T12:00:00Z",
    encerrado_em: null,
    ...overrides,
  };
}

function atleta(overrides: Partial<AtletaParaRelacao> = {}): AtletaParaRelacao {
  return {
    id: "atleta-1",
    nomeCompleto: "Fulano de Tal",
    cpf: "00000000000",
    dataNascimento: "2008-01-01",
    status: "liberado",
    ativo: true,
    categoria: "sub17",
    contratoVigente: contrato(),
    ...overrides,
  };
}

describe("atletaEhCandidatoAutomatico", () => {
  it("passa com categoria de Base, contrato de Formação, status liberado e ativo", () => {
    expect(atletaEhCandidatoAutomatico(atleta())).toBe(true);
  });

  it("recusa categoria profissional", () => {
    expect(atletaEhCandidatoAutomatico(atleta({ categoria: "profissional" }))).toBe(false);
  });

  it("recusa status dispensado", () => {
    expect(atletaEhCandidatoAutomatico(atleta({ status: "dispensado" }))).toBe(false);
  });

  it("recusa atleta inativo", () => {
    expect(atletaEhCandidatoAutomatico(atleta({ ativo: false }))).toBe(false);
  });

  it("recusa sem contrato vigente", () => {
    expect(atletaEhCandidatoAutomatico(atleta({ contratoVigente: null }))).toBe(false);
  });

  it("recusa contrato Amador", () => {
    expect(atletaEhCandidatoAutomatico(atleta({ contratoVigente: contrato({ tipo_contrato: "amador" }) }))).toBe(false);
  });

  it("recusa contrato Iniciação", () => {
    expect(atletaEhCandidatoAutomatico(atleta({ contratoVigente: contrato({ tipo_contrato: "iniciacao" }) }))).toBe(false);
  });

  it("passa com contrato Definitivo", () => {
    expect(atletaEhCandidatoAutomatico(atleta({ contratoVigente: contrato({ tipo_contrato: "definitivo" }) }))).toBe(true);
  });

  it("passa com contrato Empréstimo", () => {
    expect(atletaEhCandidatoAutomatico(atleta({ contratoVigente: contrato({ tipo_contrato: "emprestimo" }) }))).toBe(true);
  });
});

describe("calcularListaFinal", () => {
  it("sem exceções, devolve exatamente os candidatos automáticos", () => {
    const todos = [atleta({ id: "a1" }), atleta({ id: "a2", categoria: "profissional" })];
    const resultado = calcularListaFinal(todos, []);
    expect(resultado.map((a) => a.id)).toEqual(["a1"]);
  });

  it("exceção 'incluir' traz quem o automático não pegaria", () => {
    const foraDoAutomatico = atleta({ id: "a2", categoria: "profissional" });
    const todos = [atleta({ id: "a1" }), foraDoAutomatico];
    const excecoes: ExcecaoRelacao[] = [{ atletaId: "a2", tipo: "incluir" }];
    const resultado = calcularListaFinal(todos, excecoes);
    expect(resultado.map((a) => a.id).sort()).toEqual(["a1", "a2"]);
  });

  it("exceção 'excluir' tira quem o automático pegaria", () => {
    const todos = [atleta({ id: "a1" }), atleta({ id: "a2" })];
    const excecoes: ExcecaoRelacao[] = [{ atletaId: "a1", tipo: "excluir" }];
    const resultado = calcularListaFinal(todos, excecoes);
    expect(resultado.map((a) => a.id)).toEqual(["a2"]);
  });

  it("exceção 'excluir' tem prioridade mesmo se também houvesse uma 'incluir' pro mesmo id (não deveria acontecer no banco, mas a lib não deve quebrar)", () => {
    const todos = [atleta({ id: "a1" })];
    const excecoes: ExcecaoRelacao[] = [
      { atletaId: "a1", tipo: "incluir" },
      { atletaId: "a1", tipo: "excluir" },
    ];
    expect(calcularListaFinal(todos, excecoes)).toEqual([]);
  });
});

describe("valorTotalContrato", () => {
  it("soma as 5 rubricas", () => {
    expect(valorTotalContrato(contrato({ salario_ctps: 1000, direito_imagem: 200, bonificacao: 100, auxilio_moradia: 50, outros: 10 }))).toBe(
      1360,
    );
  });
});

describe("agruparPorBloco", () => {
  it("separa Formação de Profissional (Definitivo + Empréstimo) e ordena por nome", () => {
    const lista = [
      atleta({ id: "a1", nomeCompleto: "Zeca", contratoVigente: contrato({ id: "c1", tipo_contrato: "formacao" }) }),
      atleta({ id: "a2", nomeCompleto: "Ana", contratoVigente: contrato({ id: "c2", tipo_contrato: "formacao" }) }),
      atleta({ id: "a3", nomeCompleto: "Beto", contratoVigente: contrato({ id: "c3", tipo_contrato: "definitivo" }) }),
      atleta({ id: "a4", nomeCompleto: "Caio", contratoVigente: contrato({ id: "c4", tipo_contrato: "emprestimo" }) }),
    ];
    const { formacao, profissional } = agruparPorBloco(lista);
    expect(formacao.map((l) => l.atleta.nomeCompleto)).toEqual(["Ana", "Zeca"]);
    expect(profissional.map((l) => l.atleta.nomeCompleto)).toEqual(["Beto", "Caio"]);
  });

  it("atleta sem contrato vigente fica de fora dos dois blocos", () => {
    const lista = [atleta({ id: "a1", contratoVigente: null })];
    const { formacao, profissional } = agruparPorBloco(lista);
    expect(formacao).toEqual([]);
    expect(profissional).toEqual([]);
  });
});

describe("atletasSemContratoParaAviso", () => {
  it("devolve só quem não tem contrato vigente", () => {
    const lista = [atleta({ id: "a1" }), atleta({ id: "a2", contratoVigente: null })];
    expect(atletasSemContratoParaAviso(lista).map((a) => a.id)).toEqual(["a2"]);
  });
});

describe("evolucoesDoContrato", () => {
  function evolucao(overrides: Partial<AtletaContratoEvolucaoSalarialRow> = {}): AtletaContratoEvolucaoSalarialRow {
    return {
      id: "evo-1",
      contrato_id: "contrato-1",
      rubrica: "salario_ctps",
      data_vigencia: "2027-01-01",
      novo_valor: 1500,
      criado_por_perfil_id: null,
      criado_por_nome: "Fulano",
      created_at: "2026-01-01T12:00:00Z",
      ...overrides,
    };
  }

  it("filtra só do contrato pedido e ordena por data", () => {
    const todas = [
      evolucao({ id: "e1", contrato_id: "contrato-1", data_vigencia: "2027-06-01" }),
      evolucao({ id: "e2", contrato_id: "contrato-2", data_vigencia: "2027-01-01" }),
      evolucao({ id: "e3", contrato_id: "contrato-1", data_vigencia: "2027-01-01" }),
    ];
    const resultado = evolucoesDoContrato("contrato-1", todas);
    expect(resultado.map((e) => e.id)).toEqual(["e3", "e1"]);
  });

  it("lista vazia quando o contrato não tem nenhuma evolução agendada", () => {
    expect(evolucoesDoContrato("contrato-1", [])).toEqual([]);
  });
});
