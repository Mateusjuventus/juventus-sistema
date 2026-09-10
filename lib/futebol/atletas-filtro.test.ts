import { describe, expect, it } from "vitest";
import {
  atletaPassaFiltro,
  camposOcultosDaQueryString,
  filtrosDaQueryString,
  filtrosParaQueryString,
  mostrarInativosDaQueryString,
  nenhumFiltroAtivo,
  type AtletaFiltravel,
  type FiltrosAtletas,
} from "./atletas-filtro";

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

  it("filtra por posição real (valor exato de AtletaPosicao, não mais grupo)", () => {
    const filtros = { ...filtrosVazios(), posicoes: new Set<string>(["Goleiro"]) };
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
      posicoes: new Set(["Goleiro"]),
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
      posicoes: new Set(["Goleiro"]),
      contratos: new Set(["definitivo", "amador"]),
      buscaNormalizada: "rafael",
    };
    const query = filtrosParaQueryString(filtros);
    expect(query).toBe("status=liberado%2Csuspenso&posicao=Goleiro&contrato=definitivo%2Camador&q=rafael");
  });

  it("acrescenta inativos=1 quando mostrarInativos está ligado", () => {
    expect(filtrosParaQueryString(filtrosVazios(), { mostrarInativos: true })).toBe("inativos=1");
    expect(filtrosParaQueryString(filtrosVazios(), { mostrarInativos: false })).toBe("");
  });

  it("é reversível: reconstrói os mesmos conjuntos a partir da query string gerada", () => {
    const original: FiltrosAtletas = {
      status: new Set(["liberado"]),
      posicoes: new Set(["Goleiro", "Zagueiro"]),
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

describe("mostrarInativosDaQueryString", () => {
  it("true só quando inativos=1 exatamente", () => {
    expect(mostrarInativosDaQueryString(new URLSearchParams("inativos=1"))).toBe(true);
    expect(mostrarInativosDaQueryString(new URLSearchParams(""))).toBe(false);
    expect(mostrarInativosDaQueryString(new URLSearchParams("inativos=true"))).toBe(false);
  });
});

describe("checkbox \"Mostrar no card\" (camposOcultos)", () => {
  it("filtrosParaQueryString acrescenta camposOcultos só quando o conjunto não está vazio", () => {
    expect(filtrosParaQueryString(filtrosVazios(), { camposOcultos: new Set() })).toBe("");
    expect(filtrosParaQueryString(filtrosVazios(), { camposOcultos: new Set(["cpf"]) })).toBe("camposOcultos=cpf");
    expect(filtrosParaQueryString(filtrosVazios(), { camposOcultos: new Set(["cpf", "contrato"]) })).toBe(
      "camposOcultos=cpf%2Ccontrato",
    );
  });

  it("camposOcultosDaQueryString lê de volta só os valores válidos (cpf/contrato)", () => {
    expect(camposOcultosDaQueryString(new URLSearchParams("camposOcultos=cpf,contrato"))).toEqual(
      new Set(["cpf", "contrato"]),
    );
    expect(camposOcultosDaQueryString(new URLSearchParams("camposOcultos=cpf"))).toEqual(new Set(["cpf"]));
    expect(camposOcultosDaQueryString(new URLSearchParams(""))).toEqual(new Set());
    // Lixo na query string não vira campo válido nenhum, só é ignorado.
    expect(camposOcultosDaQueryString(new URLSearchParams("camposOcultos=cpf,lixo"))).toEqual(new Set(["cpf"]));
  });
});
