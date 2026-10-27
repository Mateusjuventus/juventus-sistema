import { describe, expect, it } from "vitest";
import {
  resolverCamposSensiveisBloqueados,
  resolverCategoriasBasePermitidas,
  resolverEhSupervisorDaCategoriaBase,
} from "./role";
import { TODAS_CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import type { PerfilPermissoes } from "./role";

function perfil(overrides: Partial<PerfilPermissoes>): PerfilPermissoes {
  return {
    role: "regular",
    modulos_permitidos: null,
    modulos_base_permitidos: null,
    departamentos_permitidos: null,
    tarefas_categorias_visiveis: null,
    estoque_categorias_permitidas: null,
    categorias_treinador: null,
    comissao_tecnica_id: null,
    comissao_tecnica_base_id: null,
    categorias_base_permitidas: null,
    comissao_tecnica_base: null,
    fisioterapia_pode_editar: null,
    fisioterapia_pode_editar_base: null,
    campos_sensiveis_bloqueados: null,
    demandas_acompanhado: null,
    ...overrides,
  };
}

describe("resolverCategoriasBasePermitidas", () => {
  it("sem perfil (não logado), não devolve nenhuma categoria", () => {
    expect(resolverCategoriasBasePermitidas(null)).toEqual([]);
  });

  it("master sempre enxerga as 7 categorias, mesmo sem futebol_base liberado", () => {
    const p = perfil({ role: "master", departamentos_permitidos: [] });
    expect(resolverCategoriasBasePermitidas(p)).toEqual(TODAS_CATEGORIAS_BASE);
  });

  it("regular sem o departamento Futebol de Base não enxerga nada", () => {
    const p = perfil({ role: "regular", departamentos_permitidos: ["futebol_profissional"] });
    expect(resolverCategoriasBasePermitidas(p)).toEqual([]);
  });

  it("vinculado à Comissão Técnica da Base usa as categorias do registro vinculado, ao vivo", () => {
    const p = perfil({
      role: "regular",
      departamentos_permitidos: ["futebol_base"],
      comissao_tecnica_base_id: "ct-1",
      comissao_tecnica_base: { categorias: ["sub11", "sub12", "sub13", "sub14"], funcao: "Supervisor" },
      // Fallback manual preenchido com outra coisa — o vínculo tem prioridade e ignora isso.
      categorias_base_permitidas: ["sub20"],
    });
    expect(resolverCategoriasBasePermitidas(p)).toEqual(["sub11", "sub12", "sub13", "sub14"]);
  });

  it("sem vínculo, usa o fallback manual (categorias_base_permitidas)", () => {
    const p = perfil({
      role: "regular",
      departamentos_permitidos: ["futebol_base"],
      categorias_base_permitidas: ["sub15", "sub17", "sub20"],
    });
    expect(resolverCategoriasBasePermitidas(p)).toEqual(["sub15", "sub17", "sub20"]);
  });

  it("sem vínculo e sem fallback preenchido (null), enxerga as 7 — nunca 'vazio = tudo bloqueado'", () => {
    const p = perfil({
      role: "regular",
      departamentos_permitidos: ["futebol_base"],
      categorias_base_permitidas: null,
    });
    expect(resolverCategoriasBasePermitidas(p)).toEqual(TODAS_CATEGORIAS_BASE);
  });

  it("comissao_tecnica_base_id preenchido mas embed ausente (registro pode ter sido excluído) cai no fallback manual", () => {
    const p = perfil({
      role: "regular",
      departamentos_permitidos: ["futebol_base"],
      comissao_tecnica_base_id: "ct-orfao",
      comissao_tecnica_base: null,
      categorias_base_permitidas: ["sub11"],
    });
    expect(resolverCategoriasBasePermitidas(p)).toEqual(["sub11"]);
  });

  it("regular com departamentos_permitidos nulo (grandfathered = todos) e sem vínculo enxerga as 7", () => {
    const p = perfil({ role: "regular", departamentos_permitidos: null, categorias_base_permitidas: null });
    expect(resolverCategoriasBasePermitidas(p)).toEqual(TODAS_CATEGORIAS_BASE);
  });
});

describe("resolverCamposSensiveisBloqueados", () => {
  it("sem perfil (não logado), nada bloqueado", () => {
    expect(resolverCamposSensiveisBloqueados(null)).toEqual([]);
  });

  it("master nunca tem nada bloqueado, mesmo com a coluna preenchida", () => {
    const p = perfil({ role: "master", campos_sensiveis_bloqueados: ["salario"] });
    expect(resolverCamposSensiveisBloqueados(p)).toEqual([]);
  });

  it("regular com salário bloqueado", () => {
    const p = perfil({ role: "regular", campos_sensiveis_bloqueados: ["salario"] });
    expect(resolverCamposSensiveisBloqueados(p)).toEqual(["salario"]);
  });

  it("regular sem nada bloqueado (coluna vazia ou nula) enxerga tudo", () => {
    expect(resolverCamposSensiveisBloqueados(perfil({ campos_sensiveis_bloqueados: [] }))).toEqual([]);
    expect(resolverCamposSensiveisBloqueados(perfil({ campos_sensiveis_bloqueados: null }))).toEqual([]);
  });
});

describe("resolverEhSupervisorDaCategoriaBase", () => {
  it("sem perfil (não logado), nunca pode assinar", () => {
    expect(resolverEhSupervisorDaCategoriaBase(null, "sub11")).toBe(false);
  });

  it("master sempre pode assinar, mesmo sem vínculo com a Comissão Técnica da Base", () => {
    const p = perfil({ role: "master", comissao_tecnica_base_id: null, comissao_tecnica_base: null });
    expect(resolverEhSupervisorDaCategoriaBase(p, "sub11")).toBe(true);
  });

  it("regular sem vínculo com a Comissão Técnica da Base nunca pode assinar", () => {
    const p = perfil({ role: "regular", comissao_tecnica_base_id: null, comissao_tecnica_base: null });
    expect(resolverEhSupervisorDaCategoriaBase(p, "sub11")).toBe(false);
  });

  it("vinculado, mas função não é Supervisor (ex.: Treinador) não pode assinar", () => {
    const p = perfil({
      role: "regular",
      comissao_tecnica_base_id: "ct-1",
      comissao_tecnica_base: { categorias: ["sub11", "sub12"], funcao: "Treinador" },
    });
    expect(resolverEhSupervisorDaCategoriaBase(p, "sub11")).toBe(false);
  });

  it("Supervisor vinculado, mas a categoria do jogo não está entre as dele não pode assinar", () => {
    const p = perfil({
      role: "regular",
      comissao_tecnica_base_id: "ct-2",
      comissao_tecnica_base: { categorias: ["sub15", "sub17", "sub20"], funcao: "Supervisor" },
    });
    expect(resolverEhSupervisorDaCategoriaBase(p, "sub11")).toBe(false);
  });

  it("Supervisor vinculado e a categoria do jogo está entre as dele pode assinar", () => {
    const p = perfil({
      role: "regular",
      comissao_tecnica_base_id: "ct-3",
      comissao_tecnica_base: { categorias: ["sub11", "sub12", "sub13", "sub14"], funcao: "Supervisor" },
    });
    expect(resolverEhSupervisorDaCategoriaBase(p, "sub12")).toBe(true);
  });

  it("comparação de função ignora maiúsculas/minúsculas e aceita rótulos mais longos", () => {
    const p = perfil({
      role: "regular",
      comissao_tecnica_base_id: "ct-4",
      comissao_tecnica_base: { categorias: ["sub20"], funcao: "SUPERVISOR de Futebol de Base" },
    });
    expect(resolverEhSupervisorDaCategoriaBase(p, "sub20")).toBe(true);
  });
});
