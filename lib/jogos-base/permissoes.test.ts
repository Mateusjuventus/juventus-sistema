import { describe, expect, it } from "vitest";
import { resolverCategoriasConvocacao } from "./permissoes";
import { TODAS_CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import type { PerfilPermissoes } from "@/lib/auth/role";

function perfil(overrides: Partial<PerfilPermissoes>): PerfilPermissoes {
  return {
    role: "regular",
    modulos_permitidos: null,
    modulos_base_permitidos: null,
    departamentos_permitidos: null,
    tarefas_categorias_visiveis: null,
    estoque_categorias_permitidas: null,
    categorias_treinador: null,
    ...overrides,
  };
}

describe("resolverCategoriasConvocacao", () => {
  it("sem perfil (não logado), não devolve nenhuma categoria", () => {
    expect(resolverCategoriasConvocacao(null)).toEqual([]);
  });

  it("treinador só enxerga a(s) categoria(s) vinculadas a ele", () => {
    const p = perfil({ role: "treinador", categorias_treinador: ["sub15", "sub17"] });
    expect(resolverCategoriasConvocacao(p)).toEqual(["sub15", "sub17"]);
  });

  it("treinador sem nenhuma categoria vinculada não enxerga nada", () => {
    const p = perfil({ role: "treinador", categorias_treinador: [] });
    expect(resolverCategoriasConvocacao(p)).toEqual([]);
  });

  it("treinador com categorias_treinador nulo não enxerga nada (não trava em erro)", () => {
    const p = perfil({ role: "treinador", categorias_treinador: null });
    expect(resolverCategoriasConvocacao(p)).toEqual([]);
  });

  it("master sempre enxerga as 7 categorias, mesmo sem futebol_base ou módulo liberado", () => {
    const p = perfil({ role: "master", departamentos_permitidos: [], modulos_base_permitidos: [] });
    expect(resolverCategoriasConvocacao(p)).toEqual(TODAS_CATEGORIAS_BASE);
  });

  it("regular sem o departamento Futebol de Base não enxerga nada", () => {
    const p = perfil({ role: "regular", departamentos_permitidos: ["futebol_profissional"] });
    expect(resolverCategoriasConvocacao(p)).toEqual([]);
  });

  it("regular com Futebol de Base mas sem o módulo Jogos liberado não enxerga nada", () => {
    const p = perfil({
      role: "regular",
      departamentos_permitidos: ["futebol_base"],
      modulos_base_permitidos: ["atletas", "financeiro"],
    });
    expect(resolverCategoriasConvocacao(p)).toEqual([]);
  });

  it("regular com Futebol de Base e o módulo Jogos liberado enxerga as 7 categorias", () => {
    const p = perfil({
      role: "regular",
      departamentos_permitidos: ["futebol_base"],
      modulos_base_permitidos: ["atletas", "jogos"],
    });
    expect(resolverCategoriasConvocacao(p)).toEqual(TODAS_CATEGORIAS_BASE);
  });

  it("regular com departamentos_permitidos nulo (grandfathered = todos) e módulo liberado enxerga as 7", () => {
    const p = perfil({ role: "regular", departamentos_permitidos: null, modulos_base_permitidos: ["jogos"] });
    expect(resolverCategoriasConvocacao(p)).toEqual(TODAS_CATEGORIAS_BASE);
  });
});
