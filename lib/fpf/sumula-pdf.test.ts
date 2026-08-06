import { describe, expect, it } from "vitest";
import { converterMinutoPdfParaRelativo, parsearSumulaPdf } from "./sumula-pdf";

// Texto montado a partir de trechos confirmados de súmulas reais publicadas em
// conteudo.fpf.org.br (ver docs/superpowers/specs/2026-08-04-integracao-fpf-design.md). A seção de
// Término/Acréscimo/Resultado abaixo é TEXTO REAL, copiado byte-a-byte da caixinha de diagnóstico
// (`linhasDuracaoEncontradas`) mostrada num import de produção — confirmou que a FPF usa uma
// tabela de duas colunas (1º Tempo | 2º Tempo lado a lado) que o `unpdf` concatena numa linha só.
// O resto do texto (gols/cartões/substituições) segue os mesmos rótulos confirmados antes, mas sem
// essa mesma confirmação byte-a-byte — o parser continua tolerante a variação de espaçamento nessas
// partes por precaução.
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

1º Tempo 2º Tempo
Início 1º Tempo: 16:00 Atraso: Não Houve Início 2º Tempo: 17:04 Atraso: Não Houve
Término 1º Tempo: 16:49 Acrésc: 3 min Término 2º Tempo: 20:56 Acrésc: 4 min
Resultado do 1º Tempo: 0 X 0 Resultado do 2º Tempo: 3 X 3
Motivo de atraso no início e/ou reinício, e de acréscimos
Acréscimos devido a parada técnica, substituições e atendimento médico.
`;

describe("parsearSumulaPdf", () => {
  const resultado = parsearSumulaPdf(TEXTO_EXEMPLO);

  it("extrai os campos de cabeçalho", () => {
    expect(resultado.competicao).toBe("Copa São Paulo - Júnior / 2026");
    expect(resultado.rodada).toBe("04");
    expect(resultado.data).toBe("13/01/2026");
    expect(resultado.estadio).toContain("Orlando Batista Novelli");
  });

  it("extrai o placar final (do 2º tempo, cumulativo — não o parcial do intervalo)", () => {
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
    expect(resultado.linhasDuracaoEncontradas.some((l) => /Acr[ée]sc/i.test(l))).toBe(true);
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

  it("reconhece tempo e acréscimo na MESMA linha, tempo vindo antes (ordem confirmada em súmula real)", () => {
    const r = parsearSumulaPdf("1º Tempo - Acréscimo: 6 min\n");
    expect(r.acrescimoPrimeiroTempo).toBe(6);
  });

  it("não deixa o número do ordinal (\"2º\") virar valor de acréscimo por engano", () => {
    // Sem essa proteção, "Acréscimo 2º Tempo" (rótulo sem valor, direto antes do próximo tempo)
    // fazia o "2" do "2º" ser lido como se fosse o valor do acréscimo.
    const r = parsearSumulaPdf("Acréscimo 2º Tempo: 5 min\n");
    expect(r.acrescimoSegundoTempo).not.toBe(2);
  });
});

describe("parsearSumulaPdf — regressão: layout real de duas colunas mescladas numa linha", () => {
  // Texto EXATO (copiado byte-a-byte, via a caixinha de diagnóstico em produção) da súmula
  // Primavera SAF x Juventus SAF, Copa Paulista 2026, jogo nº 20 — o bug real reportado: só o
  // acréscimo do 1º tempo era lido, o do 2º tempo (e o placar final) ficavam de fora, porque as
  // duas colunas (1º Tempo | 2º Tempo) caem na mesma linha depois da extração do PDF.
  const TEXTO_REAL = `
1º Tempo 2º Tempo
Início 1º Tempo: 16:00 Atraso: Não Houve Início 2º Tempo: 17:04 Atraso: Não Houve
Término 1º Tempo: 16:49 Acrésc: 4 min Término 2º Tempo: 17:54 Acrésc: 5 min
Resultado do 1º Tempo: 0 X 0 Resultado do 2º Tempo: 0 X 1
Motivo de atraso no início e/ou reinício, e de acréscimos
Acréscimos devido a parada técnica, substituições e atendimento médico.
`;
  const resultado = parsearSumulaPdf(TEXTO_REAL);

  it("lê o acréscimo dos DOIS tempos, não só do primeiro", () => {
    expect(resultado.acrescimoPrimeiroTempo).toBe(4);
    expect(resultado.acrescimoSegundoTempo).toBe(5);
  });

  it("lê o placar final (do 2º tempo, que é o resultado cumulativo), não o parcial do intervalo", () => {
    expect(resultado.placarMandante).toBe(0);
    expect(resultado.placarVisitante).toBe(1);
  });

  it("não confunde 'acréscimos' sem número (texto solto) com um valor de acréscimo", () => {
    // A última linha do texto real ("Acréscimos devido a...") não tem número logo depois — não
    // pode fazer o parser pegar algum dígito de mais longe na frase por engano.
    expect(resultado.acrescimoPrimeiroTempo).toBe(4);
    expect(resultado.acrescimoSegundoTempo).toBe(5);
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
