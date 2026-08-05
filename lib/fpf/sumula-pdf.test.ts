import { describe, expect, it } from "vitest";
import { parsearSumulaPdf } from "./sumula-pdf";

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

Substituições
Juventus SAF 8 Matheus Garcia da Silva 13 Gabriel Azevedo Sousa 31:00 1T

Advertências
Palmeiras 23 Miguel Otavio dos Santos Rocha 50:00 2T
Vitória (BA) 15 Luis Guilherme de Oliveira Aucelio 16:00 1T

Expulsões
NÃO HOUVE EXPULSÕES

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
    expect(resultado.gols).toHaveLength(2);
    const gol = resultado.gols[0];
    expect(gol.equipe).toBe("Palmeiras");
    expect(gol.numero).toBe(11);
    expect(gol.nome).toBe("Victor Gabriel Leite dos Santos");
    expect(gol.tipo).toBe("normal");
    expect(gol.minuto).toBe(5);
    expect(gol.tempo).toBe("primeiro");
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
