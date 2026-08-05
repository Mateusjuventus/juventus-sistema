import { describe, expect, it } from "vitest";
import { converterMinutoPdfParaRelativo, parsearSumulaPdf } from "./sumula-pdf";

// Texto montado a partir de trechos confirmados de súmulas reais publicadas em
// conteudo.fpf.org.br (ver docs/superpowers/specs/2026-08-04-integracao-fpf-design.md) — não é
// bit-a-bit idêntico ao que `unpdf` vai extrair na produção (não conseguimos capturar isso num
// ambiente sem acesso de rede a esse domínio), mas segue os mesmos rótulos e formato de linha
// confirmados. O parser é tolerante a variação de espaçamento por isso.
const TEXTO_EXEMPLO = `
Campeonato: Copa São Paulo - Júnior / 2026
Rodada: 04
Data: 13/01/2026
Estádio: Estádio Mun. Orlando Batista Novelli / Barueri

Relação de Jogadores
1 Giovanni Martinez Montanari T A 661239/26
8 Matheus Garcia da Silva T A 661240/26
13 Gabriel Azevedo Sousa R A 661248/26

Gols
Palmeiras 11 Victor Gabriel Leite dos Santos - (Victor) NR 05:00 1T
Corinthians 9 Pedro Henrique Costa Freitas - (Pedro) NR 32:00 1T
Juventus SAF 1 Giovanni Martinez Montanari - (Giovanni) NR +2 2T

Substituições
Juventus SAF 8 Matheus Garcia da Silva 13 Gabriel Azevedo Sousa 31:00 1T

Advertências
Palmeiras 23 Miguel Otavio dos Santos Rocha 50:00 2T
Vitória (BA) 15 Luis Guilherme de Oliveira Aucelio 16:00 1T

Expulsões
NÃO HOUVE EXPULSÕES

Término 1º Tempo: 19:50
Acréscimo: 3 min
Término 2º Tempo: 20:56
Acréscimo: 4 min

Resultado 2º Tempo: 3 X 3
`;

describe("parsearSumulaPdf", () => {
  const resultado = parsearSumulaPdf(TEXTO_EXEMPLO);

  it("extrai os campos de cabeçalho", () => {
    expect(resultado.competicao).toBe("Copa São Paulo - Júnior / 2026");
    expect(resultado.rodada).toBe("04");
    expect(resultado.data).toBe("13/01/2026");
    expect(resultado.estadio).toContain("Orlando Batista Novelli");
  });

  it("extrai o placar final", () => {
    expect(resultado.placarMandante).toBe(3);
    expect(resultado.placarVisitante).toBe(3);
  });

  it("extrai jogadores da relação com titular/reserva e registro", () => {
    expect(resultado.jogadores).toHaveLength(3);
    const giovanni = resultado.jogadores.find((j) => j.nome === "Giovanni Martinez Montanari");
    expect(giovanni?.numero).toBe(1);
    expect(giovanni?.titular).toBe(true);
    expect(giovanni?.registroFpfNumero).toBe(661239);

    const gabriel = resultado.jogadores.find((j) => j.nome === "Gabriel Azevedo Sousa");
    expect(gabriel?.titular).toBe(false);
  });

  it("extrai gols com equipe, tipo e minuto", () => {
    expect(resultado.gols).toHaveLength(3);
    const gol = resultado.gols[0];
    expect(gol.equipe).toBe("Palmeiras");
    expect(gol.numero).toBe(11);
    expect(gol.nome).toBe("Victor Gabriel Leite dos Santos");
    expect(gol.tipo).toBe("normal");
    expect(gol.minuto).toBe(5);
    expect(gol.tempo).toBe("primeiro");
  });

  it("extrai gol no acréscimo (notação '+N') somando ao tempo regulamentar (90)", () => {
    const golAcrescimo = resultado.gols.find((g) => g.equipe === "Juventus SAF");
    expect(golAcrescimo?.nome).toBe("Giovanni Martinez Montanari");
    expect(golAcrescimo?.minuto).toBe(92);
    expect(golAcrescimo?.tempo).toBe("segundo");
  });

  it("extrai os minutos de acréscimo de cada tempo", () => {
    expect(resultado.acrescimoPrimeiroTempo).toBe(3);
    expect(resultado.acrescimoSegundoTempo).toBe(4);
  });

  it("expõe as linhas de diagnóstico de tempo/acréscimo, pra debug quando o formato real variar", () => {
    expect(resultado.linhasDuracaoEncontradas.length).toBeGreaterThan(0);
    expect(resultado.linhasDuracaoEncontradas.some((l) => /Acr[ée]scimo/i.test(l))).toBe(true);
  });

  it("extrai substituições com quem saiu/entrou", () => {
    expect(resultado.substituicoes).toHaveLength(1);
    const sub = resultado.substituicoes[0];
    expect(sub.equipe).toBe("Juventus SAF");
    expect(sub.numeroSaiu).toBe(8);
    expect(sub.nomeSaiu).toBe("Matheus Garcia da Silva");
    expect(sub.numeroEntrou).toBe(13);
    expect(sub.nomeEntrou).toBe("Gabriel Azevedo Sousa");
    expect(sub.minuto).toBe(31);
  });

  it("extrai cartões amarelos, incluindo time com parênteses no nome", () => {
    expect(resultado.cartoes).toHaveLength(2);
    expect(resultado.cartoes.every((c) => c.cor === "amarelo")).toBe(true);
    const vitoria = resultado.cartoes.find((c) => c.equipe === "Vitória (BA)");
    expect(vitoria?.nome).toBe("Luis Guilherme de Oliveira Aucelio");
    expect(vitoria?.minuto).toBe(16);
  });

  it("não extrai cartão nenhum quando não houve expulsões", () => {
    expect(resultado.cartoes.some((c) => c.cor === "vermelho")).toBe(false);
  });
});

