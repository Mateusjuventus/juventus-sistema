import { describe, expect, it } from "vitest";
import {
  GRUPOS_CAMPO_EXPORT_ATLETA,
  filtrarLinhaPorGrupos,
  gruposCampoExportDaQueryString,
  gruposCampoExportParaQueryString,
  todosGruposCampoExport,
} from "./export-colunas";

describe("todosGruposCampoExport", () => {
  it("inclui todos os 4 blocos", () => {
    expect(todosGruposCampoExport().size).toBe(GRUPOS_CAMPO_EXPORT_ATLETA.length);
  });
});

describe("gruposCampoExportParaQueryString", () => {
  it("todos os blocos marcados vira string vazia (link igual ao de sempre)", () => {
    expect(gruposCampoExportParaQueryString(todosGruposCampoExport())).toBe("");
  });

  it("alguns blocos desmarcados serializa só os marcados", () => {
    expect(gruposCampoExportParaQueryString(new Set(["contato", "esportivos"]))).toBe(
      "campos=contato,esportivos",
    );
  });

  it("nenhum bloco marcado ainda serializa (só Nome/CPF/Status na planilha)", () => {
    expect(gruposCampoExportParaQueryString(new Set())).toBe("campos=");
  });
});

describe("gruposCampoExportDaQueryString", () => {
  it("sem o parâmetro 'campos', assume todos os blocos (exportação completa de sempre)", () => {
    expect(gruposCampoExportDaQueryString(new URLSearchParams(""))).toEqual(todosGruposCampoExport());
  });

  it("reconstrói só os blocos marcados", () => {
    expect(gruposCampoExportDaQueryString(new URLSearchParams("campos=contato,esportivos"))).toEqual(
      new Set(["contato", "esportivos"]),
    );
  });

  it("é reversível com gruposCampoExportParaQueryString", () => {
    const original = new Set(["contrato", "documentos"]);
    const reconstruido = gruposCampoExportDaQueryString(
      new URLSearchParams(gruposCampoExportParaQueryString(original)),
    );
    expect(reconstruido).toEqual(original);
  });
});

describe("filtrarLinhaPorGrupos", () => {
  const linha = { Nome: "Rafael", CPF: "123", Status: "Apto", Telefone: "999", RG: "abc" };
  const camposSempre = ["Nome", "CPF", "Status"] as const;
  const campoParaGrupo: Record<string, string> = { Telefone: "contato", RG: "documentos" };

  it("mantém sempre os campos obrigatórios, mesmo com nenhum grupo marcado", () => {
    const filtrada = filtrarLinhaPorGrupos(linha, camposSempre, campoParaGrupo, new Set());
    expect(filtrada).toEqual({ Nome: "Rafael", CPF: "123", Status: "Apto" });
  });

  it("inclui campos do grupo marcado, exclui os demais", () => {
    const filtrada = filtrarLinhaPorGrupos(linha, camposSempre, campoParaGrupo, new Set(["contato"]));
    expect(filtrada).toEqual({ Nome: "Rafael", CPF: "123", Status: "Apto", Telefone: "999" });
  });

  it("com todos os grupos marcados, mantém a linha inteira", () => {
    const filtrada = filtrarLinhaPorGrupos(linha, camposSempre, campoParaGrupo, new Set(["contato", "documentos"]));
    expect(filtrada).toEqual(linha);
  });

  it("campo sem grupo mapeado sempre entra (rede de segurança)", () => {
    const linhaComCampoNovo = { ...linha, CampoNovo: "x" };
    const filtrada = filtrarLinhaPorGrupos(linhaComCampoNovo, camposSempre, campoParaGrupo, new Set());
    expect(filtrada.CampoNovo).toBe("x");
  });
});
