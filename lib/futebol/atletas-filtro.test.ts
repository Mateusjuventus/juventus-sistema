import { describe, expect, it } from "vitest";
import {
  atletaPassaFiltro,
  filtrosDaQueryString,
  filtrosParaQueryString,
  nenhumFiltroAtivo,
  type AtletaFiltravel,
  type FiltrosAtletas,
} from "./atletas-filtro";
import type { CategoriaPosicao } from "@/lib/supabase/types";

function filtrosVazios(): FiltrosAtletas {
  return { status: new Set(), posicoes: new Set(), contratos: new Set(), buscaNormalizada: "" };
}

const RAFAEL: AtletaFiltravel = { status: "liberado", posicao: "Goleiro", tipoContrato: "definitivo", nome: "Rafael Torres" };
const BRUNO: AtletaFiltravel = { status: "suspenso", posicao: "Zagueiro", tipoContrato: "amador", nome: "Bruno Kaminski" };
const SEM_CONTRATO: AtletaFiltravel = { status: "liberado", posicao: "Meia", tipoContrato: null, nome: "Sem Contrato" };

describe("nenhumFiltroAtivo", () => {
  it("true quando os quatro filtros estão vazios", () => {
    expect(nenhumFiltroAtivo(filtrosVazios())).toBe(true);
  });

  it("false quando qualquer filtro tem algo", () => {
    expect(nenhumFiltroAtivo({ ...filtrosVazios(), buscaNormalizada: "rafael" })).toBe(false);
    expect(nenhumFiltroAtivo({ ...filtrosVazios(), status: new Set(["liberado"]) })).toBe(false);
  });
});

describe("atletaPassaFiltro", () => {
  it("todos os filtros vazios mostra tudo", () => {
    const filtros = filtrosVazios();
    expect(atletaPassaFiltro(RAFAEL, filtros)).toBe(true);
    expect(atletaPassaFiltro(BRUNO, filtros)).toBe(true);
  });

  it("filtra por status", () => {
    const filtros = { ...filtrosVazios(), status: new Set(["suspenso"]) };
    expect(atletaPassaFiltro(RAFAEL, filtros)).toBe(false);
    expect(atletaPassaFiltro(BRUNO, filtros)).toBe(true);
  });

  it("filtra por grupo de posição (Goleiro -> categoria 'goleiro')", () => {
    const filtros = { ...filtrosVazios(), posicoes: new Set<CategoriaPosicao>(["goleiro"]) };
    expect(atletaPassaFiltro(RAFAEL, filtros)).toBe(true);
    expect(atletaPassaFiltro(BRUNO, filtros)).toBe(false);
  });

  it("filtra por tipo de contrato, e exclui quem não tem contrato cadastrado", () => {
    const filtros = { ...filtrosVazios(), contratos: new Set(["amador"]) };
    expect(atletaPassaFiltro(BRUNO, filtros)).toBe(true);
    expect(atletaPassaFiltro(RAFAEL, filtros)).toBe(false);
    expect(atletaPassaFiltro(SEM_CONTRATO, filtros)).toBe(false);
  });

  it("filtra por busca de nome, sem diferenciar maiúsculas", () => {
    const filtros = { ...filtrosVazios(), buscaNormalizada: "kaminski" };
    expect(atletaPassaFiltro(BRUNO, filtros)).toBe(true);
    expect(atletaPassaFiltro(RAFAEL, filtros)).toBe(false);
  });

  it("combina os quatro filtros com E lógico entre blocos", () => {
    const filtros: FiltrosAtletas = {
      status: new Set(["liberado"]),
      posicoes: new Set(["goleiro"]),
      contratos: new Set(["definitivo"]),
      buscaNormalizada: "rafael",
    };
    expect(atletaPassaFiltro(RAFAEL, filtros)).toBe(true);
    // Bruno bate com nenhum dos quatro filtros.
    expect(atletaPassaFiltro(BRUNO, filtros)).toBe(false);
  });

  it("OU dentro do mesmo bloco: dois status marcados aceita qualquer um dos dois", () => {
    const filtros = { ...filtrosVazios(), status: new Set(["liberado", "suspenso"]) };
    expect(atletaPassaFiltro(RAFAEL, filtros)).toBe(true);
    expect(atletaPassaFiltro(BRUNO, filtros)).toBe(true);
  });
});

describe("atletaPassaFiltro com statusOcultoPorPadrao (regra do Dispensado na Base)", () => {
  const DISPENSADO: AtletaFiltravel = { status: "dispensado", posicao: "Atacante", tipoContrato: "amador", nome: "Cauã Ribamar" };

  it("some da lista quando nenhum status está marcado", () => {
    const filtros = filtrosVazios();
    expect(atletaPassaFiltro(DISPENSADO, filtros, "dispensado")).toBe(false);
    expect(atletaPassaFiltro(RAFAEL, filtros, "dispensado")).toBe(true);
  });

  it("aparece quando a pessoa marca o chip \"Dispensado\" explicitamente", () => {
    const filtros = { ...filtrosVazios(), status: new Set(["dispensado"]) };
    expect(atletaPassaFiltro(DISPENSADO, filtros, "dispensado")).toBe(true);
    // Marcar só "Dispensado" não deveria trazer quem está com outro status.
    expect(atletaPassaFiltro(RAFAEL, filtros, "dispensado")).toBe(false);
  });

  it("sem statusOcultoPorPadrao (Profissional), nenhum status marcado mostra todo mundo", () => {
    const filtros = filtrosVazios();
    expect(atletaPassaFiltro(DISPENSADO, filtros)).toBe(true);
  });
});

describe("filtrosParaQueryString / filtrosDaQueryString (link de Exportar para Excel)", () => {
  it("filtros vazios viram string vazia", () => {
    expect(filtrosParaQueryString(filtrosVazios())).toBe("");
  });

  it("serializa cada bloco combinado no formato esperado pela rota de export", () => {
    const filtros: FiltrosAtletas = {
      status: new Set(["liberado", "suspenso"]),
      posicoes: new Set<CategoriaPosicao>(["goleiro"]),
      contratos: new Set(["definitivo", "amador"]),
      buscaNormalizada: "rafael",
    };
    const query = filtrosParaQueryString(filtros);
    expect(query).toBe("status=liberado%2Csuspenso&posicao=goleiro&contrato=definitivo%2Camador&q=rafael");
  });

  it("é reversível: reconstrói os mesmos conjuntos a partir da query string gerada", () => {
    const original: FiltrosAtletas = {
      status: new Set(["liberado"]),
      posicoes: new Set<CategoriaPosicao>(["goleiro", "zagueiro"]),
      contratos: new Set(["amador"]),
      buscaNormalizada: "kaminski",
    };
    const reconstruido = filtrosDaQueryString(new URLSearchParams(filtrosParaQueryString(original)));
    expect(reconstruido).toEqual(original);
  });

  it("query string sem nenhum parâmetro reconstrói filtros vazios", () => {
    expect(filtrosDaQueryString(new URLSearchParams(""))).toEqual(filtrosVazios());
  });
});
