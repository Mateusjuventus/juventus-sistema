import { describe, expect, it } from "vitest";
import {
  contarInscricoesPendentes,
  contarPorCategoriaEStatus,
  contarPorStatus,
  contarPorUf,
  encontrarCandidatoParaCompletar,
  historicoPorCpf,
  payloadMudancaStatusCaptacao,
  taxaAprovacao,
} from "./captacao";

describe("contarPorStatus", () => {
  it("conta cada status, incluindo os que não aparecem (ficam em 0)", () => {
    const contagem = contarPorStatus([
      { status: "avaliacao" },
      { status: "avaliacao" },
      { status: "aprovado" },
    ]);
    expect(contagem).toEqual({ avaliacao: 2, aprovado: 1, dispensado: 0, nao_compareceu: 0 });
  });

  it("lista vazia devolve tudo zerado", () => {
    expect(contarPorStatus([])).toEqual({ avaliacao: 0, aprovado: 0, dispensado: 0, nao_compareceu: 0 });
  });

  it("ignora quem está na fila de inscrição (ainda não decidido)", () => {
    const contagem = contarPorStatus([{ status: "inscricao" }, { status: "inscricao" }, { status: "avaliacao" }]);
    expect(contagem).toEqual({ avaliacao: 1, aprovado: 0, dispensado: 0, nao_compareceu: 0 });
  });
});

describe("contarInscricoesPendentes", () => {
  it("conta só quem está com status inscricao", () => {
    const total = contarInscricoesPendentes([
      { status: "inscricao" },
      { status: "inscricao" },
      { status: "avaliacao" },
      { status: "aprovado" },
    ]);
    expect(total).toBe(2);
  });

  it("lista vazia devolve 0", () => {
    expect(contarInscricoesPendentes([])).toBe(0);
  });
});

describe("contarPorCategoriaEStatus", () => {
  it("agrupa por categoria e status, com as 7 categorias sempre presentes", () => {
    const contagem = contarPorCategoriaEStatus([
      { status: "avaliacao", categoria: "sub17" },
      { status: "avaliacao", categoria: "sub17" },
      { status: "aprovado", categoria: "sub17" },
      { status: "dispensado", categoria: "sub11" },
    ]);
    expect(contagem.sub17).toEqual({ avaliacao: 2, aprovado: 1, dispensado: 0, nao_compareceu: 0 });
    expect(contagem.sub11).toEqual({ avaliacao: 0, aprovado: 0, dispensado: 1, nao_compareceu: 0 });
    expect(contagem.sub20).toEqual({ avaliacao: 0, aprovado: 0, dispensado: 0, nao_compareceu: 0 });
  });

  it("ignora quem não tem categoria preenchida e quem ainda está na fila de inscrição", () => {
    const contagem = contarPorCategoriaEStatus([
      { status: "avaliacao", categoria: null },
      { status: "inscricao", categoria: "sub15" },
      { status: "aprovado", categoria: "sub15" },
    ]);
    expect(contagem.sub15).toEqual({ avaliacao: 0, aprovado: 1, dispensado: 0, nao_compareceu: 0 });
  });

  it("lista vazia devolve tudo zerado nas 7 categorias", () => {
    const contagem = contarPorCategoriaEStatus([]);
    expect(Object.keys(contagem)).toHaveLength(7);
    expect(contagem.sub20).toEqual({ avaliacao: 0, aprovado: 0, dispensado: 0, nao_compareceu: 0 });
  });
});

describe("contarPorUf", () => {
  it("agrupa por UF e ignora quem não tem UF preenchida", () => {
    const contagem = contarPorUf([{ uf: "SP" }, { uf: "sp" }, { uf: "RJ" }, { uf: null }, { uf: "" }]);
    expect(contagem).toEqual({ SP: 2, RJ: 1 });
  });
});

describe("payloadMudancaStatusCaptacao", () => {
  it("carimba a data de término com hoje quando vira um resultado final sem data ainda", () => {
    expect(payloadMudancaStatusCaptacao("aprovado", null, "2026-08-19")).toEqual({
      status: "aprovado",
      data_termino: "2026-08-19",
    });
  });

  it("não sobrescreve uma data de término já existente", () => {
    expect(payloadMudancaStatusCaptacao("dispensado", "2026-08-01", "2026-08-19")).toEqual({
      status: "dispensado",
      data_termino: "2026-08-01",
    });
  });

  it("limpa a data de término ao voltar pra 'avaliacao' (reabrir)", () => {
    expect(payloadMudancaStatusCaptacao("avaliacao", "2026-08-01", "2026-08-19")).toEqual({
      status: "avaliacao",
      data_termino: null,
    });
  });

  it("carimba também pra 'nao_compareceu', mesma regra dos outros resultados finais", () => {
    expect(payloadMudancaStatusCaptacao("nao_compareceu", null, "2026-08-19")).toEqual({
      status: "nao_compareceu",
      data_termino: "2026-08-19",
    });
  });
});

