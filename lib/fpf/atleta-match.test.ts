import { describe, expect, it } from "vitest";
import { normalizarNome, similaridadeNomes, sugerirAtleta, type AtletaParaMatch } from "./atleta-match";

const ELENCO: AtletaParaMatch[] = [
  { id: "1", nome_completo: "Matheus Garcia da Silva", numero_fpf: 661240 },
  { id: "2", nome_completo: "Gabriel Azevedo de Sousa", numero_fpf: null },
  { id: "3", nome_completo: "João Pedro Oliveira", numero_fpf: 999999 },
];

describe("normalizarNome", () => {
  it("remove acentos, pontuação e normaliza espaços", () => {
    expect(normalizarNome("João  Pédro-Oliveira")).toBe("joao pedrooliveira");
  });
});

describe("similaridadeNomes", () => {
  it("dá pontuação alta pra nomes com quase todas as palavras iguais", () => {
    expect(similaridadeNomes("Gabriel Azevedo Sousa", "Gabriel Azevedo de Sousa")).toBeGreaterThan(0.5);
  });

  it("dá pontuação baixa pra nomes bem diferentes", () => {
    expect(similaridadeNomes("Matheus Garcia da Silva", "Carlos Eduardo Santos")).toBeLessThan(0.2);
  });
});

describe("sugerirAtleta", () => {
  it("prioriza número de registro FPF exato sobre nome", () => {
    const sugestao = sugerirAtleta("Matheus G. Silva", 661240, ELENCO);
    expect(sugestao.atletaId).toBe("1");
    expect(sugestao.confianca).toBe("numero_fpf");
  });

  it("usa nome exato quando não há número batendo", () => {
    const sugestao = sugerirAtleta("João Pedro Oliveira", null, ELENCO);
    expect(sugestao.atletaId).toBe("3");
    expect(sugestao.confianca).toBe("nome_exato");
  });

  it("usa nome aproximado quando o nome é parecido mas não idêntico", () => {
    const sugestao = sugerirAtleta("Gabriel Azevedo Sousa", null, ELENCO);
    expect(sugestao.atletaId).toBe("2");
    expect(sugestao.confianca).toBe("nome_aproximado");
  });

  it("não sugere nada quando o jogador não é do elenco (ex: time adversário)", () => {
    const sugestao = sugerirAtleta("Victor Gabriel Leite dos Santos", null, ELENCO);
    expect(sugestao.atletaId).toBeNull();
    expect(sugestao.confianca).toBe("nenhuma");
  });
});