describe("parsearSumulaPdf — tolerância de formato do campo de acréscimo", () => {
  // Não temos o texto byte-a-byte confirmado de uma súmula real (ver nota no topo de
  // sumula-pdf.ts) — estes testes cobrem variações plausíveis de rótulo/unidade que a FPF pode
  // usar, pra o reconhecimento não depender de um único formato exato.

  it("reconhece 'Acréscimo' sem unidade depois do número", () => {
    const r = parsearSumulaPdf("Término 1º Tempo: 19:50\nAcréscimo: 3\n");
    expect(r.acrescimoPrimeiroTempo).toBe(3);
  });

  it("reconhece 'Acréscimos' no plural e sem dois pontos", () => {
    const r = parsearSumulaPdf("2º Tempo\nAcréscimos 4 min\n");
    expect(r.acrescimoSegundoTempo).toBe(4);
  });

  it("reconhece 'Acrésc.' abreviado", () => {
    const r = parsearSumulaPdf("1º Tempo\nAcrésc.: 2min\n");
    expect(r.acrescimoPrimeiroTempo).toBe(2);
  });

  it("reconhece o tempo e o acréscimo na MESMA linha, em qualquer ordem", () => {
    const r1 = parsearSumulaPdf("Acréscimo 2º Tempo: 5 min\n");
    expect(r1.acrescimoSegundoTempo).toBe(5);

    const r2 = parsearSumulaPdf("1º Tempo - Acréscimo: 6 min\n");
    expect(r2.acrescimoPrimeiroTempo).toBe(6);
  });
});

describe("converterMinutoPdfParaRelativo", () => {
  it("mantém o minuto do 1º tempo sem alterar", () => {
    expect(converterMinutoPdfParaRelativo(32, "primeiro", 45)).toBe(32);
  });

  it("converte o relógio corrido do 2º tempo (súmula) pro minuto relativo (nosso banco)", () => {
    // Exemplo real: súmula marca "79:00 2T" com 1º tempo de 45min -> 34º minuto do 2º tempo.
    expect(converterMinutoPdfParaRelativo(79, "segundo", 45)).toBe(34);
  });

  it("não deixa dar negativo se o minuto vier estranho", () => {
    expect(converterMinutoPdfParaRelativo(40, "segundo", 45)).toBe(0);
  });
});