describe("encontrarCandidatoParaCompletar", () => {
  const candidatos = [
    { id: "1", cpf: "52998224725", data_nascimento: "2012-05-10", status: "avaliacao" as const, numero: 10 },
    { id: "2", cpf: "111.444.777-35", data_nascimento: "2011-01-01", status: "avaliacao" as const, numero: 11 },
    { id: "3", cpf: "52998224725", data_nascimento: "2012-05-10", status: "aprovado" as const, numero: 5 },
  ];

  it("acha pelo CPF normalizado (ignora pontuação) quando a data de nascimento também bate", () => {
    expect(encontrarCandidatoParaCompletar(candidatos, "111.444.777-35", "2011-01-01")).toBe("2");
    expect(encontrarCandidatoParaCompletar(candidatos, "11144477735", "2011-01-01")).toBe("2");
  });

  it("não acha quando a data de nascimento não bate", () => {
    expect(encontrarCandidatoParaCompletar(candidatos, "52998224725", "2000-01-01")).toBeNull();
  });

  it("não acha quando o CPF não existe entre os candidatos", () => {
    expect(encontrarCandidatoParaCompletar(candidatos, "12345678909", "2012-05-10")).toBeNull();
  });

  it("ignora candidato já decidido (status diferente de 'avaliacao'), mesmo com CPF e data batendo", () => {
    // Só o "3" (aprovado) tem essa combinação exata isolada — remove o "1" da lista pra testar.
    const soDecidido = candidatos.filter((c) => c.id !== "1");
    expect(encontrarCandidatoParaCompletar(soDecidido, "52998224725", "2012-05-10")).toBeNull();
  });

  it("com mais de um candidato elegível batendo, fica com o de maior número (mais recente)", () => {
    const duplicados = [
      { id: "a", cpf: "52998224725", data_nascimento: "2012-05-10", status: "avaliacao" as const, numero: 3 },
      { id: "b", cpf: "52998224725", data_nascimento: "2012-05-10", status: "avaliacao" as const, numero: 7 },
    ];
    expect(encontrarCandidatoParaCompletar(duplicados, "52998224725", "2012-05-10")).toBe("b");
  });
});

describe("historicoPorCpf", () => {
  const candidatos = [
    { id: "1", cpf: "52998224725", numero: 10 },
    { id: "2", cpf: "529.982.247-25", numero: 20 },
    { id: "3", cpf: "11144477735", numero: 15 },
    { id: "4", cpf: null, numero: 30 },
  ];

  it("acha outros registros com o mesmo CPF normalizado, do mais recente pro mais antigo", () => {
    const historico = historicoPorCpf(candidatos, { id: "1", cpf: "52998224725" });
    expect(historico.map((c) => c.id)).toEqual(["2"]);
  });

  it("exclui o próprio registro da lista", () => {
    const historico = historicoPorCpf(candidatos, { id: "2", cpf: "529.982.247-25" });
    expect(historico.map((c) => c.id)).toEqual(["1"]);
  });

  it("lista vazia quando o candidato atual não tem CPF preenchido", () => {
    expect(historicoPorCpf(candidatos, { id: "4", cpf: null })).toEqual([]);
  });

  it("lista vazia quando ninguém mais tem esse CPF", () => {
    expect(historicoPorCpf(candidatos, { id: "3", cpf: "11144477735" })).toEqual([]);
  });
});

describe("taxaAprovacao", () => {
  it("ignora quem ainda está em avaliação", () => {
    const taxa = taxaAprovacao({ avaliacao: 10, aprovado: 3, dispensado: 1, nao_compareceu: 0 });
    expect(taxa).toBe(75); // 3 de 4 decididos
  });

  it("devolve null quando ninguém foi decidido ainda (evita divisão por zero)", () => {
    expect(taxaAprovacao({ avaliacao: 5, aprovado: 0, dispensado: 0, nao_compareceu: 0 })).toBeNull();
  });
});
